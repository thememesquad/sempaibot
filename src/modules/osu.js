"use strict";

const lodash = require("lodash"),
    Document = require("camo").Document,
    Discord = require("discord.js"),

    config = require("../../config.js"),
    responses = require("../responses.js"),
    permissions = require("../permissions.js"),
    stats = require("../stats.js"),
    ModuleBase = require("../modulebase.js"),
    LoadBalancer = require("../loadbalancer.js"),
    util = require("../util.js"),
    moment = require("moment-timezone"),
    co = require("co"),

    USER_UPDATE_INTERVAL = 1200000,
    BEST_UPDATE_INTERVAL = 60000,
    CURRENT_DB_VERSION = 3,
    MOD_LIST = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];

function getMinutes() {
    return (new Date()).getMinutes();
}

class OsuMode {
    static get Standard() { return 0; }
    static get Taiko() { return 1; }
    static get CatchTheBeat() { return 2; }
    static get Mania() { return 3; }

    static to_string(m) {
        if (m === OsuMode.Standard)
            return "standard";
        else if (m === OsuMode.Taiko)
            return "taiko";
        else if (m === OsuMode.CatchTheBeat)
            return "catch the beat";
        else if (m === OsuMode.Mania)
            return "osu!mania";

        return "standard";
    }
}

class OsuUser extends Document {
    constructor() {
        super();

        this.user_id = String;
        this.username = String;
        this.pp = Number;
        this.rank = Number;
        this.last_updated = Number;
        this.last_checked = Number;
        this.servers = [String];
        this.records = [Object];
        this.db_version = Number;
        this.mode = Number;
        this.extra = [Object];
    }
}

class OsuModuleV2 extends ModuleBase {
    constructor() {
        super();

        this.name = "osu!";
        this.description = [
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to fanboy about Cookiezi, or make fun of your friend for setting a new PP score with bad acc!",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Who needs /r/osugame when you have this?",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! This is like /r/osugame, but automated and with worse memes. I tried, okay.",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Just don't follow everyone on osu! because Peppy will get angry at us."
        ];
        this.default_on = true;

        this.users = [];
        this.stats = {
            last: 0,
            last_minute: getMinutes()
        };
        this.pending_api_calls = [];
        this.load_balancer = new LoadBalancer(60);

        stats.register("osu_api_calls", 0, true);
        stats.register("osu_num_users", 0);

        permissions.register("OSU_CHANGE_LIMIT", "superadmin");
        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");
    }
}

