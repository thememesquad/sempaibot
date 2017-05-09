const config = require("../config.js"),
    Discord = require("discord.js"),
    stats = require("./stats.js"),
    ServerData = require("./serverdata.js");

class DiscordAPI {
    constructor(bot) {
        this.connected_once = false;
        this.connected = false;

        this.bot = bot;
        this.queue = [];

        this.discord = new Discord.Client({
            autoReconnect: true
        });

        this.discord.on("message", this.on_message.bind(this));
        this.discord.on("ready", this.on_ready.bind(this));
        this.discord.on("serverCreated", this.on_server_created.bind(this));
        this.discord.on("serverDeleted", this.on_server_deleted.bind(this));
        this.discord.on("disconnected", this.on_disconnected.bind(this));
        this.discord.on("error", this.on_error.bind(this));
    }

    set_status(status, game) {
        if (!this.connected)
            return this.queue.push(this.set_status.bind(this, status, game));

        this.discord.user.setStatus(status, game).catch(() => {
            this.connected = false;
            this.queue.push(this.set_status.bind(this, status, game));
        });
    }

    message(message, server) {
        if (this.bot.is_server_blacklisted(server.id)) {
            return Promise.reject("blacklisted");
        }

        let channel = server.channel;
        if (channel.length === 0) {
            channel = server.server.channels.first().id;
        }

        let actual_channel = server.server.channels.get(channel);

        return new Promise((resolve, reject) => {
            let queue = () => {
                this.queue.push(() => {
                    actual_channel.sendMessage(message).then(() => resolve(message)).catch(err => reject(err));
                });
            };

            if (!this.connected) {
                queue();
                return;
            }

            actual_channel.sendMessage(message).then(() => resolve(message)).catch(() => {
                this.connected = false;
                queue();
            });

        });
    }

    embed(message, server) {
        if (this.bot.is_server_blacklisted(server.id))
            return Promise.reject("blacklisted");

        let channel = server.channel;

        if (channel.length === 0)
            channel = server.server.channels.first().id;

        let actual_channel = server.server.channels.get(channel);

        return new Promise((resolve, reject) => {
            let queue = () => this.queue.push(() => actual_channel.sendEmbed(message).then(() => resolve(message)).catch(err => reject(err)));

            if (!this.connected) {
                queue();
                return;
            }

            actual_channel.sendEmbed(message).then(() => resolve(message)).catch((err) => {
                console.log(err);
                this.connected = false;
                queue();
            });

        });
    }

    async message_queue(messages, server) {
        for(let entry of messages) {
            await this.message(entry, server);
        }
    }

    respond(m, message) {
        if (this.bot.is_server_blacklisted(m.server.id)) {
            return Promise.reject("blacklisted");
        }

        let actual_channel = m.channel;

        return new Promise((resolve, reject) => {
            let queue = () => {
                this.queue.push(() => {
                    actual_channel.sendMessage(message).then(() => resolve(message)).catch(err => reject(err));
                });
            };

            if (!this.connected) {
                queue();
                return;
            }

            actual_channel.sendMessage(message).then(() => resolve(message)).catch(() => {
                this.connected = false;
                queue();
            });
        });
    }

    async respond_queue(message, messages) {
        for(let entry of messages) {
            await this.respond(message, entry);
        }
    }

    async startup() {
        try {
            await this.discord.login(config.discord.token);
            this.bot.log(`logged in with token '${config.discord.token}'.`);
        } catch(err) {
            this.bot.error("discord login error:", err, err.stack);
        }
    }

    async shutdown() {
        await this.discord.destroy();
    }

    async on_message(message) {
        await this.bot.on_message(message);
    }

    async on_server_created(server) {
        if (!this.connected)
            return;

        await this.bot.on_server_created(server);
    }

    async on_ready() {
        this.connected = true;

        this.bot.log("Connected to discord.");

        if (this.connected_once) {
            while (this.queue.length !== 0) {
                this.queue[0]();
                this.queue.splice(0, 1);
            }

            return;
        }

        this.connected_once = true;
        await this.bot.on_ready();
    }

    async on_server_deleted(server) {
        if (!this.connected)
            return;

        await this.bot.on_server_deleted(server);
    }

    async on_disconnected() {
        this.connected = false;
        this.bot.log("disconnected from discord.");
    }

    async on_error(err) {
        this.bot.log("discord error: " + err);
    }

    get servers() {
        return this.discord.guilds.array();
    }

    get user() {
        return this.discord.user;
    }
}

module.exports = DiscordAPI;