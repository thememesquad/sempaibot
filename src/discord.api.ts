import { BotBase } from "./botbase";
import { Client, TextChannel, RichEmbed, RichEmbedOptions } from "discord.js";
import { Config } from "../config";
import { Server } from "./server";
import { MessageInterface } from "./modulebase";

interface DiscordQueueObject {
    resolve: () => void;
    reject: () => void;
    callback: (resolve: () => void, reject: () => void) => void;
}

class DiscordQueue {
    _queue: Array<DiscordQueueObject>;

    constructor() {
        this._queue = [];
    }

    queue(callback) {
        return new Promise((resolve, reject) => {
            this._queue.push({ resolve, reject, callback });
        });
    }

    execute() {
        for (let obj of this._queue) {
            setTimeout(() => {
                obj.callback(obj.resolve, obj.reject);
            }, 0);
        }

        this._queue = [];
    }
}

export class DiscordAPI {
    connectedOnce: boolean;
    connected: boolean;

    bot: BotBase;
    queue: DiscordQueue;
    discord: Client;

    constructor(bot: BotBase) {
        this.connectedOnce = false;
        this.connected = false;

        this.bot = bot;
        this.queue = new DiscordQueue();

        this.discord = new Client();
        this.discord.on("message", this.onMessage.bind(this));
        this.discord.on("ready", this.onReady.bind(this));
        this.discord.on("serverCreated", this.onServerCreated.bind(this));
        this.discord.on("serverDeleted", this.onServerDeleted.bind(this));
        this.discord.on("disconnected", this.onDisconnected.bind(this));
        this.discord.on("error", this.onError.bind(this));
    }

    setStatus(status) {
        if (!this.connected)
            return this.queue.queue(this.setStatus.bind(this, status));

        this.discord.user.setStatus(status).catch(() => {
            this.connected = false;
            this.queue.queue(this.setStatus.bind(this, status));
        });
    }

    message(message: string, server: Server) {
        if (this.bot.isServerBlacklisted(server.id))
            return Promise.reject("blacklisted");

        let channel = server.channel;
        if (channel.length === 0)
            channel = server._server.channels.first().id;

        let actual_channel: TextChannel = server._server.channels.get(channel) as TextChannel;

        return new Promise((resolve, reject) => {
            let queue = () => {
                return this.queue.queue((resolve, reject) => {
                    actual_channel.send(message).then(() => resolve(message)).catch(err => reject(err));
                });
            };

            if (!this.connected)
                return queue().then(ret => resolve(ret)).catch(err => reject(err));

            actual_channel.send(message).then(() => resolve(message)).catch(() => {
                this.connected = false;
                return queue().then(ret => resolve(ret)).catch(err => reject(err));
            });
        });
    }

    embed(message: RichEmbed | RichEmbedOptions, server: Server) {
        if (this.bot.isServerBlacklisted(server.id))
            return Promise.reject("blacklisted");

        let channel = server.channel;

        if (channel.length === 0)
            channel = server._server.channels.first().id;

        let actual_channel: TextChannel = server._server.channels.get(channel) as TextChannel;

        return new Promise((resolve, reject) => {
            let queue = () => {
                return this.queue.queue((resolve, reject) => actual_channel.sendEmbed(message).then(() => resolve(message)).catch(err => reject(err)));
            };

            if (!this.connected)
                return queue().then(ret => resolve(ret)).catch(err => reject(err));

            actual_channel.sendEmbed(message).then(() => resolve(message)).catch((err) => {
                this.connected = false;
                return queue().then(ret => resolve(ret)).catch(err => reject(err));
            });

        });
    }

    respond(m: MessageInterface, message: string) {
        if (m.server !== null && this.bot.isServerBlacklisted(m.server.id))
            return Promise.reject("blacklisted");

        let actual_channel: TextChannel = m.channel as TextChannel;

        return new Promise((resolve, reject) => {
            let queue = () => {
                return this.queue.queue((resolve, reject) => {
                    actual_channel.send(message).then(() => resolve(message)).catch(err => reject(err));
                });
            };

            if (!this.connected)
                return queue().then(ret => resolve(ret)).catch(err => reject(err));

            actual_channel.send(message).then(() => resolve(message)).catch(() => {
                this.connected = false;
                return queue().then(ret => resolve(ret)).catch(err => reject(err));
            });
        });
    }

    edit(message, edit) {
        
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

        if (this.connectedOnce)
            return this.queue.execute();

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
        this.bot.log("discord error: " + err);
    }

    get servers() {
        return this.discord.guilds.array();
    }

    get user() {
        return this.discord.user;
    }
}