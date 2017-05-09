let dummy_user = {
    id: "1338",
    username: "dummyuser",
    name: "DummyUser"
};

let dummy_user2 = {
    id: "1340",
    username: "dummyuser2",
    name: "DummyUser2"
};

let dummy_server = {
    id: "1337",
    name: "DummyServer",
    members: [dummy_user, dummy_user2],
    owner: dummy_user
};

let dummy_channel = {
    id: "1339",
    type: "text",
    guild: dummy_server
};

let dummy_message = {
    channel: dummy_channel,
    author: dummy_user2,
    content: "sempai hilfe"
};

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
        for(let entry of messages) {
            this.message(entry, server);
        }
    }

    respond(m, message) {
        console.log(`responding message ${message} in channel ${m.channel.name}`);
    }

    respond_queue(message, messages) {
        for(let entry of messages) {
            this.respond(message, entry);
        }
    }

    async startup() {
        await this.bot.on_ready();
        this.bot.on_message(dummy_message);
    }

    shutdown() {
    }

    get servers() {
        return [dummy_server];
    }

    get user() {
        return dummy_user;
    }
}

module.exports = DummyAPI;