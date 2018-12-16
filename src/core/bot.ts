import { Message, RichEmbed, RichEmbedOptions } from "discord.js";
import { Config } from "../../config.js";
import * as Modules from "../modules";
import {
    BotBase,
    Cron,
    DB,
    IAPI,
    IMessage,
    MessageContent,
    MessageID,
    ModuleBase,
    PermissionManager,
    PersonalityManager,
    ReactionId,
    Server,
    User,
    UserManager,
} from "./";
import { ConfigKeyValueModel } from "./model/configkeyvalue";

export class Bot implements BotBase {
    private static _instance: Bot;

    private _api: IAPI;
    private _servers: { [key: string]: Server };
    private _modules: { [key: string]: ModuleBase };
    private _userBlacklistModel: ConfigKeyValueModel;
    private _serverBlacklistModel: ConfigKeyValueModel;
    private _userBlacklist: string[];
    private _serverBlacklist: string[];

    private _allowLog: boolean;
    private _ready: boolean;

    private _availableModules: { [key: string]: ModuleBase };

    constructor(api: IAPI, allowLog: boolean = true) {
        Bot._instance = this;

        this._api = api;
        this._api.setBot(this);

        this._servers = {};
        this._modules = {};

        this._ready = false;
        this._allowLog = allowLog;
        this._availableModules = {};

        this._userBlacklistModel = null;
        this._serverBlacklistModel = null;
        this._userBlacklist = [];
        this._serverBlacklist = [];

        for (const key of Object.keys(Modules)) {
            this._availableModules[key] = new Modules[key]();
        }
    }

    public log(...args: any[]): void {
        if (!this._allowLog)
            return;

        console.log.apply(console.log, args);
    }

    public error(...args: any[]): void {
        console.error.apply(console.error, args);
    }

    public write(...args: any[]): void {
        if (!this._allowLog)
            return;

        process.stdout.write.apply(process.stdout, args);
    }

    public async startup() {
        Cron.instance.start();
        await this._api.startup();
    }

    public async shutdown() {
        Cron.instance.stop();
        this.log("received termination signal, shutting down....");
        await this._api.shutdown();

        for (const key in this._modules)
            this._modules[key].onShutdown();

        this._api.setBot(null);
        this._api = null;
    }

    public getServer(id: string): Server {
        return this._servers[id] || null;
    }

    public getModule(name: string): ModuleBase {
        return this._modules[name.toLowerCase()] || null;
    }

    public async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessage | IMessage[]> {
        return await this._api.message(message, server);
    }

