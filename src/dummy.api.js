class DummyAPI {
    constructor(bot) {
        this.bot = bot;
    }

    set_status(status, game) {
        console.log(`changing status to ${status} and game ${game}`);
    }

    message(message, server) {
        console.log(`sending message ${message} to server ${server.id}`);
    }

    embed(message, server) {
    }

    message_queue(messages, server) {
        for (let entry of messages) {
            this.message(entry, server);
        }
    }

    respond(m, message) {
        console.log(`responding message ${message} in channel ${m.channel.name}`);
    }

    respond_queue(message, messages) {
        for (let entry of messages) {
            this.respond(message, entry);
        }
    }

    async startup() {
        await this.bot.on_ready();
    }

    shutdown() {
    }

    get servers() {
        return [];
    }

    get user() {
        return null;
    }
}

module.exports = DummyAPI;