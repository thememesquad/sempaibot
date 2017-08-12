import { BotBase } from "./botbase";
import { Responses } from "./responses";
import { Users } from "./users";
import { Channel, Guild } from "discord.js";

export class Server {
    private _bot: BotBase;
    private _config: string;
    private _id: string;
    private _modules: Array<string>;
    public _server: Guild;

    loadPromiseResolve: (initial: boolean) => void;
    loadPromise: Promise<boolean>;
    channelCheck: NodeJS.Timer;

    constructor(bot: BotBase, server: Guild) {
        this._bot = bot;
        this._config = null;
        this._server = server;
        this._id = server.id;
        this._modules = [];

        for (let key of server.members.keyArray()) {
            let member = server.members.get(key);
            Users.registerUser(member.id, member.displayName, this);
        }

        this.loadPromiseResolve = null;
        this.loadPromise = new Promise((resolve, reject) => {
            this.loadPromiseResolve = resolve;
            this.onLoad(true);

            //todo: implement this
            /*db.ConfigKeyValue.findOne({ key: this.server.id + "_config" }).then(doc => {
                if (doc === null) {
                    this.config = db.ConfigKeyValue.create({
                        key: this.server.id + "_config",
                        value: {
                            channel: "",
                            modules: [],
                            ignorelist: [],
                            osu_limit: 50
                        }
                    });

                    this.config.save().then(() => this.on_load(true)).catch(err => {
                        console.log("save: ", err);
                        this.on_load(true);
                    });
                }
                else {
                    this.config = doc;

                    let changed = false;
                    if (this.config.value.osu_limit === undefined) {
                        this.config.value.osu_limit = 50;
                        changed = true;
                    }

                    for (let i = 0; i < this.modules.length; i++) {
                        let module = this.bot.get_module(this.modules[i]);
                        if (module === null)
                            continue;

                        if (module.disabled)
                            continue;

                        module.on_load(this);
                    }

                    if (changed) {
                        this.config.save().then(() => this.on_load(false)).catch(err => {
                            console.log("save: ", err);
                            this.on_load(false);
                        });
                    }
                    else {
                        this.on_load(false);
                    }
                }
            }).catch(err => {
                console.log("findOne: " + err.stack);
                reject(err);
            });*/
        });
    }

    onLoad(initial: boolean) {
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

    enableModule(name: string) {
        if (this.modules.indexOf(name) !== -1)
            return; //already enabled

        let module = this._bot.getModule(name);
        if (module === null)
            return; //no such module

        if (module.disabled)
            return;

        this.modules.push(name.toLowerCase());
        module.onLoad(this);

        /*this.config.value.modules = this.modules;
        this.config.save().catch(err => {
            console.log(err);
        });*/
    }

    isModuleEnabled(name: string) {
        return this.modules.indexOf(name.toLowerCase()) !== -1;
    }

    disableModule(name: string) {
        if (this.modules.indexOf(name) === -1)
            return; //already enabled

        let module = this._bot.getModule(name);
        if (module === null)
            return; //no such module

        if (module.disabled)
            return;

        this.modules.splice(this.modules.indexOf(name.toLowerCase()), 1);
        module.onUnload(this);

        /*this.config.value.modules = this.modules;
        this.config.save().catch(err => {
            console.log(err);
        });*/
    }

    ignoreUser(user) {
        if (this.ignoreList.indexOf(user.user_id) === -1) {
            /*this.config.value.ignoreList.push(user.user_id);
            this.config.save().catch(err => {
                console.log(err);
            });*/
        }
    }

    unignoreUser(user) {
        let idx = this.ignoreList.indexOf(user.user_id);
        if (idx !== -1) {
            /*this.config.value.ignoreList.splice(idx, 1);
            this.config.save().catch(err => {
                console.log(err);
            });*/
        }
    }

    isUserIgnored(user) {
        return this.ignoreList.indexOf(user.user_id) !== -1;
    }

    set channel(channel) {
        /*this.config.value.channel = channel;
        this.config.save().catch(err => {
            console.log(err);
        });*/
    }

    get channel(): string {
        return "";
        //return this.config.value.channel;
    }

    get modules() {
        return this._modules;
        //return this.config.value.modules;
    }

    get ignoreList() {
        return [];
        //return this.config.value.ignoreList;
    }

    get id() {
        return this._id;
    }
}