class OsuModule extends ModuleBase {
    constructor() {
        super();

        this.name = "osu!";
        this.description = [
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to fanboy about Cookiezi, or make fun of your friend for setting a new PP score with bad acc!",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Who needs /r/osugame when you have this?",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! This is like /r/osugame, but automated and with worse memes. I tried, okay.",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Just don't follow everyone on osu! because Peppy will get angry at us."
        ];
        this.last_checked = -1;
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
        this.stats = {
            last: 0,
            last_minute: (new Date()).getMinutes()
        };
        this.pending = [];
        this.servers = {};
        this.default_on = true;
        this.load_balancer = new LoadBalancer(60);

        stats.register("osu_api_calls", 0, true);
        stats.register("osu_num_users", 0);

        permissions.register("OSU_CHANGE_LIMIT", "superadmin");
        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");

        this.add_command({
            match: message => {
                if (!message.content.startsWith("set osu limit to"))
                    return null;

                let split = message.content.split(" ");
                if (split.length < 6) {
                    message.almost = true;
                    return null;
                }

                let limit = parseInt(split[4]);
                let server = parseInt(split[6]);

                return [limit, server];
            },
            sample: "sempai set osu limit to __*limit*__ for __*server*__",
            description: "Changes the osu server limit",
            permission: "OSU_CHANGE_LIMIT",
            global: true,

            execute: this.handle_set_limit
        });

        this.add_command({
            match: message => {
                if (!message.content.startsWith("what is my osu limit"))
                    return null;

                return [];
            },
            sample: "sempai what is my osu limit?",
            description: "Displays this servers osu limit",
            permission: null,
            global: false,

            execute: this.handle_show_limit
        });

        this.add_command({
            match: message => {
                let messages = [
                    "who are you following",
                    "who do you follow",
                    "list following",
                    "list follows",
                    "show follow list",
                    "show followlist",
                    "show following list",
                    "show follows list"
                ];

                for (let i = 0; i < messages.length; i++) {
                    if (message.content.startsWith(messages[i])) {
                        let tmp = message.content.substr(messages[i].length + 1);
                        let mode = OsuMode.Standard;

                        if (tmp.length !== 0) {
                            tmp = tmp.trim();
                            if (tmp.toLowerCase().endsWith("standard")) {
                                mode = OsuMode.Standard;
                                tmp = tmp.substr(0, tmp.lastIndexOf("standard"));
                            } else if (tmp.toLowerCase().endsWith("taiko")) {
                                mode = OsuMode.Taiko;
                                tmp = tmp.substr(0, tmp.lastIndexOf("taiko"));
                            } else if (tmp.toLowerCase().endsWith("mania")) {
                                mode = OsuMode.Mania;
                                tmp = tmp.substr(0, tmp.lastIndexOf("mania"));
                            } else if (tmp.toLowerCase().endsWith("ctb")) {
                                mode = OsuMode.CatchTheBeat;
                                tmp = tmp.substr(0, tmp.lastIndexOf("ctb"));
                            }
                        }

                        return [mode];
                    }
                }

                return null;
            },
            sample: "sempai who are you following __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Lists all the people I'm following on osu!",
            permission: null,
            global: false,

            execute: this.handle_list_following
        });

        this.add_command({
            match: message => {
                let messages = [
                    "follow",
                    "stalk"
                ];

                for (let i = 0; i < messages.length; i++) {
                    if (message.content.startsWith(messages[i])) {
                        let tmp = message.content.substr(messages[i].length + 1);
                        if (tmp.length === 0) {
                            message.almost = true;
                            return null;
                        }

                        let mode = OsuMode.Standard;
                        tmp = tmp.trim();
                        if (tmp.toLowerCase().endsWith("standard")) {
                            mode = OsuMode.Standard;
                            tmp = tmp.substr(0, tmp.lastIndexOf("standard"));
                        } else if (tmp.toLowerCase().endsWith("taiko")) {
                            mode = OsuMode.Taiko;
                            tmp = tmp.substr(0, tmp.lastIndexOf("taiko"));
                        } else if (tmp.toLowerCase().endsWith("mania")) {
                            mode = OsuMode.Mania;
                            tmp = tmp.substr(0, tmp.lastIndexOf("mania"));
                        } else if (tmp.toLowerCase().endsWith("ctb")) {
                            mode = OsuMode.CatchTheBeat;
                            tmp = tmp.substr(0, tmp.lastIndexOf("ctb"));
                        }

                        return [tmp.trim(), mode];
                    }
                }

                return null;
            },
            sample: "sempai follow __*osu! username or id*__ __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Adds the specified person to my following list for osu!",
            permission: "OSU_FOLLOW",
            global: false,

            execute: this.handle_follow
        });

        this.add_command({
            match: message => {
                let messages = [
                    "stop following",
                    "stop stalking",
                    "unfollow"
                ];

                for (let i = 0; i < messages.length; i++) {
                    if (message.content.startsWith(messages[i])) {
                        let tmp = message.content.substr(messages[i].length + 1);
                        if (tmp.length === 0) {
                            message.almost = true;
                            return null;
                        }

                        let mode = OsuMode.Standard;
                        tmp = tmp.trim();
                        if (tmp.toLowercase().endsWith("standard")) {
                            mode = OsuMode.Standard;
                            tmp = tmp.substr(0, tmp.lastIndexOf("standard"));
                        } else if (tmp.toLowerCase().endsWith("taiko")) {
                            mode = OsuMode.Taiko;
                            tmp = tmp.substr(0, tmp.lastIndexOf("taiko"));
                        } else if (tmp.toLowerCase().endsWith("mania")) {
                            mode = OsuMode.Mania;
                            tmp = tmp.substr(0, tmp.lastIndexOf("mania"));
                        } else if (tmp.toLowerCase().endsWith("ctb")) {
                            mode = OsuMode.CatchTheBeat;
                            tmp = tmp.substr(0, tmp.lastIndexOf("ctb"));
                        }

                        return [tmp.trim(), mode];
                    }
                }

                return null;
            },
            sample: "sempai stop following __*osu! username or id*__ __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Removes the specified person from my following list for osu!",
            permission: "OSU_UNFOLLOW",
            global: false,

            execute: this.handle_unfollow
        });

        this.add_command({
            match: message => {
                if (!message.content.startsWith("test"))
                    return null;
                //"**{user}** has set a new #**{top_rank}** PP score! **{map_artist} - {map_title} [{map_diff_name}] {mods}** {additional} | **{acc}%** | **{pp}pp** | **Rank: {rank}** | **{old_total_pp}pp** -> **{new_total_pp}pp** ({delta_pp}) | #**{old_rank}** -> #**{new_rank}**! ({delta_rank})\r\nMap link: https://osu.ppy.sh/b/{beatmap_id}",

                return [this.users[4], {
                    user: "Ichiroku",
                    top_rank: 1,
                    map_artist: "CHiCO with HoneyWorks",
                    map_title: "color",
                    map_diff_name: "Waiting in the Rain",
                    mods: "",
                    additional: "",
                    acc: "98.13",
                    pp: 168,
                    rank: "S",
                    new_rank: 42000,
                    old_rank: 43000,
                    delta_rank: 1000,
                    old_total_pp: 2852,
                    new_total_pp: 2952,
                    delta_pp: 100,
                    beatmap_id: 817174
                }];
            },
            sample: "sempai stop following __*osu! username or id*__ __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Removes the specified person from my following list for osu!",
            permission: "OSU_UNFOLLOW",
            global: false,
            execute: this.handle_embed_test
        });

        this.add_command({
            match: message => {
                if (!message.content.startsWith("check"))
                    return null;

                let tmp = message.content.substr("check".length + 1);
                if (tmp.length === 0) {
                    message.almost = true;
                    return null;
                }

                let mode = OsuMode.Standard;
                tmp = tmp.trim();
                if (tmp.toLowerCase().endsWith("standard")) {
                    mode = OsuMode.Standard;
                    tmp = tmp.substr(0, tmp.lastIndexOf("standard"));
                } else if (tmp.toLowerCase().endsWith("taiko")) {
                    mode = OsuMode.Taiko;
                    tmp = tmp.substr(0, tmp.lastIndexOf("taiko"));
                } else if (tmp.toLowerCase().endsWith("mania")) {
                    mode = OsuMode.Mania;
                    tmp = tmp.substr(0, tmp.lastIndexOf("mania"));
                } else if (tmp.toLowerCase().endsWith("ctb")) {
                    mode = OsuMode.CatchTheBeat;
                    tmp = tmp.substr(0, tmp.lastIndexOf("ctb"));
                }

                return [tmp.trim(), mode];
            },
            sample: "sempai check __*osu! username or id*__ __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Forces Sempai to check the specified person for scores that Sempai may have somehow missed.",
            permission: "OSU_CHECK",
            global: false,

            execute: this.handle_check
        });

        this.api_stats = setInterval(() => {
            let curr = (new Date()).getMinutes();

            if (this.stats.last_minute !== curr) {
                stats.update("osu_api_calls", this.stats.last);

                this.stats.last = 0;
                this.stats.last_minute = curr;
            }
        }, 10);
    }

