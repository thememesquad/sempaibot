import { Client, Message, MessageOptions, RichEmbed, RichEmbedOptions, TextChannel } from "discord.js";
import { Config } from "../../../config";
import { BotBase, MessageContent } from "../botbase";
import { IMessageInterface } from "../module/messageinterface";
import { Server } from "../server";
import { IAPI } from "./apibase";

export class DiscordAPI implements IAPI {
    private _connectedOnce: boolean;
    private _connected: boolean;

    private _bot: BotBase;
    private _discord: Client;

    constructor() {
        this._connectedOnce = false;
        this._connected = false;

        this._discord = new Client();
        this._discord.on("message", this.onMessage.bind(this));
        this._discord.on("ready", this.onReady.bind(this));
        this._discord.on("serverCreated", this.onServerCreated.bind(this));
        this._discord.on("serverDeleted", this.onServerDeleted.bind(this));
        this._discord.on("disconnected", this.onDisconnected.bind(this));
        this._discord.on("error", this.onError.bind(this));
    }

    public setBot(bot: BotBase): void {
        this._bot = bot;
    }

    public async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessageInterface | IMessageInterface[]> {
        if (this._bot.isServerBlacklisted(server.id))
            return Promise.reject("blacklisted");

        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.message(msg, server));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        let channel = server.channel;
        if (channel.length === 0)
            channel = server.server.channels.first().id;

        const actualChannel: TextChannel = server.server.channels.get(channel) as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await actualChannel.send(message, options) as IMessageInterface;
    }

    public async respond(m: IMessageInterface, message: MessageContent | MessageContent[]): Promise<IMessageInterface | IMessageInterface[]> {
        if (m.server !== null && this._bot.isServerBlacklisted(m.server.id))
            return Promise.reject("blacklisted");

        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.respond(m, msg));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        const actualChannel: TextChannel = m.channel as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await actualChannel.send(message, options) as IMessageInterface;
    }

    public async edit(original: IMessageInterface, message: MessageContent): Promise<IMessageInterface> {
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await (original as Message).edit(message, options) as IMessageInterface;
    }

    public async startup() {
        try {
            await this._discord.login(Config.discord.token);
            this._bot.log(`logged in with token '${Config.discord.token}'.`);
        } catch (err) {
            this._bot.error("discord login error:", err, err.stack);
        }
    }

    public async shutdown() {
        await this._discord.destroy();
    }

    public async processServers(): Promise<Server[]> {
        const servers = [];

        for (const server of this.servers) {
            servers.push(new Server(this._bot, server));
        }

        return servers;
    }

    public async onMessage(message) {
        await this._bot.onMessage(message);
    }

    public async onServerCreated(server) {
        if (!this._connected)
            return;

        await this._bot.onServerCreated(server);
    }

    public async onReady() {
        this._connected = true;

        this._bot.log("Connected to discord.");

        this._connectedOnce = true;
        await this._bot.onReady();
    }

    public async onServerDeleted(server) {
        if (!this._connected)
            return;

        await this._bot.onServerDeleted(server);
    }

    public async onDisconnected() {
        this._connected = false;
        this._bot.log("disconnected from discord.");
    }

    public async onError(err) {
        this._bot.log("discord error: ", err);
    }

    public getUserId(): string {
        return this.user.id;
    }

    public get servers() {
        return this._discord.guilds.array();
    }

    public get user() {
        return this._discord.user;
    }
}
