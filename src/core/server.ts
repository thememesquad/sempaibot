import { Channel, Guild, Snowflake } from "discord.js";
import { BotBase, DB, MessageID, PersonalityManager, RoleType, User, UserManager } from "./";
import { ConfigKeyValueModel } from "./model";

interface IServerConfig {
    channel: string;
    ignoreList: string[];
    modules: string[];
    osu_limit: number;
}

export class Server {
    public server: Guild;
    public loadPromise: Promise<boolean>;

    private _bot: BotBase;
    private _config: IServerConfig;
    private _configModel: ConfigKeyValueModel;
    private _id: Snowflake;
    private _loadPromiseResolve: (initial: boolean) => void;
    private _channelCheck: NodeJS.Timer;

    constructor(bot: BotBase, server: Guild) {
        this.server = server;

        this._bot = bot;
        this._config = null;
        this._configModel = null;
        this._id = server.id;

        for (const key of server.members.keyArray()) {
            const member = server.members.get(key);
            UserManager.instance.registerUser(member.id, member.displayName, this);
        }

        this._loadPromiseResolve = null;
        this.loadPromise = new Promise(async (resolve, reject) => {
            this._loadPromiseResolve = resolve;
            try {
                let doc: ConfigKeyValueModel = null;

                try {
                    doc = await DB.connection.manager.findOne(ConfigKeyValueModel, { key: this.server.id + "_config" });
                } catch (e) {
                    // empty
                }

                if (!doc) {
                    this._configModel = DB.connection.manager.create(ConfigKeyValueModel);
                    this._configModel.key = this.server.id + "_config";

                    this._config = {
                        channel: "",
                        ignoreList: [],
                        modules: [],
                        osu_limit: 50,
                    };

                    this._configModel.value = JSON.stringify(this._config);

                    try {
                        await DB.connection.manager.save(this._configModel);
                        return this.onLoad(true);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                }

                this._configModel = doc;
                this._config = JSON.parse(doc.value);
            } catch (err) {
                return reject(err);
            }

            let changed = false;
            if (this._config.osu_limit === undefined) {
                this._config.osu_limit = 50;
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
                if (changed) {
                    this._configModel.value = JSON.stringify(this._config);

                    await DB.connection.manager.save(this._configModel);
                }
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

        this._config.modules = this.modules;
        this._configModel.value = JSON.stringify(this._config);

        DB.connection.manager.save(this._configModel);
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

        this._config.modules = this.modules;
        this._configModel.value = JSON.stringify(this._config);

        DB.connection.manager.save(this._configModel);
    }

    public ignoreUser(user: User): void {
        if (this.ignoreList.indexOf(user._userID) === -1) {
            this._config.ignoreList.push(user._userID);
            this._configModel.value = JSON.stringify(this._config);

            DB.connection.manager.save(this._configModel);
        }
    }

    public unignoreUser(user: User): void {
        const idx = this.ignoreList.indexOf(user._userID);
        if (idx !== -1) {
            this._config.ignoreList.splice(idx, 1);
            this._configModel.value = JSON.stringify(this._config);

            DB.connection.manager.save(this._configModel);
        }
    }

    public isUserIgnored(user: User): boolean {
        return this.ignoreList.indexOf(user._userID) !== -1;
    }

    public async saveConfig(): Promise<void> {
        await DB.connection.manager.save(this._configModel);
    }

    set channel(channel: string) {
        this._config.channel = channel;
        this._configModel.value = JSON.stringify(this._config);

        DB.connection.manager.save(this._configModel);
    }

    get channel(): string {
        return this._config.channel;
    }

    get modules(): string[] {
        return this._config.modules;
    }

    get ignoreList(): string[] {
        return this._config.ignoreList;
    }

    get osuLimit(): number {
        return this._config.osu_limit;
    }

    get id(): Snowflake {
        return this._id;
    }
}
