process.env.TZ = "Europe/Amsterdam";

const ServerData = require("./serverdata.js"),
    modules = require("auto-loader").load(__dirname + "/modules"),
    responses = require("./responses.js"),
    db = require("./db.js"),
    config = require("../config.js"),
    users = require("./users.js"),
    permissions = require("./permissions.js"),
    Document = require("camo").Document,
    changelog = require("./changelog.js"),
    stats = require("./stats.js"),
    DiscordAPI = require("./discord.api.js");

class ChangelogDB extends Document {
    constructor() {
        super();

        this.version = Number;
    }
}

String.prototype.format = function(args) {
    return this.replace(/{(.*?)}/g, (match, key) => {
        return typeof args[key] !== "undefined" ? args[key] : match;
    });
};

class Bot {
    constructor(allow_log) {
        this.api = new DiscordAPI(this);

        this.servers = {};
        this.servers_internal = [];
        this.modules = {};
        this.user_blacklist = null;
        this.server_blacklist = null;
        this.ready = false;
        this.allow_log = (allow_log === undefined) ? true : allow_log;

        process.on("SIGTERM", () => this.shutdown());
    }

    log() {
        if (!this.allow_log) return;
        console.log.apply(console.log, arguments);
    }

    error() {
        console.error.apply(console.error, arguments);
    }

    write() {
        if (!this.allow_log) return;
        process.stdout.write.apply(process.stdout, arguments);
    }

    async startup() {
        await this.api.startup();
    }

    async shutdown() {
        this.log("received termination signal, shutting down....");
        await this.api.shutdown();

        for (let key in this.modules) {
            if (this.modules[key].on_shutdown !== undefined)
                this.modules[key].on_shutdown();
        }

        await stats.save();
        process.exit(0);
    }

    get_module(name) {
        return (this.modules[name.toLowerCase()] === undefined) ? null : this.modules[name.toLowerCase()];
    }

    print(message, length, newline) {
        while (message.length !== length)
            message += ".";

        if (newline)
            this.log(message);
        else
            this.write(message);
    }

    async print_status(message, callback) {
        this.print(message, 70, false);

        try {
            let tmp = await callback();
            this.log("....Ok");

            return tmp;
        } catch(err) {
            this.error("error:", err, err.stack);
            return null;
        }
    }
    
    async set_status(status, game) {
        return await this.api.set_status(status, game);
    }

    async embed(message, server) {
        return await this.api.embed(message, server);
    }

    async message(message, server) {
        return await this.api.message(message, server);
    }

    async message_queue(messages, server) {
        return await this.api.message_queue(messages, server);
    }

    async respond(m, message) {
        return await this.api.respond(m, message);
    }

    async respond_queue(message, messages) {
        return await this.api.respond_queue(message, messages);
    }

    async process_config(docs) {
        for (let i = 0; i < docs.length; i++) {
            if (docs[i].key === "mode") {
                if (docs[i].value.value !== responses.currentMode)
                    responses.setMode(docs[i].value);
            } else if (docs[i].key === "user_blacklist") {
                this.user_blacklist = docs[i];
            } else if (docs[i].key === "server_blacklist") {
                this.server_blacklist = docs[i];
            }
        }

        if (this.user_blacklist === null) {
            this.user_blacklist = db.ConfigKeyValue.create({
                key: "user_blacklist", 
                value: { blacklist: [] } 
            });

            await this.user_blacklist.save();
        }

        if (this.server_blacklist === null) {
            this.server_blacklist = db.ConfigKeyValue.create({ 
                key: "server_blacklist", 
                value: { blacklist: [] }
            });

            await this.server_blacklist.save();
        }
    }

    async on_ready() {
        await db.load(this);
        await this.print_status("Loading config from DB", async () => {
            let docs = await db.ConfigKeyValue.find({});
            await this.process_config(docs);
        });
        await this.print_status("Loading users from DB", () => users.load());
        await this.print_status("Loading permissions from DB", () => permissions.load());

        for (let key in modules) {
            let mod = modules[key];
            
            await this.print_status(`Setting up module '${key}'`, async () => {
                mod.bot = this;
                if(mod.on_setup !== undefined)
                    await mod.on_setup();
            });

            this.modules[mod.name.toLowerCase()] = mod;
        }

        await permissions.save();

        let changelog_version = await this.print_status("Loading changelog", async () => {
            let doc = await ChangelogDB.findOne({});
            if(doc === null) {
                await ChangelogDB.create({ version: changelog.version }).save();
                return changelog.version;
            }

            if(doc.version !== changelog.version) {
                let old = doc.version;
                doc.version = changelog.version;

                await doc.save();
                return old;
            }

            return doc.version;
        });

        await this.print_status("Loading stats", () => {
            return stats.load();
        });

        let servers = this.api.servers;
        stats.register("num_servers", servers.length);

        for (let i = 0; i < servers.length; i++) {
            let server = servers[i];

            this.servers[server.id] = new ServerData(this, server);
            let initial = await this.servers[server.id].load_promise;

            for (let key in this.modules) {
                if (this.modules[key].always_on)
                    this.servers[server.id].enable_module(key);

                if (initial && this.modules[key].default_on)
                    this.servers[server.id].enable_module(key);
            }

            let msg = "";
            for (let i = 0; i < changelog.changelog.length; i++) {
                if (changelog.changelog[i][0] <= changelog_version)
                    continue;

                if (msg.length !== 0)
                    msg += "\r\n";

                msg += "- " + changelog.changelog[i][1];
            }

            if (msg.length !== 0)
                this.message(responses.get("CHANGELOG").format({ 
                    changelog: msg 
                }), this.servers[server.id]);

            this.servers_internal.push(this.servers[server.id]);
        }

        this.ready = true;
    }

