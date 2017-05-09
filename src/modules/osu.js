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
    CommandProcessor = require("../command.js"),

    USER_UPDATE_INTERVAL = 1200000,
    BEST_UPDATE_INTERVAL = 60000,
    CURRENT_DB_VERSION = 3;

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

        stats.register("osu_api_calls", 0);
        stats.register("osu_num_users", 0);

        permissions.register("OSU_CHANGE_LIMIT", "superadmin");
        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");

        CommandProcessor.add_custom_type("osumode", msg => {
            let tmp = msg.toLowerCase();
            if (tmp.endsWith("standard")) {
                return OsuMode.Standard;
            } else if (tmp.endsWith("taiko")) {
                return OsuMode.Taiko;
            } else if (tmp.endsWith("mania")) {
                return OsuMode.Mania;
            } else if (tmp.endsWith("ctb")) {
                return OsuMode.CatchTheBeat;
            }

            return OsuMode.Standard;
        });

        this.add_command({
            formats: [
                "set osu limit to {int!limit} for {int!server}"
            ],
            sample: "set osu limit to __*limit*__ for __*server*__",
            description: "Changes the osu server limit",
            permission: "OSU_CHANGE_LIMIT",
            global: true,

            execute: this.handle_set_limit
        });

        this.add_command({
            formats: [
                "what is my osu limit",
                "osu limit"
            ],
            sample: "what is my osu limit",
            description: "Displays this servers osu limit",
            permission: null,
            global: false,

            execute: this.handle_show_limit
        });

        this.add_command({
            defaults: {mode: OsuMode.Standard},
            formats: [
                "who are you following <in {osumode!mode}>",
                "who do you follow <in {osumode!mode}>",
                "list following <in {osumode!mode}>",
                "list follows <in {osumode!mode}>",
                "show follow list <in {osumode!mode}>",
                "show followlist <in {osumode!mode}>",
                "show following list <in {osumode!mode}>",
                "show follows list <in {osumode!mode}>",
            ],
            sample: "who are you following in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Lists all the people I'm following on osu!",
            permission: null,
            global: false,

            execute: this.handle_list_following
        });

        this.add_command({
            defaults: { mode: OsuMode.Standard },
            formats: [
                "follow {user} <in {osumode!mode}>",
                "stalk {user} <in {osumode!mode}>",
            ],
            sample: "follow __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Adds the specified person to my following list for osu!",
            permission: "OSU_FOLLOW",
            global: false,

            execute: this.handle_follow
        });

        this.add_command({
            defaults: { mode: OsuMode.Standard },
            formats: [
                "stop following {user} <in {osumode!mode}>",
                "stop stalking {user} <in {osumode!mode}>",
                "unfollow {user} <in {osumode!mode}>",
            ],
            sample: "stop following __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Removes the specified person from my following list for osu!",
            permission: "OSU_UNFOLLOW",
            global: false,

            execute: this.handle_unfollow
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

    handle_set_limit(message, args) {
        let server = this.bot.get_server_internal(args.server - 1);
        if (server === null) {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({ 
                author: message.author.id, 
                id: args.server 
            }));
        }

        let old_limit = server.config.value.osu_limit;
        server.config.value.osu_limit = args.limit;
        server.config.save().catch(err => console.log("error saving new config: ", err));

        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT_CHANGED").format({ 
            author: message.author.id, 
            old_limit: old_limit, 
            new_limit: args.limit, 
            server_name: server.server.name 
        }));
    }

    handle_show_limit(message, args) {
        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT").format({ 
            author: message.author.id, 
            limit: message.server.config.value.osu_limit 
        }));
    }

    handle_list_following(message, args) {
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

            if (users[i].mode !== args.mode)
                continue;

            data.push({
                rank: "#" + users[i].rank,
                name: users[i].username,
                pp: users[i].pp.toFixed(1) + "pp"
            });
        }

        if (data.length === 0) {
            this.bot.respond(message, responses.get("OSU_FOLLOW_LIST_EMPTY").format({ 
                author: message.author.id 
            }));
        } else {
            if (args.mode === OsuMode.Standard) {
                let messages = util.generate_table(responses.get("OSU_FOLLOWING").format({ 
                    author: message.author.id 
                }), {
                    rank: "Rank",
                    name: "Name",
                    pp: "PP"
                }, data);
                this.bot.respond_queue(message, messages);
            } else {
                let messages = util.generate_table(responses.get("OSU_FOLLOWING_MODE").format({
                    author: message.author.id,
                    mode: OsuMode.to_string(args.mode)
                }), {
                    rank: "Rank",
                    name: "Name",
                    pp: "PP"
                }, data);
                this.bot.respond_queue(message, messages);
            }
        }
    }

    async handle_follow(message, args) {
        let username = args.user;

        let profile = null;
        let num = 0;

        for (let i in this.users) {
            let user = this.users[i];
            if (user.username.toLowerCase() === username.toLowerCase() || user.user_id === username.toLowerCase()) {
                if (this.users[i].mode === args.mode) {
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

                if (args.mode === OsuMode.Standard) {
                    return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({
                        author: message.author.id,
                        user: profile.username
                    }));
                } else {
                    return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING_MODE").format({
                        author: message.author.id,
                        user: profile.username,
                        mode: OsuMode.to_string(args.mode)
                    }));
                }
            }

            if (args.mode === OsuMode.Standard) {
                return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING").format({
                    author: message.author.id,
                    user: profile.username
                }));
            } else {
                return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING_MODE").format({
                    author: message.author.id,
                    user: profile.username,
                    mode: OsuMode.to_string(args.mode)
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

        let json = await this.get_user(username, args.mode);
        if (json === undefined || json.username === undefined) {
            if (message !== undefined) {
                if (args.mode === OsuMode.Standard) {
                    this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND").format({
                        author: message.author.id,
                        user: username
                    }));
                } else {
                    this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND_MODE").format({
                        author: message.author.id,
                        user: username,
                        mode: args.mode
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
            mode: args.mode,
            extra: json
        };
        this.users.push(user);

        stats.update("osu_num_users", this.users.length);

        await OsuUser.create(user).save();

        this.force_check(user.username, null, true, false, args.mode);

        if (args.mode === OsuMode.Standard) {
            this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({
                author: message.author.id,
                user: json.username
            }));
        } else {
            this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING_MODE").format({
                author: message.author.id,
                user: json.username,
                mode: OsuMode.to_string(args.mode)
            }));
        }
    }

    handle_unfollow(message, args) {
        let i = -1;
        for (let j in this.users) {
            let user = this.users[j];
            if (user.username.toLowerCase() === args.user.toLowerCase() || user.user_id === args.user.toLowerCase()) {
                if (this.users[j].mode === args.mode) {
                    i = j;
                    break;
                }
            }
        }

        if (i === -1) {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({
                author: message.author.id,
                user: args.user
            }));
        }

        let profile = this.users[i];
        if (profile.servers.indexOf(message.server.id) === -1) {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({
                author: message.author.id,
                user: args.user
            }));
        }

        if (profile.servers.length === 1) {
            this.users.splice(i, 1);
            OsuUser.deleteOne({ user_id: profile.user_id }, {}, () => {});
        } else {
            profile.servers.splice(profile.servers.indexOf(message.server.id), 1);
            OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { servers: profile.servers }, {});
        }

        if (args.mode === OsuMode.Standard) {
            this.bot.respond(message, responses.get("OSU_STOPPED").format({
                author: message.author.id,
                user: profile.username
            }));
        } else {
            this.bot.respond(message, responses.get("OSU_STOPPED_MODE").format({
                author: message.author.id,
                user: profile.username,
                mode: OsuMode.to_string(args.mode)
            }));
        }
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
                .setURL(`https://osu.ppy.sh/u/${profile.user_id}`)
                .setDescription(`**${record.map_artist} - ${record.map_title} [${record.map_diff_name}] ${record.mods}**`)
                .addField("Score", `**${record.acc}%** | **${record.pp}pp** | **Rank: ${record.rank}** ${record.additional}`, false);

            if (record.delta_pp === "0.00")
                embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (no gain)`, true);
            else
                embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (+${record.delta_pp}pp)`, true);

            if (record.delta_rank === 0)
                embed.addField("Rank Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (no gain)`, false);
            else
                embed.addField("PP Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (${record.delta_rank} gain)`, true);

            embed.addField("Map links", `[Map link](https://osu.ppy.sh/b/${record.beatmap_id}) | [Osu direct](osu://b/${record.beatmap_id})`, false)
                .addField("\u200b", "This score has been tracked by [Sempaibot!](http://sempai.moe) | Follow us [@sempaibot](https://twitter.com/osusempaibot)");

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

    async on_setup() {
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

        let docs = await OsuUser.find({});
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

    async api_call(method, params, first, num) {
        num = (num === undefined) ? 0 : num;

        first = (first === undefined) ? true : first;
        let url = (method.startsWith("http:") ? method : (typeof config.osu.api_url !== "undefined") ?config.osu.api_url + method : "http://osu.ppy.sh/api/" + method) + "?k=" + config.osu.api_key;

        for (let key in params) {
            url += "&" + key + "=" + params[key];
        }

        let tmp = this.load_balancer.create(url);
        this.pending.push(tmp);
        
        let obj = await tmp;
        stats.update("osu_api_calls", 1);

        let body = obj.body;

        try {
            let data = JSON.parse(body);
            if (first) {
                data = data[0];
            }

            return data;
        } catch (e) {
            if (num === 4)
                throw e;

            return await this.api_call(method, params, first, num + 1);
        }
    }

    get_user(username, mode) {
        mode = mode || OsuMode.Standard;

        return this.api_call("get_user", { 
            u: username, m: mode 
        });
    }

    get_beatmaps(id) {
        return this.api_call("http://osu.ppy.sh/api/get_beatmaps", { 
            b: id 
        });
    }

    get_user_best(id, mode, limit) {
        mode = mode || OsuMode.Standard;

        return this.api_call("get_user_best", { 
            u: id, 
            m: mode, 
            limit: limit, 
            type: "id" 
        }, false);
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
            if (profile.mode === OsuMode.Standard)
                this.bot.respond(message, responses.get("OSU_CHECK").format({
                    author: message.author.id,
                    user: profile.username
                }));
            else
                this.bot.respond(message, responses.get("OSU_CHECK_MODE").format({
                    author: message.author.id,
                    user: profile.username,
                    mode: OsuMode.to_string(profile.mode)
                }));
        }

        if (!force && profile.checking)
            return;

        profile.checking = true;

        let topRank;
        let handle = async () => {
            let json = await this.get_user_best(profile.user_id, profile.mode, 50);
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

                if (skip)
                    continue;
            
                topRank = j + 1;

                if (index === -1)
                    profile.records.push({ date: date, beatmap_id: beatmap.beatmap_id });
                else
                    profile.records[index].date = date;

                if(no_report)
                    continue;
                
                let beatmap_info = await this.get_beatmaps(beatmap.beatmap_id);
                let user_data = await this.update_user(profile, profile.mode);

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
                    delta_pp: deltapp.toFixed(2),
                    old_rank: oldRank,
                    new_rank: newRank,
                    delta_rank: deltaRank,
                    mode: OsuMode.to_string(profile.mode)
                };

                this.on_new_record(profile, announcement);
            }

            profile.last_checked = (new Date()).getTime();
            OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { db_version: CURRENT_DB_VERSION, records: profile.records, last_checked: profile.last_checked }, {});

            profile.checking = false;
        };

        handle();
    }

    update_user(_profile) {
        let profile = _profile;

        if (profile.update_in_progress !== null)
            return profile.update_in_progress;

        let promise = async () => {
            try {
                let data = await this.get_user(profile.username, profile.mode);
                profile.last_updated = Date.now();

                await OsuUser.findOneAndUpdate({ user_id: profile.user_id }, {
                    db_version: CURRENT_DB_VERSION,
                    user_id: data.user_id,
                    pp: parseFloat(data.pp_raw),
                    rank: parseInt(data.pp_rank),
                    last_updated: profile.last_updated,
                    extra: data
                });
                    
                profile.update_in_progress = null;
                return data;
            }catch(err) {
                profile.update_in_progress = null;
                throw err;
            }
        };

        profile.update_in_progress = promise();
        return profile.update_in_progress;
    }
}

module.exports = new OsuModule();