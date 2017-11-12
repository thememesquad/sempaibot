import { Channel, Guild, Snowflake } from "discord.js";
import { BotBase, DB, MessageID, PersonalityManager, RoleType, User, UserManager } from "./";
import { ConfigKeyValueModel } from "./model";

export class Server {
    public server: Guild;
    public loadPromise: Promise<boolean>;

    private _bot: BotBase;
    private _config: ConfigKeyValueModel;
    private _id: Snowflake;
    private _loadPromiseResolve: (initial: boolean) => void;
    private _channelCheck: NodeJS.Timer;

    constructor(bot: BotBase, server: Guild) {
        this.server = server;

        this._bot = bot;
        this._config = null;
        this._id = server.id;

        for (const key of server.members.keyArray()) {
            const member = server.members.get(key);
            UserManager.instance.registerUser(member.id, member.displayName, this);
        }

        this._loadPromiseResolve = null;
        this.loadPromise = new Promise(async (resolve, reject) => {
            this._loadPromiseResolve = resolve;
            try {
                const doc = await DB.connection.manager.findOne(ConfigKeyValueModel, { key: this.server.id + "_config" });
                if (!doc) {
                    this._config = new ConfigKeyValueModel();
                    this._config.key = this.server.id + "_config";
                    this._config.value = {
                        channel: "",
                        ignoreList: [],
                        modules: [],
                        osu_limit: 50,
                    };

                    try {
                        await DB.connection.manager.save(this._config);
                        return this.onLoad(true);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                }

                this._config = doc;
            } catch (err) {
                return reject(err);
            }

            let changed = false;
            if (this._config.value.osu_limit === undefined) {
                this._config.value.osu_limit = 50;
                changed = true;
            }

            for (const moduleid of this.modules) {
                const module = this._bot.getModule(moduleid);
                if (module === null)
                    continue;

                if (module.disabled)
                    continue;

                module.onLoad(this);
            }

            try {
                if (changed)
                    await DB.connection.manager.save(this._config);
            } catch (err) {
                return reject(err);
            }

            this.onLoad(false);
        });
    }

    public onLoad(initial: boolean): void {
        this._channelCheck = setInterval(() => {
            if (this.channel.length !== 0) {
                if (this.server.channels.get(this.channel) === null) {
                    this.channel = "";
                    this._bot.message(PersonalityManager.instance.get(MessageID.SempaiHomeChannelDeleted), this);
                }
            }
        }, 100);

        if (this.channel.length !== 0) {
            if (this.server.channels.get(this.channel) === null) {
                this._bot.message(PersonalityManager.instance.get(MessageID.SempaiHomeChannelDeleted), this);
                this.channel = "";
            }
        } else {
            this._bot.message(PersonalityManager.instance.get(MessageID.SempaiSettingUp), this);
        }

        if (this.server.owner !== undefined)
            UserManager.instance.assignRole(this.server.owner.id, this, RoleType.Admin);

        this._loadPromiseResolve(initial);
    }

    public enableModule(name: string): void {
        if (this.modules.indexOf(name) !== -1)
            return; // already enabled

        const module = this._bot.getModule(name);
        if (module === null)
            return; // no such module

        if (module.disabled)
            return;

        this.modules.push(name.toLowerCase());
        module.onLoad(this);

        this._config.value.modules = this.modules;
        DB.connection.manager.save(this._config);
    }

    public isModuleEnabled(name: string): boolean {
        return this.modules.indexOf(name.toLowerCase()) !== -1;
    }

    public disableModule(name: string): void {
        if (this.modules.indexOf(name) === -1)
            return; // already enabled

        const module = this._bot.getModule(name);
        if (module === null)
            return; // no such module

        if (module.disabled)
            return;

        this.modules.splice(this.modules.indexOf(name.toLowerCase()), 1);
        module.onUnload(this);

        this._config.value.modules = this.modules;
        DB.connection.manager.save(this._config);
    }

    public ignoreUser(user: User): void {
        if (this.ignoreList.indexOf(user._userID) === -1) {
            this._config.value.ignoreList.push(user._userID);
            DB.connection.manager.save(this._config);
        }
    }

    public unignoreUser(user: User): void {
        const idx = this.ignoreList.indexOf(user._userID);
        if (idx !== -1) {
            this._config.value.ignoreList.splice(idx, 1);
            DB.connection.manager.save(this._config);
        }
    }

    public isUserIgnored(user: User): boolean {
        return this.ignoreList.indexOf(user._userID) !== -1;
    }

    public async saveConfig(): Promise<void> {
        await DB.connection.manager.save(this._config);
    }

    set channel(channel: string) {
        this._config.value.channel = channel;
        DB.connection.manager.save(this._config);
    }

    get channel(): string {
        return this._config.value.channel;
    }

    get modules(): string[] {
        return this._config.value.modules;
    }

    get ignoreList(): string[] {
        return this._config.value.ignoreList;
    }

    get id(): Snowflake {
        return this._id;
    }

    get config(): ConfigKeyValueModel {
        return this._config;
    }
}