    handle_embed_test(message, profile, record) {
        this.on_new_record(profile, record);
    }

    handle_set_limit(message, limit, serverID) {
        let server = this.bot.get_server_internal(serverID - 1);
        if (server === null) {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({ author: message.author.id, id: serverID }));
        }

        let old_limit = server.config.value.osu_limit;
        server.config.value.osu_limit = limit;
        server.config.save().catch(err => console.log("error saving new config: ", err));

        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT_CHANGED").format({ author: message.author.id, old_limit: old_limit, new_limit: limit, server_name: server.server.name }));
    }

    handle_show_limit(message) {
        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT").format({ author: message.author.id, limit: message.server.config.value.osu_limit }));
    }

    handle_list_following(message, mode) {
        if (this.users.length === 0)
            return this.bot.respond(message, responses.get("OSU_FOLLOWING_EMPTY"));

        let users = lodash.clone(this.users);
        users.sort((a, b) => {
            return b.pp - a.pp;
        });

        let data = [];
        for (let i in users) {
            //Check if the server is actually following this player
            if (users[i].servers.indexOf(message.server.id) === -1)
                continue;

            if (users[i].mode !== mode)
                continue;

            data.push({
                rank: "#" + users[i].rank,
                name: users[i].username,
                pp: users[i].pp.toFixed(1) + "pp"
            });
        }

        if (data.length === 0) {
            this.bot.respond(message, responses.get("OSU_FOLLOW_LIST_EMPTY").format({ author: message.author.id }));
        } else {
            if (mode === OsuMode.Standard) {
                let messages = util.generate_table(responses.get("OSU_FOLLOWING").format({ author: message.author.id }), {
                    rank: "Rank",
                    name: "Name",
                    pp: "PP"
                }, data);
                this.bot.respond_queue(message, messages);
            } else {
                let messages = util.generate_table(responses.get("OSU_FOLLOWING_MODE").format({
                    author: message.author.id,
                    mode: OsuMode.to_string(mode)
                }), {
                    rank: "Rank",
                    name: "Name",
                    pp: "PP"
                }, data);
                this.bot.respond_queue(message, messages);
            }
        }
    }

    handle_follow(message, name, mode) {
        this.check_user(name, message, mode);
    }

    handle_unfollow(message, user, mode) {
        let i = -1;
        for (let j in this.users) {
            let user = this.users[j];
            if (user.username.toLowerCase() === user.toLowerCase() || user.user_id === user.toLowerCase()) {
                if (this.users[j].mode === mode) {
                    i = j;
                    break;
                }
            }
        }

        if (i === -1) {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({
                author: message.author.id,
                user: user
            }));
        }

        let profile = this.users[i];
        if (profile.servers.indexOf(message.server.id) === -1) {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({
                author: message.author.id,
                user: user
            }));
        }

        if (profile.servers.length === 1) {
            this.users.splice(i, 1);
            OsuUser.deleteOne({ user_id: profile.user_id }, {}, () => {});
        } else {
            profile.servers.splice(profile.servers.indexOf(message.server.id), 1);
            OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { servers: profile.servers }, {});
        }

        if (mode === OsuMode.Standard) {
            this.bot.respond(message, responses.get("OSU_STOPPED").format({
                author: message.author.id,
                user: profile.username
            }));
        } else {
            this.bot.respond(message, responses.get("OSU_STOPPED_MODE").format({
                author: message.author.id,
                user: profile.username,
                mode: OsuMode.to_string(mode)
            }));
        }
    }

    handle_check(message, user, mode) {
        this.force_check(user, message, false, false, mode);
    }

    on_new_record(profile, record) {
        for (let i = 0; i < profile.servers.length; i++) {
            let server = this.servers[profile.servers[i]];

            if (server === undefined)
                continue;

            let embed = new Discord.RichEmbed()
                .setTitle(`${record.user} has set a #${record.top_rank} score!`)
                .setThumbnail(`https://a.ppy.sh/${profile.user_id}_${Date.now()}.png`)
                .setColor("#4ec1ff")
                .setDescription(`**${record.map_artist} - ${record.map_title} [${record.map_diff_name}] ${record.mods}**`)
                .addField(`Score`, `**${record.acc}%** | **${record.pp}pp** | **Rank: ${record.rank}** ${record.additional}`, false);

            if (record.delta_pp === 0)
                embed.addField(`PP Changes`, `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (no gain)`, true);
            else
                embed.addField(`PP Changes`, `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (+${record.delta_pp}pp)`, true);

            if (record.delta_rank === 0)
                embed.addField(`Rank Changes`, `#**${record.old_rank}** -> #**${record.new_rank}**! (no gain)`, false)
            else
                embed.addField(`PP Changes`, `#**${record.old_rank}** -> #**${record.new_rank}**! (${record.delta_rank} gain)`, true);

            embed.addField(`Map links`, `[Map link](https://osu.ppy.sh/b/${record.beatmap_id}) | [Osu direct](osu://b/${record.beatmap_id})`, false)
                .addField(`\u200b`, `This score has been tracked by [Sempaibot!](http://sempai.moe) | Follow us [@sempaibot](https://twitter.com/osusempaibot)`);

            this.bot.embed(embed, server);
        }
    }

    get_check_interval(user, time) {
        if (user.last_record === -1)
            return BEST_UPDATE_INTERVAL;

        let num = Math.ceil((time - user.last_record) / (60 * 1000));
        let times = Math.min(num / 30, 5);

        //todo: add an extra case for people who haven't gotten a record in a few days.

        return times * BEST_UPDATE_INTERVAL;

        //Disabled for now since it wasn't working.
        //return BEST_UPDATE_INTERVAL;
    }

    get_user_update_interval(user, time) {
        if (user.last_record === -1)
            return USER_UPDATE_INTERVAL;

        let num = Math.ceil((time - user.last_record) / (60 * 1000));
        let times = Math.min(num / 30, 5);

        //todo: add an extra case for people who haven't gotten a record in a few days.

        return times * USER_UPDATE_INTERVAL;

        //Disabled for now since it wasn't working.
        //return USER_UPDATE_INTERVAL;
    }

    migrate_user(user) {
        if (user.db_version === CURRENT_DB_VERSION)
            return;

        let i, record, tmpdate;

        console.log("Migrating user '" + user.username + "' from db '" + user.db_version + "' to '" + CURRENT_DB_VERSION + "'.");

        if (user.db_version === undefined) {
            for (i = 0; i < user.records.length; i++) {
                record = user.records[i];

                tmpdate = new Date(record.date).toUTCString();
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                record.date = new Date(tmpdate + " UTC+8").valueOf();

                user.records[i] = record;
            }

            user.db_version = 1;
        }

        if (user.db_version === 1) {
            for (i = 0; i < user.records.length; i++) {
                record = user.records[i];

                tmpdate = new Date(record.date + (8 * 60 * 1000)).toString();
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                record.date = moment(new Date(tmpdate + " UTC")).subtract(8, "hours").toDate().valueOf();

                user.records[i] = record;
            }

            user.db_version = 2;
        }

        if (user.db_version === 2) {
            user.mode = OsuMode.Standard;
            user.extra = {};

            user.db_version = 3;
        }
    }

    on_setup(bot) {
        this.bot = bot;
        this.check = setInterval(() => {
            let time = Date.now();
            let user = null;

            for (let i = 0; i < this.users.length; i++) {
                user = this.users[i];
                if ((time - user.last_checked) >= this.get_check_interval(user, time))
                    this.force_check(user.username, null, false, false, user.mode);
            }

            for (let i = 0; i < this.users.length; i++) {
                if ((time - this.users[i].last_updated) >= this.get_user_update_interval(user, time))
                    this.update_user(this.users[i]);
            }
        }, 10);

        OsuUser.find({}).then(docs => {
            for (let i = 0; i < docs.length; i++) {
                let records = [];
                for (let j = 0; j < docs[i].records.length; j++) {
                    records.push(docs[i].records[j]);
                }

                let user = {
                    user_id: docs[i].user_id,
                    username: docs[i].username,
                    pp: docs[i].pp,
                    rank: docs[i].rank,
                    last_updated: docs[i].last_updated,
                    last_checked: docs[i].last_checked || Date.now(),
                    servers: docs[i].servers,
                    last_record: -1,
                    update_in_progress: null,
                    records: records,
                    checking: false,
                    db_version: docs[i].db_version,
                    mode: docs[i].mode || OsuMode.Standard,
                    extra: docs[i].extra || {}
                };

                if (docs[i].db_version !== CURRENT_DB_VERSION) {
                    this.migrate_user(user);
                }

                this.users.push(user);

                let time = Date.now();
                if (user.last_updated === undefined || time - user.last_updated >= this.get_user_update_interval(user, time)) {
                    this.update_user(user);
                }
            }

            stats.update("osu_num_users", this.users.length);
        }).catch(err => console.log("OsuUser.find: " + err));
    }

    on_shutdown() {
        clearInterval(this.check);
        clearInterval(this.api_stats);

        for (let i = 0; i < this.pending.length; i++) {
            this.load_balancer.cancel(this.pending[i]);
        }
    }

    on_load(server) {
        if (this.servers[server.id] !== undefined)
            return;

        this.servers[server.id] = server;
    }

    on_unload(server) {
        if (this.servers[server.id] === undefined)
            return;

        delete this.servers[server.id];
    }

    log_call() {
        let curr = (new Date()).getMinutes();

        if (this.stats.last_minute !== curr) {
            stats.update("osu_api_calls", this.stats.last);

            this.stats.last = 0;
            this.stats.last_minute = curr;
        }

        this.stats.last++;
    }

    api_call(method, params, first, num) {
        return new Promise((resolve, reject) => {
            num = (num === undefined) ? 0 : num;

            first = (first === undefined) ? true : first;
            let url = (method.startsWith("http:") ?
                method :
                (typeof config.osu_api_url !== "undefined") ?
                config.osu_api_url + method :
                "http://osu.ppy.sh/api/" + method
            ) + "?k=" + config.osu_api;

            for (let key in params) {
                url += "&" + key + "=" + params[key];
            }

            this.pending.push(this.load_balancer.create(url).then(obj => {
                this.log_call();

                let body = obj.body;

                try {
                    let data = JSON.parse(body);
                    if (first) {
                        data = data[0];
                    }

                    return resolve(data);
                } catch (e) {
                    if (num === 4)
                        return reject(e);

                    this.api_call(method, params, first, num + 1).then(result => {
                        resolve(result);
                    }).catch(err => reject(err));
                }
            }).catch(err => reject(err)));
        });
    }

    get_user(username, mode) {
        mode = mode || OsuMode.Standard;

        return this.api_call("get_user", { u: username, m: mode });
    }

    get_beatmaps(id) {
        return this.api_call("http://osu.ppy.sh/api/get_beatmaps", { b: id });
    }

    get_user_best(id, mode, limit) {
        mode = mode || OsuMode.Standard;

        return this.api_call("get_user_best", { u: id, m: mode, limit: limit, type: "id" }, false);
    }

    calculate_accuracy(beatmap, mode) {
        if (mode === OsuMode.Taiko) {
            let totalPointOfHits = (beatmap.count100 * 0.5 + beatmap.count300 * 1) * 300;
            let totalNumberOfHits = beatmap.countmiss + beatmap.count100 + beatmap.count300;

            return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
        } else if (mode === OsuMode.CatchTheBeat) {
            let totalPointOfHits = beatmap.count50 + beatmap.count100 + beatmap.count300;
            let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300 + beatmap.countkatu;

            return ((totalPointOfHits / totalNumberOfHits) * 100).toFixed(2);
        } else if (mode === OsuMode.Mania) {
            let totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.countkatu * 200 + beatmap.count300 * 300;
            let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.countkatu + beatmap.count300;

            return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
        }

        let totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
        let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

        return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
    }

    force_check(_username, _message, _no_report, _force, _mode) {
        let username = _username;
        let message = _message || null;
        let no_report = _no_report || false;
        let force = _force || false;
        let mode = _mode || OsuMode.Standard;

        let profile = null;
        for (let i in this.users) {
            let user = this.users[i];

            if (user.username.toLowerCase() === username.toLowerCase() || user.user_id === username.toLowerCase()) {
                if (user.mode !== mode)
                    continue;

                profile = this.users[i];
                break;
            }
        }

        if (profile === null) {
            if (message) {
                this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({
                    author: message.author.id,
                    user: username
                }));
            }

            return;
        }

        if (message) {
            if (profile.mode === OsuMode.Standard) {
                this.bot.respond(message, responses.get("OSU_CHECK").format({
                    author: message.author.id,
                    user: profile.username
                }));
            } else {
                this.bot.respond(message, responses.get("OSU_CHECK_MODE").format({
                    author: message.author.id,
                    user: profile.username,
                    mode: OsuMode.to_string(profile.mode)
                }));
            }
        }

        if (!force && profile.checking)
            return;

        profile.checking = true;

        let topRank;
        co(function*() {
            let json = yield this.get_user_best(profile.user_id, profile.mode, 50);
            for (let j = 0; j < json.length; j++) {
                let beatmap = json[j];
                beatmap.count50 = parseInt(beatmap.count50);
                beatmap.count100 = parseInt(beatmap.count100);
                beatmap.count300 = parseInt(beatmap.count300);
                beatmap.countmiss = parseInt(beatmap.countmiss);
                beatmap.countkatu = parseInt(beatmap.countkatu);
                beatmap.countgeki = parseInt(beatmap.countgeki);
                beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
                beatmap.perfect = parseInt(beatmap.perfect);
                beatmap.pp = Math.round(parseFloat(beatmap.pp));
                beatmap.acc = this.calculate_accuracy(beatmap, mode);

                if (["X", "XH"].indexOf(beatmap.rank) !== -1)
                    beatmap.rank = "SS";
                else if (beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                for (let i = 0; i < 16; i++) {
                    if ((beatmap.enabled_mods & (1 << i)) > 0)
                        if (i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
                            beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + this.modsList[i];
                }

                let skip = false;
                let index = -1;
                let date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();

                profile.last_record = Math.max(profile.last_record, date);

                for (let i = 0; i < profile.records.length; i++) {
                    if (profile.records[i].beatmap_id === beatmap.beatmap_id) {
                        index = i;
                        if (profile.records[i].date === date) {
                            skip = true;
                            break;
                        }
                    }
                }

                if (!skip) {
                    topRank = j + 1;

                    if (index === -1) {
                        profile.records.push({ date: date, beatmap_id: beatmap.beatmap_id });
                    } else {
                        profile.records[index].date = date;
                    }

                    if (!no_report) {
                        let beatmap_info = yield this.get_beatmaps(beatmap.beatmap_id);
                        let user_data = yield this.update_user(profile, profile.mode);

                        let oldTotalpp = parseFloat(profile.pp);
                        let newTotalpp = parseFloat(user_data.pp_raw);
                        let deltapp = user_data.pp_raw - profile.pp;
                        let oldRank = profile.rank;
                        let deltaRank = user_data.pp_rank - profile.rank;

                        let newRank = profile.rank = parseInt(user_data.pp_rank);
                        profile.pp = parseFloat(user_data.pp_raw);

                        beatmap.additional = "";
                        if (beatmap.perfect === 0) {
                            if (beatmap_info.max_combo === null)
                                beatmap_info.max_combo = "err";

                            beatmap.additional = "| **" + beatmap.maxcombo + "/" + beatmap_info.max_combo + "** " + beatmap.countmiss + "x Miss";
                        }

                        let announcement = {
                            user: profile.username,
                            beatmap_id: beatmap.beatmap_id,
                            pp: beatmap.pp,
                            rank: beatmap.rank,
                            acc: beatmap.acc,
                            mods: beatmap.mods,
                            map_artist: beatmap_info.artist,
                            map_title: beatmap_info.title,
                            map_diff_name: beatmap_info.version,
                            additional: beatmap.additional,
                            top_rank: topRank,
                            old_total_pp: oldTotalpp.toFixed(2),
                            new_total_pp: newTotalpp.toFixed(2),
                            delta_pp: deltapp,
                            old_rank: oldRank,
                            new_rank: newRank,
                            delta_rank: deltaRank,
                            mode: OsuMode.to_string(profile.mode)
                        };

                        this.on_new_record(profile, announcement);
                    }
                }
            }

            profile.last_checked = (new Date()).getTime();
            OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { db_version: CURRENT_DB_VERSION, records: profile.records, last_checked: profile.last_checked }, {});

            profile.checking = false;
        }.bind(this));
    }

    check_user(_username, _message, mode) {
        let username = _username;
        let message = _message || null;

        let profile = null;
        let num = 0;

        for (let i in this.users) {
            let user = this.users[i];
            if (user.username.toLowerCase() === username.toLowerCase() || user.user_id === username.toLowerCase()) {
                if (this.users[i].mode === mode) {
                    profile = this.users[i];
                }
            }

            if (this.users[i].servers.indexOf(message.server.id) !== -1)
                num++;
        }

        if (profile !== null) {
            if (profile.servers.indexOf(message.server.id) === -1) {
                profile.servers.push(message.server.id);
                OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { servers: profile.servers }, {});

                if (mode === OsuMode.Standard) {
                    return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({
                        author: message.author.id,
                        user: profile.username
                    }));
                } else {
                    return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING_MODE").format({
                        author: message.author.id,
                        user: profile.username,
                        mode: OsuMode.to_string(mode)
                    }));
                }
            }

            if (mode === OsuMode.Standard) {
                return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING").format({
                    author: message.author.id,
                    user: profile.username
                }));
            } else {
                return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING_MODE").format({
                    author: message.author.id,
                    user: profile.username,
                    mode: OsuMode.to_string(mode)
                }));
            }
        }

        if (num === message.server.config.value.osu_limit) {
            return this.bot.respond(message, responses.get("OSU_MAX_USER_LIMIT").format({
                author: message.author.id,
                limit: message.server.config.value.osu_limit,
                user: profile.username
            }));
        }

        this.get_user(username, mode).then(json => {
            if (json === undefined || json.username === undefined) {
                if (message !== undefined) {
                    if (mode === OsuMode.Standard) {
                        this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND").format({
                            author: message.author.id,
                            user: username
                        }));
                    } else {
                        this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND_MODE").format({
                            author: message.author.id,
                            user: username,
                            mode: mode
                        }));
                    }
                }

                return;
            }

            let time = Date.now();
            let user = {
                user_id: json.user_id,
                username: json.username,
                pp: Number(json.pp_raw),
                rank: Number(json.pp_rank),
                servers: [message.server.id],
                update_in_progress: null,
                last_checked: time,
                last_updated: time,
                records: [],
                last_record: -1,
                checking: false,
                db_version: CURRENT_DB_VERSION,
                mode: mode,
                extra: json
            };
            this.users.push(user);

            stats.update("osu_num_users", this.users.length);

            let dbuser = OsuUser.create(user);
            dbuser.save().then(() => {
                this.force_check(user.username, null, true, false, mode);

                if (mode === OsuMode.Standard) {
                    this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({
                        author: message.author.id,
                        user: json.username
                    }));
                } else {
                    this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING_MODE").format({
                        author: message.author.id,
                        user: json.username,
                        mode: OsuMode.to_string(mode)
                    }));
                }
            }).catch(err => console.log(err, err.stack));
        }).catch(err => console.log("get_user: ", err, err.stack));
    }

    update_user(_profile) {
        let profile = _profile;

        if (profile.update_in_progress !== null)
            return profile.update_in_progress;

        let promise = new Promise((resolve, reject) => {
            this.get_user(profile.username, profile.mode).then(data => {
                profile.last_updated = Date.now();

                OsuUser.findOneAndUpdate({ user_id: profile.user_id }, {
                    db_version: CURRENT_DB_VERSION,
                    user_id: data.user_id,
                    pp: parseFloat(data.pp_raw),
                    rank: parseInt(data.pp_rank),
                    last_updated: profile.last_updated,
                    extra: data
                }).then(() => {
                    resolve(data);
                    profile.update_in_progress = null;
                }).catch(err => {
                    reject(err);
                    profile.update_in_progress = null;
                });
            }).catch(err => {
                reject(err);
                profile.update_in_progress = null;
            });
        });

        profile.update_in_progress = promise;
        return profile.update_in_progress;
    }
}

module.exports = new OsuModule();