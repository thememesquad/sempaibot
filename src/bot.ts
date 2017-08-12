process.env.TZ = "Europe/Amsterdam";

import "reflect-metadata";
import { DiscordAPI } from "./discord.api";
import { Server } from "./server";
import { Users, User } from "./users";
import { Responses } from "./responses";
import { StringFormat } from "./util";
import { Guild, Snowflake, RichEmbed, RichEmbedOptions } from "discord.js";
import { StatsManager } from "./stats";
import { Permissions } from "./permissions";
import { ModuleBase } from "./modulebase";
import { Config } from "../config";
import { DB } from "./db";
import { ConfigKeyValueModel } from "./model/configkeyvalue";
import { BotBase } from "./botbase";
import { MessageInterface } from "./modulebase";
import * as Modules from "./modules/modules";

//return connect(`mongodb://${config.db_username}:${config.db_password}@${config.db_host}:${config.db_port}/${db_name}`);

export class Bot implements BotBase {
    private _api: DiscordAPI;
    private _servers: { [key: string]: Server };
    private _serversInternal: Array<Server>;
    private _modules: { [key: string]: ModuleBase };
    private _userBlacklist: Array<number>;
    private _serverBlacklist: Array<number>;

    private _allowLog: boolean;
    private _ready: boolean;

    private _permissions: Permissions;
    private _availableModules: { [key: string]: ModuleBase };

    constructor(allowLog:boolean = true) {
        this._api = new DiscordAPI(this);
        this._permissions = new Permissions();
        this._servers = {};
        this._serversInternal = [];
        this._modules = {};
        this._userBlacklist = [];
        this._serverBlacklist = [];

        this._ready = false;
        this._allowLog = allowLog;
        this._availableModules = {};

        for (let key of Object.keys(Modules))
            this._availableModules[key] = new Modules[key]();

        process.on("SIGTERM", () => this.shutdown());
    }

    log(...args) {
        if (!this._allowLog)
            return;

        console.log.apply(console.log, args);
    }

    error(...args) {
        console.error.apply(console.error, args);
    }

    write(...args) {
        if (!this._allowLog)
            return;

        process.stdout.write.apply(process.stdout, args);
    }

    async startup() {
        await this._api.startup();
    }

    async shutdown() {
        this.log("received termination signal, shutting down....");
        await this._api.shutdown();

        for (let key in this._modules)
            this._modules[key].onShutdown();

        await StatsManager.save();
        process.exit(0);
    }

    getModule(name: string): ModuleBase {
        return (this._modules[name.toLowerCase()] === undefined) ? null : this._modules[name.toLowerCase()];
    }

    print(message: string, length: number, newline: boolean) {
        while (message.length !== length)
            message += ".";

        if (newline)
            this.log(message);
        else
            this.write(message);
    }

    async printStatus(message: string, callback: () => any) {
        this.print(message, 70, false);

        try {
            let tmp = await callback();
            this.log("....Ok");

            return tmp;
        } catch (err) {
            this.error("error:", err, err.stack);
            return null;
        }
    }

    async setStatus(status: string) {
        return await this._api.setStatus(status);
    }

    async embed(message: RichEmbed | RichEmbedOptions, server: Server) {
        return await this._api.embed(message, server);
    }

    async message(message: string, server: Server) {
        return await this._api.message(message, server);
    }

    async messageQueue(messages: Array<string>, server: Server) {
        let ids = [];

        for (let entry of messages)
            ids.push(await this.message(entry, server));

        return ids;
    }

    async respond(m: MessageInterface, message: string) {
        return await this._api.respond(m, message);
    }

    async respondQueue(m: MessageInterface, messages: Array<string>) {
        let ids = [];

        for (let entry of messages)
            ids.push(await this.respond(m, entry));

        return ids;
    }

    async edit(message: Snowflake, edit: string) {
        return await this._api.edit(message, edit);
    }

    async processConfig(docs) {
        for (let i = 0; i < docs.length; i++) {
            switch (docs[i].key) {
                case "mode":
                    //Responses.setMode(docs[i].value.value);
                    break;

                case "user_blacklist":
                    //this.user_blacklist = docs[i];
                    break;

                case "server_blacklist":
                    //this.server_blacklist = docs[i];
                    break;
            }
        }

        /*if (this.user_blacklist === null) {
            this.user_blacklist = db.ConfigKeyValue.create({
                key: "user_blacklist",
                value: { blacklist: [] }
            });

            await this.user_blacklist.save();
        }*/

        /*if (this.server_blacklist === null) {
            this.server_blacklist = db.ConfigKeyValue.create({
                key: "server_blacklist",
                value: { blacklist: [] }
            });

            await this.server_blacklist.save();
        }*/
    }

