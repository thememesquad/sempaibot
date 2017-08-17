process.env.TZ = "Europe/Amsterdam";

import "reflect-metadata";
import { DiscordAPI } from "./discord.api";
import { Server } from "./server";
import { Users, User } from "./users";
import { Responses } from "./responses";
import { StringFormat } from "./util";
import { Guild, Snowflake, RichEmbed, RichEmbedOptions, Message } from "discord.js";
import { StatsManager } from "./stats";
import { Permissions } from "./permissions";
import { ModuleBase } from "./modulebase";
import { Config } from "../config";
import { DB } from "./db";
import { ConfigKeyValueModel } from "./model/configkeyvalue";
import { BotBase } from "./botbase";
import { MessageInterface } from "./modulebase";
import * as Modules from "./modules/modules";

export class Bot implements BotBase {
    private _api: DiscordAPI;
    private _servers: { [key: string]: Server };
    private _serversInternal: Array<Server>;
    private _modules: { [key: string]: ModuleBase };
    private _userBlacklist: ConfigKeyValueModel;
    private _serverBlacklist: ConfigKeyValueModel;

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

        this._ready = false;
        this._allowLog = allowLog;
        this._availableModules = {};

        this._userBlacklist = null;
        this._serverBlacklist = null;

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

    async message(message: string | RichEmbed | RichEmbedOptions, server: Server): Promise<Message> {
        return await this._api.message(message, server);
    }

    async messageQueue(messages: Array<string | RichEmbed | RichEmbedOptions>, server: Server): Promise<Array<Message>> {
        let ids = [];

        for (let entry of messages)
            ids.push(await this.message(entry, server));

        return ids;
    }

    async respond(m: MessageInterface, message: string | RichEmbed | RichEmbedOptions): Promise<Message> {
        return await this._api.respond(m, message);
    }

    async respondQueue(m: MessageInterface, messages: Array<string | RichEmbed | RichEmbedOptions>): Promise<Array<Message>> {
        let ids = [];

        for (let entry of messages)
            ids.push(await this.respond(m, entry));

        return ids;
    }

    async edit(message: Message, edit: string | RichEmbed | RichEmbedOptions): Promise<Message> {
        return await this._api.edit(message, edit);
    }

    async processConfig(docs) {
        for (let i = 0; i < docs.length; i++) {
            switch (docs[i].key) {
                case "mode":
                    Responses.setMode(docs[i].value.value);
                    break;

                case "user_blacklist":
                    this._userBlacklist = docs[i];
                    break;

                case "server_blacklist":
                    this._serverBlacklist = docs[i];
                    break;
            }
        }

        if (this._userBlacklist === null) {
            this._userBlacklist = new ConfigKeyValueModel();
            this._userBlacklist.key = "user_blacklist";
            this._userBlacklist.value = { blacklist: [] };
            this._userBlacklist = await DB.connection.manager.save(this._userBlacklist);
        }

        if (this._serverBlacklist === null) {
            this._serverBlacklist = new ConfigKeyValueModel();
            this._serverBlacklist.key = "server_blacklist";
            this._serverBlacklist.value = { blacklist: [] };
            this._serverBlacklist = await DB.connection.manager.save(this._serverBlacklist);
        }
    }

    async onReady() {
        await DB.setup();
        await this.printStatus("Loading config from DB", async () => {
            let data = await DB.connection.getRepository(ConfigKeyValueModel).find();
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

    public async processMessage(server, message: MessageInterface, identifier): Promise<boolean> {
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

            let resp = await this._modules[key].checkMessage(server, message);

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

    async onServerCreated(server): Promise<void> {
        if (!this._ready)
            return;

        this.log("Joined server '" + server.name + "'.");

        this._servers[server.id] = new Server(this, server);
        await this._servers[server.id].loadPromise;

        for (let key in this._modules) {
            if (this._modules[key].alwaysOn || this._modules[key].defaultOn)
                this._servers[server.id].enableModule(key);
        }

        this._serversInternal.push(this._servers[server.id]);

        StatsManager.update("num_servers", this._serversInternal.length);
    }

    async onServerDeleted(server): Promise<void> {
        if (!this._ready)
            return;

        this.log("Left server '" + server.name + "'.");

        delete this._serversInternal[this._serversInternal.indexOf(this._servers[server.id])];
        delete this._servers[server.id];

        StatsManager.update("num_servers", this._serversInternal.length);
    }

    async blacklistUser(user: User): Promise<void> {
        this._userBlacklist.value.blacklist.push(user._userID);
        await DB.connection.manager.save(this._userBlacklist);
    }

    async blacklistServer(server_id: string): Promise<void> {
        this.message(Responses.get("INFORM_SERVER_BLACKLISTED"), this._servers[server_id]);

        this._serverBlacklist.value.blacklist.push(server_id);
        await DB.connection.manager.save(this._serverBlacklist);
    }

    async whitelistUser(user: User): Promise<boolean> {
        let idx = this._userBlacklist.value.blacklist.indexOf(user._userID);
        if (idx === -1)
            return false;

        this._serverBlacklist.value.blacklist.splice(idx, 1);
        await DB.connection.manager.save(this._serverBlacklist);

        return true;
    }

    async whitelistServer(server_id: string): Promise<boolean> {
        let idx = this._serverBlacklist.value.blacklist.indexOf(server_id);
        if (idx === -1)
            return false;

        this._serverBlacklist.value.blacklist.splice(idx, 1);
        await DB.connection.manager.save(this._serverBlacklist);
        await this.message(Responses.get("INFORM_SERVER_WHITELISTED"), this._servers[server_id]);

        return true;
    }

    isUserBlacklisted(user: User): boolean {
        return this._userBlacklist.value.blacklist.indexOf(user._userID) !== -1;
    }

    isServerBlacklisted(server_id: string): boolean {
        return this._serverBlacklist.value.blacklist.indexOf(server_id) !== -1;
    }

    getInternalServerId(server: Server): number {
        let id = this._serversInternal.indexOf(server);
        if (id === -1)
            return null;

        return id;
    }

    getInternalServer(serverID: number): Server {
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

    get internalServers(): Array<Server> {
        return this._serversInternal;
    }
}

let bot: Bot = new Bot();
bot.startup();