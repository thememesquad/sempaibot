"use strict";

const process = require("process");
process.env.TZ = "Europe/Amsterdam";

const Discord = require("discord.js");
const ServerData = require("./serverdata.js");

const modules = require("auto-loader").load(__dirname + "/modules");
const responses = require("./responses.js");
const db = require("./db.js");
const config = require("../config.js");
const users = require("./users.js");
const permissions = require("./permissions.js");
const Document = require("camo").Document;
const changelog = require("./changelog.js");
const stats = require("./stats.js");

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
        this.discord = new Discord.Client({
            autoReconnect: true
        });
        this.servers = {};
        this.servers_internal = [];
        this.modules = {};
        this.user_blacklist = null;
        this.server_blacklist = null;
        this.connected_once = false;
        this.connected = false;
        this.queue = [];
        this.ready = false;
        this.allow_log = (allow_log === undefined) ? true : allow_log;

        this.discord.on("message", this.handle_message.bind(this));
        this.discord.on("ready", this.on_ready.bind(this));
        this.discord.on("serverCreated", this.on_server_created.bind(this));
        this.discord.on("serverDeleted", this.on_server_deleted.bind(this));
        this.discord.on("disconnected", this.on_disconnected.bind(this));
        this.discord.on("error", this.on_error.bind(this));

        process.on("SIGTERM", () => this.shutdown());
    }

    log() {
        if (!this.allow_log) return;
        console.log.apply(console.log, arguments);
    }

    write() {
        if (!this.allow_log) return;
        process.stdout.write.apply(process.stdout, arguments);
    }

    shutdown() {
        this.log("Received SIGTERM, shutting down....");
        this.discord.destroy();

        for (var key in this.modules) {
            if (this.modules[key].on_shutdown !== undefined)
                this.modules[key].on_shutdown();
        }

        stats.save().then(() => process.exit(0));
    }

    login() {
        this.discord.login(config.token).then(token => this.log(`Logged in with token '${token}'.`))
            .catch(err => console.error("Discord login error: ", err, err.stack));
    }

    set_status(status, game) {
        if (!this.connected) {
            return this.queue.push(this.set_status.bind(this, status, game));
        }

        this.discord.user.setStatus(status, game).catch(() => {
            this.connected = false;
            this.queue.push(this.set_status.bind(this, status, game));
        });
    }

    message_image(image, server) {
        if (this.is_server_blacklisted(server.id)) {
            return Promise.reject("blacklisted");
        }

        let channel = server.channel;
        if (channel.length === 0) {
            channel = server.server.channels.first().id;
        }

        let actual_channel = server.server.channels.find("id", channel);

        return new Promise((resolve, reject) => {
            let queue = () => {
                this.queue.push(() => {
                    actual_channel.sendFile(image).then(() => resolve(image)).catch(err => reject(err));
                });
            };

            if (!this.connected) {
                queue();
                return;
            }

            actual_channel.sendFile(image).then(() => resolve(image)).catch(() => {
                this.connected = false;
                queue();
            });

        });
    }

    message(message, server) {
        if (this.is_server_blacklisted(server.id)) {
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
        if (this.is_server_blacklisted(server.id))
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

    message_queue(messages, server) {
        return new Promise((resolve, reject) => {
            let send = (index, send) => {
                if (index >= messages.length) {
                    return resolve();
                }

                this.message(messages[index], server).then(() => send(index + 1, send)).catch(err => reject(err));
            };

            send(0, send);
        });
    }

    respond_image(m, image) {
        if (this.is_server_blacklisted(m.server.id)) {
            return Promise.reject("blacklisted");
        }

        let actual_channel = m.channel;

        return new Promise((resolve, reject) => {
            let queue = () => {
                this.queue.push(() => {
                    actual_channel.sendFile(image).then(() => resolve(image)).catch(err => reject(err));
                });
            };

            if (!this.connected) {
                queue();
                return;
            }

            actual_channel.sendFile(image).then(() => resolve(image)).catch(() => {
                this.connected = false;
                queue();
            });
        });
    }

    respond(m, message) {
        if (this.is_server_blacklisted(m.server.id)) {
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

    respond_queue(message, messages) {
        return new Promise((resolve, reject) => {
            let send = (index, send) => {
                if (index >= messages.length) {
                    return resolve();
                }

                this.respond(message, messages[index]).then(() => send(index + 1, send)).catch(err => reject(err));
            };

            send(0, send);
        });
    }

    get_module(name) {
        return (this.modules[name] === undefined) ? null : this.modules[name];
    }

    print(message, length, newline) {
        while (message.length !== length)
            message += ".";

        if (newline)
            this.log(message);
        else
            this.write(message);
    }

    on_ready() {
        this.connected = true;

        this.log("Connected to discord.");

        if (this.connected_once) {
            while (this.queue.length !== 0) {
                this.queue[0]();
                this.queue.splice(0, 1);
            }

            return;
        }

        this.connected_once = true;

        db.load(this).then(() => {
            this.print("Loading config from DB", 70, false);
            return db.ConfigKeyValue.find({});
        }).then(docs => {
            this.log("....Ok");
            for (var i = 0; i < docs.length; i++) {
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
                this.user_blacklist = db.ConfigKeyValue.create({ key: "user_blacklist", value: { blacklist: [] } });
                this.user_blacklist.save().catch(err => console.log(err, err.stack));
            }

            if (this.server_blacklist === null) {
                this.server_blacklist = db.ConfigKeyValue.create({ key: "server_blacklist", value: { blacklist: [] } });
                this.server_blacklist.save().catch(err => console.log(err, err.stack));
            }

            this.print("Loading users from DB", 70, false);
            return users.load();
        }).then(() => {
            this.log("....Ok");
            this.print("Loading permissions from DB", 70, false);
            return permissions.load();
        }).then(() => {
            this.log("....Ok");
            for (var key in modules) {
                var mod = modules[key];
                if (mod.on_setup === undefined) {
                    this.log("Error: Module '" + key + "' is not setup correctly. missing function: on_setup");
                    continue;
                }

                this.print("Setting up module '" + key + "'", 70, false);
                try {
                    mod.on_setup(this);
                    this.log("....Ok");
                } catch (e) {
                    this.log("Error:");
                    this.log(e.stack);
                }

                this.modules[mod.name] = mod;
            }

            return permissions.save();
        }).then(() => {
            this.print("Loading changelog", 70, false);

            return new Promise((resolve, reject) => {
                ChangelogDB.findOne({}).then(doc => {
                    if (doc === null) {
                        return ChangelogDB.create({ version: changelog.version }).save().then(() => {
                            resolve(-1);
                        }).catch(err => {
                            this.log(err);
                        });
                    }

                    if (doc.version !== changelog.version) {
                        var old = doc.version;
                        doc.version = changelog.version;

                        return doc.save().then(() => {
                            resolve(old);
                        }).catch(err => {
                            this.log(err);
                        });
                    }

                    resolve(doc.version);
                }).catch(err => {
                    reject(err);
                });
            });
        }).then(changelog_version => {
            this.log("....Ok");
            this.print("Loading stats", 70, false);

            return new Promise((resolve, reject) => {
                stats.load().then(() => {
                    resolve(changelog_version);
                }).catch(err => {
                    reject(err);
                });
            });
        }).then(changelog_version => {
            let servers = this.discord.guilds.array();

            this.log("....Ok");
            stats.register("num_servers", servers.length);

            for (let i = 0; i < servers.length; i++) {
                let server = servers[i];

                this.servers[server.id] = new ServerData(this, server);
                this.servers[server.id].load_promise.then(initial => {

                    for (var key in this.modules) {
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
                        this.message(responses.get("CHANGELOG").format({ changelog: msg }), this.servers[server.id]);
                });
                this.servers_internal.push(this.servers[server.id]);
            }

            this.ready = true;
        }).catch(err => {
            this.log(err.stack);
        });
    }

    on_server_created(server) {
        if (!this.connected || !this.ready)
            return;

        this.log("Joined server '" + server.name + "'.");

        stats.update("num_servers", this.discord.guilds.array().length);

        this.servers[server.id] = new ServerData(this, server);
        this.servers[server.id].load_promise.promise.then(() => {
            for (var key in this.modules) {
                if (this.modules[key].always_on)
                    this.servers[server.id].enable_module(key);

                if (this.modules[key].default_on)
                    this.servers[server.id].enable_module(key);
            }
        }).catch(err => {
            this.log(err);
        });

        this.servers_internal.push(this.servers[server.id]);
    }

    on_server_deleted(server) {
        if (!this.connected || !this.ready)
            return;

        this.log("Left server '" + server.name + "'.");

        stats.update("num_servers", this.discord.guilds.array().length);

        delete this.servers_internal[this.servers_internal.indexOf(this.servers[server.id])];
        delete this.servers[server.id];
    }

    on_disconnected() {
        this.connected = false;

        this.log("Disconnected from discord.");
    }

    on_error(err) {
        this.log("Discord error: " + err);
    }

    handle_message(message) {
        var server = null;
        var key;

        if (message.channel.type !== "dm") {
            server = this.servers[message.channel.guild.id];
            if (server === null || server === undefined)
                return;
        }

        message.user = users.get_user(message.author, server);
        message.server = server;

        //Is the server blacklisted
        if (this.is_server_blacklisted(server.id))
            return;

        //Is the user blacklisted/ignored
        if (this.is_user_blacklisted(message.user) || (message.server !== null && message.server.is_user_ignored(message.user)))
            return;

        if (message.author.id === this.discord.user.id)
            return;

        if (message.author.id !== this.discord.user.id && message.server !== null) {
            for (key in this.modules) {
                if (!server.is_module_enabled(key) && (this.modules[key].always_on === undefined || this.modules[key].always_on === false))
                    continue;

                if (this.modules[key].on_raw_message === undefined)
                    continue;

                this.modules[key].on_raw_message(message);
            }
        }

        if (message.content.toLowerCase().indexOf("sempai") === 0 || message.content.indexOf("-") === 0) {
            var msg = message.content;
            if (msg.toLowerCase().indexOf("sempai") === 0) {
                msg = msg.substr("sempai".length + 1).replace(/\s+/g, " ").trim();
            } else {
                msg = msg.substr(1).replace(/\s+/g, " ").trim();
            }

            message.content = msg;
            var split = message.content.split(" ");
            var handled = false;
            var tmp = [];

            for (key in this.modules) {
                var resp = this.modules[key].check_message(server, message, split);

                if (typeof resp === "string") {
                    tmp.push(resp);
                } else if (resp) {
                    handled = true;
                    break;
                }
            }

            if (!handled && tmp.length > 0) {
                this.respond(message, responses.get("INCORRECT_FORMAT").format({ author: message.author.id, sample: tmp[0] }));
                handled = true;
            }

            if (!handled) {
                if (split.length === 1)
                    this.respond(message, responses.get("NAME").format({ author: message.author.id })).catch(err => console.log(err, err.stack));
                else
                    this.respond(message, responses.get("UNKNOWN_COMMAND").format({ author: message.author.id })).catch(err => console.log(err, err.stack));
            }
        }
    }

    blacklist_user(user) {
        this.user_blacklist.value.blacklist.push(user.user_id);
        this.user_blacklist.save().catch(err => {
            this.log(err);
        });
    }

    blacklist_server(server_id) {
        this.message(responses.get("INFORM_SERVER_BLACKLISTED"), this.servers[server_id]);
        this.server_blacklist.value.blacklist.push(server_id);
        this.server_blacklist.save().catch(err => {
            this.log(err);
        });
    }

    whitelist_user(user) {
        var idx = this.user_blacklist.value.blacklist.indexOf(user.user_id);
        if (idx === -1)
            return false;

        this.user_blacklist.value.blacklist.splice(idx, 1);
        this.user_blacklist.save().catch(err => {
            this.log(err);
        });

        return true;
    }

    whitelist_server(server_id) {
        var idx = this.server_blacklist.value.blacklist.indexOf(server_id);
        if (idx === -1)
            return false;

        this.server_blacklist.value.blacklist.splice(idx, 1);
        this.server_blacklist.save().catch(err => {
            this.log(err);
        });

        this.message(responses.get("INFORM_SERVER_WHITELISTED"), this.servers[server_id]);
        return true;
    }

    is_user_blacklisted(user) {
        return this.user_blacklist.value.blacklist.indexOf(user.user_id) !== -1;
    }

    is_server_blacklisted(server_id) {
        return this.server_blacklist.value.blacklist.indexOf(server_id) !== -1;
    }

    get_internal_server_id(server) {
        var id = this.servers_internal.indexOf(server);
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
        return users.get_user_by_id(this.discord.user.id);
    }
}

if (require.main === module) {
    var bot = new Bot();
    bot.login();
} else {
    module.exports = Bot;
}