    async onReady() {
        await DB.setup();
        await this.printStatus("Loading config from DB", async () => {
            let data = await DB.connection.manager.find(ConfigKeyValueModel);
            await this.processConfig(data);
        });

        await this.printStatus("Loading users from DB", () => Users.load());
        await this.printStatus("Loading permissions from DB", () => this._permissions.load());

        for (let key in this._availableModules) {
            let mod = this._availableModules[key];
            if (!(mod instanceof ModuleBase))
                continue;

            if (mod.disabled)
                continue;

            let result = await this.printStatus(`Setting up module '${key}'`, async () => {
                mod._bot = this;
                await mod.onSetup();

                return true;
            });

            if (result === null)
                continue;

            this._modules[mod.name.toLowerCase()] = mod;
        }

        await this._permissions.save();
        await this.printStatus("Loading stats", () => {
            return StatsManager.load();
        });

        let servers = this._api.servers;
        StatsManager.register("num_servers", servers.length);

        for (let i = 0; i < servers.length; i++) {
            let server = servers[i];

            this._servers[server.id] = new Server(this, server);
            let initial = await this._servers[server.id].loadPromise;

            for (let key in this._modules) {
                if (this._modules[key].alwaysOn || (initial && this._modules[key].defaultOn))
                    this._servers[server.id].enableModule(key);
            }

            this._serversInternal.push(this._servers[server.id]);
        }

        this._ready = true;
    }

    async processMessage(server, message: MessageInterface, identifier) {
        identifier = identifier.trim();

        if (message.content.toLowerCase().indexOf(identifier) === -1)
            return false;

        message.content = message.content.substr(identifier.length).replace(/\s+/g, " ").trim();

        let split = message.content.split(" ");
        let handled = false;
        let tmp = [];

        for (let key in this._modules) {
            if (this._modules[key].disabled)
                continue;

            let resp = this._modules[key].check_message(server, message);

            if (typeof resp === "string") {
                tmp.push(resp);
            } else if (resp) {
                handled = true;
                break;
            }
        }

        if (!handled && tmp.length > 0) {
            await this.respond(message, StringFormat(Responses.get("INCORRECT_FORMAT"), {
                author: message.author.id,
                sample: tmp[0]
            }));

            handled = true;
        }

        if (!handled) {
            if (split.length === 1)
                await this.respond(message, StringFormat(Responses.get("NAME"), { author: message.author.id }));
            else
                await this.respond(message, StringFormat(Responses.get("UNKNOWN_COMMAND"), { author: message.author.id }));
        }

        return true;
    }

    async onMessage(message) {
        let server: Server = null;

        if (message.channel.type !== "dm") {
            server = this._servers[message.channel.guild.id];
            if (server === null || server === undefined)
                return;
        }

        message.user = Users.getUser(message.author, server);
        message.server = server;

        //Is the server blacklisted
        if (server !== null && this.isServerBlacklisted(server.id))
            return;

        //Is the user blacklisted/ignored
        if (this.isUserBlacklisted(message.user) || (server !== null && server.isUserIgnored(message.user)))
            return;

        if (message.author.id === this._api.user.id)
            return;

        for (let identifier of Config.identifiers) {
            if (await this.processMessage(server, message, identifier))
                break;
        }
    }

    async onServerCreated(server) {
        if (!this._ready)
            return;

        this.log("Joined server '" + server.name + "'.");

        StatsManager.update("num_servers", this._api.servers.length);

        this._servers[server.id] = new Server(this, server);
        await this._servers[server.id].loadPromise;

        for (let key in this._modules) {
            if (this._modules[key].alwaysOn || this._modules[key].defaultOn)
                this._servers[server.id].enableModule(key);
        }

        this._serversInternal.push(this._servers[server.id]);
    }

    async onServerDeleted(server) {
        if (!this._ready)
            return;

        this.log("Left server '" + server.name + "'.");

        //stats.update("num_servers", this.discord.guilds.array().length);

        delete this._serversInternal[this._serversInternal.indexOf(this._servers[server.id])];
        delete this._servers[server.id];
    }

    async blacklistUser(user) {
        //this.user_blacklist.value.blacklist.push(user.user_id);
        //await this.user_blacklist.save();
    }

    async blacklistServer(server_id) {
        this.message(Responses.get("INFORM_SERVER_BLACKLISTED"), this._servers[server_id]);
        //this.server_blacklist.value.blacklist.push(server_id);
        //await this.server_blacklist.save();
    }

    async whitelistUser(user) {
        /*let idx = this.user_blacklist.value.blacklist.indexOf(user.user_id);
        if (idx === -1)
            return false;

        this.user_blacklist.value.blacklist.splice(idx, 1);
        await this.user_blacklist.save();*/

        return true;
    }

    async whitelistServer(server_id) {
        /*let idx = this.server_blacklist.value.blacklist.indexOf(server_id);
        if (idx === -1)
            return false;

        this.server_blacklist.value.blacklist.splice(idx, 1);
        await this.server_blacklist.save();
        await this.message(responses.get("INFORM_SERVER_WHITELISTED"), this.servers[server_id]);*/

        return true;
    }

    isUserBlacklisted(user) {
        //return this.user_blacklist.value.blacklist.indexOf(user.user_id) !== -1;
        return false;
    }

    isServerBlacklisted(server_id) {
        //return this.server_blacklist.value.blacklist.indexOf(server_id) !== -1;
        return false;
    }

    getInternalServerId(server) {
        let id = this._serversInternal.indexOf(server);
        if (id === -1)
            return null;

        return id;
    }

    getInternalServer(serverID) {
        if (serverID < 0 || serverID >= this._serversInternal.length)
            return null;

        return this._serversInternal[serverID];
    }

    get user(): User {
        return Users.getUserById(this._api.user.id);
    }

    get modules(): { [key: string]: ModuleBase } {
        return this._modules;
    }
}

let bot: Bot = new Bot();
bot.startup();