    async process_message(server, message, identifier) {
        identifier = identifier.trim();
        
        if (message.content.toLowerCase().indexOf(identifier) === -1)
            return false;

        message.content = message.content.substr(identifier.length).replace(/\s+/g, " ").trim();

        let split = message.content.split(" ");
        let handled = false;
        let tmp = [];

        for (let key in this.modules) {
            let resp = this.modules[key].check_message(server, message, split);

            if (typeof resp === "string") {
                tmp.push(resp);
            } else if (resp) {
                handled = true;
                break;
            }
        }

        if (!handled && tmp.length > 0) {
            await this.respond(message, responses.get("INCORRECT_FORMAT").format({ 
                author: message.author.id, 
                sample: tmp[0] 
            }));

            handled = true;
        }

        if (!handled) {
            if (split.length === 1)
                await this.respond(message, responses.get("NAME").format({ author: message.author.id }));
            else
                await this.respond(message, responses.get("UNKNOWN_COMMAND").format({ author: message.author.id }));
        }

        return true;
    }

    async on_message(message) {
        let server = null;

        if (message.channel.type !== "dm") {
            server = this.servers[message.channel.guild.id];
            if (server === null || server === undefined)
                return;
        }

        message.user = users.get_user(message.author, server);
        message.server = server;

        //Is the server blacklisted
        if (server !== null && this.is_server_blacklisted(server.id))
            return;

        //Is the user blacklisted/ignored
        if (this.is_user_blacklisted(message.user) || (server !== null && server.is_user_ignored(message.user)))
            return;

        if (message.author.id === this.api.user.id)
            return;

        for(let identifier of config.identifiers) {
            if(await this.process_message(server, message, identifier))
                break;
        }
    }

    async on_server_created(server) {
        if (!this.ready)
            return;

        this.log("Joined server '" + server.name + "'.");

        stats.update("num_servers", this.api.servers.length);

        this.servers[server.id] = new ServerData(this, server);
        await this.servers[server.id].load_promise.promise;

        for (let key in this.modules) {
            if (this.modules[key].always_on)
                this.servers[server.id].enable_module(key);

            if (this.modules[key].default_on)
                this.servers[server.id].enable_module(key);
        }

        this.servers_internal.push(this.servers[server.id]);
    }

    async on_server_deleted(server) {
        if (!this.ready)
            return;

        this.log("Left server '" + server.name + "'.");

        stats.update("num_servers", this.discord.guilds.array().length);

        delete this.servers_internal[this.servers_internal.indexOf(this.servers[server.id])];
        delete this.servers[server.id];
    }

    async blacklist_user(user) {
        this.user_blacklist.value.blacklist.push(user.user_id);
        await this.user_blacklist.save();
    }

    async blacklist_server(server_id) {
        this.message(responses.get("INFORM_SERVER_BLACKLISTED"), this.servers[server_id]);
        this.server_blacklist.value.blacklist.push(server_id);
        await this.server_blacklist.save();
    }

    async whitelist_user(user) {
        let idx = this.user_blacklist.value.blacklist.indexOf(user.user_id);
        if (idx === -1)
            return false;

        this.user_blacklist.value.blacklist.splice(idx, 1);
        await this.user_blacklist.save();

        return true;
    }

    async whitelist_server(server_id) {
        let idx = this.server_blacklist.value.blacklist.indexOf(server_id);
        if (idx === -1)
            return false;

        this.server_blacklist.value.blacklist.splice(idx, 1);
        await this.server_blacklist.save();
        await this.message(responses.get("INFORM_SERVER_WHITELISTED"), this.servers[server_id]);

        return true;
    }

    is_user_blacklisted(user) {
        return this.user_blacklist.value.blacklist.indexOf(user.user_id) !== -1;
    }

    is_server_blacklisted(server_id) {
        return this.server_blacklist.value.blacklist.indexOf(server_id) !== -1;
    }

    get_internal_server_id(server) {
        let id = this.servers_internal.indexOf(server);
        if (id === -1)
            return null;

        return id;
    }

    get_server_internal(serverID) {
        if (serverID < 0 || serverID >= this.servers_internal.length)
            return null;

        return this.servers_internal[serverID];
    }

    get user() {
        return users.get_user_by_id(this.api.user.id);
    }
}

if (require.main === module) {
    let bot = new Bot();
    bot.startup();
} else {
    module.exports = Bot;
}