    public async respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]> {
        return await this._api.respond(m, message);
    }

    public async edit(message: IMessage, edit: string | RichEmbed | RichEmbedOptions): Promise<IMessage> {
        return await this._api.edit(message, edit);
    }

    public async addReaction(message: IMessage, reaction: ReactionId | ReactionId[] | string | string[]): Promise<IMessage> {
        return await this._api.addReaction(message, reaction);
    }

    public async removeReaction(message: IMessage, reaction: ReactionId | string, user?: User): Promise<IMessage> {
        return await this._api.removeReaction(message, reaction, user);
    }

    public async clearReactions(message: IMessage): Promise<IMessage> {
        return await this._api.clearReactions(message);
    }

    public async onReady() {
        try {
            await DB.setup();
            await this.printStatus("Loading config from DB", async () => {
                try {
                    const data = await DB.connection.getRepository(ConfigKeyValueModel).find();
                    await this._processConfig(data);
                } catch (e) {
                    await this._processConfig([]);
                }
            });

            await this.printStatus("Loading users from DB", () => UserManager.instance.load());
            await this.printStatus("Loading permissions from DB", () => PermissionManager.instance.load());

            for (const key in this._availableModules) {
                const mod = this._availableModules[key];
                if (!(mod instanceof ModuleBase))
                    continue;

                if (mod.disabled)
                    continue;

                const result = await this.printStatus(`Setting up module '${key}'`, async () => {
                    mod._bot = this;
                    await mod.onSetup();

                    return true;
                });

                if (result === null)
                    continue;

                this._modules[mod.name.toLowerCase()] = mod;
            }

            await PermissionManager.instance.save();

            const servers = await this._api.processServers();
            for (const server of servers) {
                this._servers[server.id] = server;
                const initial = await this._servers[server.id].loadPromise;

                for (const key in this._modules) {
                    if (this._modules[key].alwaysOn || (initial && this._modules[key].defaultOn))
                        this._servers[server.id].enableModule(key);
                }
            }

            this._ready = true;
        } catch (err) {
            console.log(err);
        }
    }

    public async processMessage(server, message: IMessage, identifier): Promise<boolean> {
        identifier = identifier.trim();

        if (message.content.toLowerCase().indexOf(identifier) === -1)
            return false;

        await this._api.startTyping(message);

        message.content = message.content.substr(identifier.length).replace(/\s+/g, " ").trim();

        const split = message.content.split(" ");
        let handled = false;
        const tmp = [];

        for (const key in this._modules) {
            if (this._modules[key].disabled)
                continue;

            const resp = await this._modules[key].checkMessage(server, message);

            if (typeof resp === "string") {
                tmp.push(resp);
            } else if (resp) {
                handled = true;
                break;
            }
        }

        if (!handled) {
            if (split.length === 0)
                await this.respond(message, PersonalityManager.instance.get(MessageID.SempaiCalled, {
                    author: message.author.id,
                }));
            else
                await this.respond(message, PersonalityManager.instance.get(MessageID.UnknownCommand, {
                    author: message.author.id,
                }));
        }

        await this._api.stopTyping(message);
        return true;
    }

    public async onMessage(message: IMessage) {
        let server: Server = null;

        if (message.channel.type !== "dm") {
            server = this._servers[message.channel.guild.id];
            if (server === null || server === undefined)
                return;
        }

        message.user = UserManager.instance.getUser(message.author, server);
        message.server = server;

        // Is the server blacklisted
        if (server !== null && this.isServerBlacklisted(server.id))
            return;

        // Is the user blacklisted/ignored
        if (this.isUserBlacklisted(message.user) || (server !== null && server.isUserIgnored(message.user)))
            return;

        if (message.author.id === this._api.getUserId())
            return;

        for (const identifier of Config.identifiers) {
            if (await this.processMessage(server, message, identifier))
                break;
        }
    }

    public async onServerCreated(server): Promise<void> {
        if (!this._ready)
            return;

        this.log("Joined server '" + server.name + "'.");

        this._servers[server.id] = new Server(this, server);
        await this._servers[server.id].loadPromise;

        for (const key in this._modules) {
            if (this._modules[key].alwaysOn || this._modules[key].defaultOn)
                this._servers[server.id].enableModule(key);
        }
    }

    public async onServerDeleted(server): Promise<void> {
        if (!this._ready)
            return;

        this.log("Left server '" + server.name + "'.");

        delete this._servers[server.id];
    }

    public async blacklistUser(user: User): Promise<void> {
        this._userBlacklist.push(user.getUserID());
        this._userBlacklistModel.value = this._userBlacklist.join(";");

        await DB.connection.manager.save(this._userBlacklistModel);
    }

    public async blacklistServer(serverId: string): Promise<void> {
        this.message(PersonalityManager.instance.get(MessageID.InformServerBlacklisted), this._servers[serverId]);

        this._serverBlacklist.push(serverId);
        this._serverBlacklistModel.value = this._serverBlacklist.join(";");

        await DB.connection.manager.save(this._serverBlacklistModel);
    }

    public async whitelistUser(user: User): Promise<boolean> {
        const idx = this._userBlacklist.indexOf(user.getUserID());
        if (idx === -1)
            return false;

        this._userBlacklist.splice(idx, 1);
        this._userBlacklistModel.value = this._userBlacklist.join(";");

        await DB.connection.manager.save(this._userBlacklistModel);

        return true;
    }

    public async whitelistServer(serverId: string): Promise<boolean> {
        const idx = this._serverBlacklist.indexOf(serverId);
        if (idx === -1)
            return false;

        this._serverBlacklist.splice(idx, 1);
        this._serverBlacklistModel.value = this._serverBlacklist.join(";");

        await DB.connection.manager.save(this._serverBlacklistModel);
        await this.message(PersonalityManager.instance.get(MessageID.InformServerWhitelisted), this._servers[serverId]);

        return true;
    }

    public isUserBlacklisted(user: User): boolean {
        return this._userBlacklist.indexOf(user.getUserID()) !== -1;
    }

    public isServerBlacklisted(serverId: string): boolean {
        return this._serverBlacklist.indexOf(serverId) !== -1;
    }

    public get user(): User {
        return UserManager.instance.getUserById(this._api.getUserId());
    }

    public get modules(): { [key: string]: ModuleBase } {
        return this._modules;
    }

    public get servers(): { [key: string]: Server } {
        return this._servers;
    }

    private print(message: string, length: number, newline: boolean) {
        while (message.length !== length)
            message += ".";

        if (newline)
            this.log(message);
        else
            this.write(message);
    }

    private async printStatus(message: string, callback: () => any) {
        this.print(message, 70, false);

        try {
            const tmp = await callback();
            this.log("....Ok");

            return tmp;
        } catch (err) {
            this.error("error:", err, err.stack);
            return null;
        }
    }

    private async _processConfig(docs: ConfigKeyValueModel[]) {
        for (const doc of docs) {
            switch (doc.key) {
                case "mode":
                    // Responses.setMode(doc.value.value);
                    break;

                case "user_blacklist":
                    this._userBlacklistModel = doc;
                    break;

                case "server_blacklist":
                    this._serverBlacklistModel = doc;
                    break;
            }
        }

        if (this._userBlacklistModel === null) {
            this._userBlacklistModel = DB.connection.manager.create(ConfigKeyValueModel);
            this._userBlacklistModel.key = "user_blacklist";
            this._userBlacklistModel.value = "";
            this._userBlacklistModel = await DB.connection.manager.save(this._userBlacklistModel);
        } else {
            this._userBlacklist = this._userBlacklistModel.value.split(";");
        }

        if (this._serverBlacklistModel === null) {
            this._serverBlacklistModel = DB.connection.manager.create(ConfigKeyValueModel);
            this._serverBlacklistModel.key = "server_blacklist";
            this._serverBlacklistModel.value = "";
            this._serverBlacklistModel = await DB.connection.manager.save(this._serverBlacklistModel);
        } else {
            this._serverBlacklist = this._serverBlacklistModel.value.split(";");
        }
    }

    public static get instance() {
        return Bot._instance;
    }
}
