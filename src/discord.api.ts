import { BotBase } from "./botbase";
import { Client, TextChannel, RichEmbed, RichEmbedOptions, Snowflake, Message } from "discord.js";
import { Config } from "../config";
import { Server } from "./server";
import { MessageInterface } from "./modulebase";

export class DiscordAPI {
    connectedOnce: boolean;
    connected: boolean;

    bot: BotBase;
    discord: Client;

    constructor(bot: BotBase) {
        this.connectedOnce = false;
        this.connected = false;

        this.bot = bot;

        this.discord = new Client();
        this.discord.on("message", this.onMessage.bind(this));
        this.discord.on("ready", this.onReady.bind(this));
        this.discord.on("serverCreated", this.onServerCreated.bind(this));
        this.discord.on("serverDeleted", this.onServerDeleted.bind(this));
        this.discord.on("disconnected", this.onDisconnected.bind(this));
        this.discord.on("error", this.onError.bind(this));
    }

    setStatus(status) {
        this.discord.user.setStatus(status).catch(() => {
            this.connected = false;
        });
    }

    async message(message: string | RichEmbed | RichEmbedOptions | Array<string | RichEmbed | RichEmbedOptions>, server: Server): Promise<Message | Message[]> {
        if (this.bot.isServerBlacklisted(server.id))
            return Promise.reject("blacklisted");

        if (Array.isArray(message)) {
            let ids = [];

            for (let msg of message) {
                ids.push(this.message(msg, server));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        let channel = server.channel;
        if (channel.length === 0)
            channel = server._server.channels.first().id;

        let actual_channel: TextChannel = server._server.channels.get(channel) as TextChannel;
        let options = {};

        if (message instanceof RichEmbed) {
            options["embed"] = message;
            message = "";
        }

        return await actual_channel.send(message, options) as Message;
    }

    async respond(m: MessageInterface, message: string | RichEmbed | RichEmbedOptions | Array<string | RichEmbed | RichEmbedOptions>): Promise<Message | Message[]> {
        if (m.server !== null && this.bot.isServerBlacklisted(m.server.id))
            return Promise.reject("blacklisted");

        if (Array.isArray(message)) {
            let ids = [];

            for (let msg of message) {
                ids.push(this.respond(m, msg));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        let actual_channel: TextChannel = m.channel as TextChannel;
        let options = {};

        if (message instanceof RichEmbed) {
            options["embed"] = message;
            message = "";
        }
        
        return await actual_channel.send(message, options) as Message;
    }

    async edit(original: Message, message: string | RichEmbed | RichEmbedOptions): Promise<Message> {
        let options = {};

        if (message instanceof RichEmbed) {
            options["embed"] = message;
            message = "";
        }

        return await original.edit(message, options) as Message;
    }

    async startup() {
        try {
            await this.discord.login(Config.discord.token);
            this.bot.log(`logged in with token '${Config.discord.token}'.`);
        } catch (err) {
            this.bot.error("discord login error:", err, err.stack);
        }
    }

    async shutdown() {
        await this.discord.destroy();
    }

    async onMessage(message) {
        await this.bot.onMessage(message);
    }

    async onServerCreated(server) {
        if (!this.connected)
            return;

        await this.bot.onServerCreated(server);
    }

    async onReady() {
        this.connected = true;

        this.bot.log("Connected to discord.");

        this.connectedOnce = true;
        await this.bot.onReady();
    }

    async onServerDeleted(server) {
        if (!this.connected)
            return;

        await this.bot.onServerDeleted(server);
    }

    async onDisconnected() {
        this.connected = false;
        this.bot.log("disconnected from discord.");
    }

    async onError(err) {
        this.bot.log("discord error: ", err);
    }

    get servers() {
        return this.discord.guilds.array();
    }

    get user() {
        return this.discord.user;
    }
}