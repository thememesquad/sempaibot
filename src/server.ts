import { BotBase } from "./botbase";
import { Responses } from "./responses";
import { Users, User } from "./users";
import { Channel, Guild, Snowflake } from "discord.js";

import { DB } from "./db";
import { ConfigKeyValueModel } from "./model/configkeyvalue";

export class Server {
    private _bot: BotBase;
    private _config: ConfigKeyValueModel;
    private _id: Snowflake;
    public _server: Guild;

    loadPromiseResolve: (initial: boolean) => void;
    loadPromise: Promise<boolean>;
    channelCheck: NodeJS.Timer;

    constructor(bot: BotBase, server: Guild) {
        this._bot = bot;
        this._config = null;
        this._server = server;
        this._id = server.id;

        for (let key of server.members.keyArray()) {
            let member = server.members.get(key);
            Users.registerUser(member.id, member.displayName, this);
        }

        this.loadPromiseResolve = null;
        this.loadPromise = new Promise(async (resolve, reject) => {
            this.loadPromiseResolve = resolve;

            let doc = await DB.connection.manager.findOne(ConfigKeyValueModel, { key: this._server.id + "_config" });
            if (!doc) {
                this._config = new ConfigKeyValueModel();
                this._config.key = this._server.id + "_config";
                this._config.value = {
                    channel: "",
                    modules: [],
                    ignoreList: [],
                    osu_limit: 50
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

            let changed = false;
            if (this._config.value.osu_limit === undefined) {
                this._config.value.osu_limit = 50;
                changed = true;
            }

            for (let i = 0; i < this.modules.length; i++) {
                let module = this._bot.getModule(this.modules[i]);
                if (module === null)
                    continue;

                if (module.disabled)
                    continue;

                module.onLoad(this);
            }

            if (changed)
                await DB.connection.manager.save(this._config);

            this.onLoad(false);
        });
    }

    onLoad(initial: boolean): void {
        this.channelCheck = setInterval(() => {
            if (this.channel.length !== 0) {
                if (this._server.channels.get(this.channel) === null) {
                    this.channel = "";
                    this._bot.message(Responses.get("CHANNEL_DELETED"), this);
                }
            }
        }, 100);

        if (this.channel.length !== 0) {
            if (this._server.channels.get(this.channel) === null) {
                this._bot.message(Responses.get("CHANNEL_DELETED"), this);
                this.channel = "";
            }
        } else {
            Users.assignRole(this._server.owner.id, this, "admin");
            this._bot.message(Responses.get("SETTING_UP"), this);
        }

        this.loadPromiseResolve(initial);
    }

    enableModule(name: string): void {
        if (this.modules.indexOf(name) !== -1)
            return; //already enabled

        let module = this._bot.getModule(name);
        if (module === null)
            return; //no such module

        if (module.disabled)
            return;

        this.modules.push(name.toLowerCase());
        module.onLoad(this);

        this._config.value.modules = this.modules;
        DB.connection.manager.save(this._config);
    }

    isModuleEnabled(name: string): boolean {
        return this.modules.indexOf(name.toLowerCase()) !== -1;
    }

    disableModule(name: string): void {
        if (this.modules.indexOf(name) === -1)
            return; //already enabled

        let module = this._bot.getModule(name);
        if (module === null)
            return; //no such module

        if (module.disabled)
            return;

        this.modules.splice(this.modules.indexOf(name.toLowerCase()), 1);
        module.onUnload(this);

        this._config.value.modules = this.modules;
        DB.connection.manager.save(this._config);
    }

    ignoreUser(user: User): void {
        if (this.ignoreList.indexOf(user._userID) === -1) {
            this._config.value.ignoreList.push(user._userID);
            DB.connection.manager.save(this._config);
        }
    }

    unignoreUser(user: User): void {
        let idx = this.ignoreList.indexOf(user._userID);
        if (idx !== -1) {
            this._config.value.ignoreList.splice(idx, 1);
            DB.connection.manager.save(this._config);
        }
    }

    isUserIgnored(user: User): boolean {
        return this.ignoreList.indexOf(user._userID) !== -1;
    }

    set channel(channel: string) {
        this._config.value.channel = channel;
        DB.connection.manager.save(this._config);
    }

    get channel(): string {
        return this._config.value.channel;
    }

    get modules(): Array<string> {
        return this._config.value.modules;
    }

    get ignoreList(): Array<string> {
        return this._config.value.ignoreList;
    }

    get id(): Snowflake {
        return this._id;
    }
}
