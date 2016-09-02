"use strict";

const request = require("request");
const Q = require("q");
const lodash = require("lodash");
const Document = require("camo").Document;

const config = require("../../config.js");
const responses = require("../responses.js");
const permissions = require("../permissions.js");
const stats = require("../stats.js");
const ModuleBase = require("../modulebase.js");
const LoadBalancer = require("../loadbalancer.js");
const util = require("../util.js");
const moment = require("moment-timezone");

const USER_UPDATE_INTERVAL = 1200000;
const BEST_UPDATE_INTERVAL = 60000;
const CURRENT_DB_VERSION = 2;

class OsuUser extends Document
{
    constructor()
    {
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
    }
}

class OsuModule extends ModuleBase
{
    constructor()
    {
        super();

        this.__OsuUser = OsuUser;
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
            match: function(message){
                if(!message.content.startsWith("set osu limit to"))
                    return null;
                
                var split = message.content.split(" ");
                if(split.length < 6)
                {
                    message.almost = true;
                    return null;
                }
                
                var limit = parseInt(split[4]);
                var server = parseInt(split[6]);
                
                return [limit, server];
            },
            sample: "sempai set osu limit to __*limit*__ for __*server*__",
            description: "Changes the osu server limit",
            permission: "OSU_CHANGE_LIMIT",
            global: true,
            
            execute: this.handle_set_limit
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("what is my osu limit"))
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
            match: function(message){
                var messages = [
                    "who are you following",
                    "who do you follow",
                    "list following",
                    "list follows",
                    "show follow list",
                    "show followlist",
                    "show following list",
                    "show follows list"
                ];
                
                for(var i = 0;i<messages.length;i++)
                {
                    if(message.content.startsWith(messages[i]))
                        return [];
                }
                
                return null;
            },
            sample: "sempai who are you following?",
            description: "Lists all the people I'm following on osu!",
            permission: null,
            global: false,

            execute: this.handle_list_following
        });

        this.add_command({
            match: function(message){
                var messages = [
                    "follow",
                    "stalk"
                ];
                
                for(var i = 0;i<messages.length;i++)
                {
                    if(message.content.startsWith(messages[i]))
                    {
                        var tmp = message.content.substr(messages[i].length + 1);
                        if(tmp.length === 0)
                        {
                            message.almost = true;
                            return null;
                        }
                        
                        return [tmp];
                    }
                }
                
                return null;
            },
            sample: "sempai follow __*osu! username or id*__",
            description: "Adds the specified person to my following list for osu!",
            permission: "OSU_FOLLOW",
            global: false,

            execute: this.handle_follow
        });

        this.add_command({
            match: function(message){
                var messages = [
                    "stop following",
                    "stop stalking",
                    "unfollow"
                ];
                
                for(var i = 0;i<messages.length;i++)
                {
                    if(message.content.startsWith(messages[i]))
                    {
                        var tmp = message.content.substr(messages[i].length + 1);
                        if(tmp.length === 0)
                        {
                            message.almost = true;
                            return null;
                        }
                        
                        return [tmp];
                    }
                }
                
                return null;
            },
            sample: "sempai stop following __*osu! username or id*__",
            description: "Removes the specified person from my following list for osu!",
            permission: "OSU_UNFOLLOW",
            global: false,

            execute: this.handle_unfollow
        });

        this.add_command({
            match: function(message){
                if(!message.content.startsWith("check"))
                    return null;
                   
                var tmp = message.content.substr("check".length + 1);
                if(tmp.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [tmp]; 
            },
            sample: "sempai check __*osu! username or id*__",
            description: "Forces Sempai to check the specified person for scores that Sempai may have somehow missed.",
            permission: "OSU_CHECK",
            global: false,

            execute: this.handle_check
        });
        
        this.api_stats = setInterval(function(){
            var curr = (new Date()).getMinutes();
            
            if(this.stats.last_minute !== curr)
            {
                stats.update("osu_api_calls", this.stats.last);
                
                this.stats.last = 0;
                this.stats.last_minute = curr;
            }
        }.bind(this), 10);
    }

    handle_set_limit(message, limit, serverID)
    {
        var server = this.bot.get_server_internal(serverID - 1);
        if(server === null)
        {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({author: message.author.id, id: serverID}));
        }
        
        var old_limit = server.config.value.osu_limit;
        server.config.value.osu_limit = limit;
        server.config.save().catch(function(err){console.log("error saving new config: ", err);});
        
        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT_CHANGED").format({author: message.author.id, old_limit: old_limit, new_limit: limit, server_name: server.server.name}));
    }
    
    handle_show_limit(message)
    {
        return this.bot.respond(message, responses.get("OSU_SERVER_LIMIT").format({author: message.author.id, limit: message.server.config.value.osu_limit}));
    }
    
    handle_list_following(message)
    {
        var users = lodash.clone(this.users);
        users.sort(function(a, b){
            return b.pp - a.pp;
        });

        var data = [];
        for(var i in users)
        {
            //Check if the server is actually following this player
            if(users[i].servers.indexOf(message.server.id) === -1)
                continue;

            data.push({
                rank: "#" + users[i].rank,
                name: users[i].username,
                pp: users[i].pp.toFixed(1) + "pp"
            });
        }
        
        if(data.length === 0)
            this.bot.respond(message, responses.get("OSU_FOLLOW_LIST_EMPTY").format({author: message.author.id}));
        else
        {
            var messages = util.generate_table(responses.get("OSU_FOLLOWING").format({author: message.author.id}), {rank: "Rank", name: "Name", pp: "PP"}, data);
            this.bot.respond_queue(message, messages);
        }
    }

    handle_follow(message, name)
    {
        this.check_user(name, message);
    }

    handle_unfollow(message, user)
    {
        var i = -1;
        for(var j in this.users)
        {
            if(this.users[j].username.toLowerCase() === user.toLowerCase() || this.users[j].user_id === user.toLowerCase())
            {
                i = j;
                break;
            }
        }

        if(i === -1)
        {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({author: message.author.id, user: user}));
        }

        var profile = this.users[i];
        if(profile.servers.indexOf(message.server.id) === -1)
        {
            return this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({author: message.author.id, user: user}));
        }

        if(profile.servers.length === 1)
        {
            this.users.splice(i, 1);
            OsuUser.deleteOne({user_id: profile.user_id}, {}, function(){});
        }
        else
        {
            profile.servers.splice(profile.servers.indexOf(message.server.id), 1);
            OsuUser.findOneAndUpdate({user_id: profile.user_id}, {servers: profile.servers}, {});
        }

        this.bot.respond(message, responses.get("OSU_STOPPED").format({author: message.author.id, user: profile.username}));
    }

    handle_check(message, user)
    {
        this.force_check(user, message);
    }

    on_new_record(profile, record)
    {
        for(var i = 0;i<profile.servers.length;i++)
        {
            var server = this.servers[profile.servers[i]];
            if(server === undefined)
            {
                continue;
            }

            this.bot.message(record, server);
        }
    }

    get_check_interval(user, time)
    {
        if(user.last_record === -1)
            return BEST_UPDATE_INTERVAL;
        
        var num = Math.ceil((time - user.last_record) / (60 * 1000));
        var times = Math.min(num / 30, 5);
        
        //todo: add an extra case for people who haven't gotten a record in a few days.
        
        return times * BEST_UPDATE_INTERVAL;
        
        //Disabled for now since it wasn't working.
        //return BEST_UPDATE_INTERVAL;
    }
    
    get_user_update_interval(user, time)
    {
        if(user.last_record === -1)
            return USER_UPDATE_INTERVAL;
        
        var num = Math.ceil((time - user.last_record) / (60 * 1000));
        var times = Math.min(num / 30, 5);
        
        //todo: add an extra case for people who haven't gotten a record in a few days.
        
        return times * USER_UPDATE_INTERVAL;
        
        //Disabled for now since it wasn't working.
        //return USER_UPDATE_INTERVAL;
    }
    
    migrate_user(user)
    {
        if(user.db_version === CURRENT_DB_VERSION)
            return;
        
        console.log("Migrating user '" + user.username + "' from db '" + user.db_version + "' to '" + CURRENT_DB_VERSION + "'.");
        if(user.db_version === undefined)
        {
            for(var i = 0;i<user.records.length;i++)
            {
                var record = user.records[i];
                
                var tmpdate = new Date(record.date).toUTCString();
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                record.date = new Date(tmpdate + " UTC+8").valueOf();
                
                user.records[i] = record;
            }
            
            user.db_version = 1;
        }
        
        if(user.db_version === 1)
        {
            for(var i = 0;i<user.records.length;i++)
            {
                var record = user.records[i];
                
                var tmpdate = new Date(record.date + (8 * 60 * 1000)).toString();
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                tmpdate = tmpdate.substr(0, tmpdate.lastIndexOf(" "));
                record.date = moment(new Date(tmpdate + " UTC")).subtract(8, "hours").toDate().valueOf();
                
                user.records[i] = record;
            }
            
            user.db_version = 2;
        }
    }
    
    on_setup(bot)
    {
        this.bot = bot;
        this.check = setInterval(function(){
            var time = Date.now();
            var i;
            
            for (i = 0; i < this.users.length; i++)
            {
                var user = this.users[i];
                if((time - user.last_checked) >= this.get_check_interval(user, time))
                    this.force_check(user.username, false);
            }
            
            for (i = 0; i < this.users.length; i++)
            {
                if((time - this.users[i].last_updated) >= this.get_user_update_interval(user, time))
                    this.update_user(this.users[i]);
            }
        }.bind(this), 10);

        var _this = this;
        OsuUser.find({}).then(function (docs) {
            for (var i = 0; i < docs.length; i++)
            {
                var records = [];
                for(var j = 0;j<docs[i].records.length;j++)
                {
                    records.push(docs[i].records[j]);
                }
                
                var user = {
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
                    db_version: docs[i].db_version
                };

                if(docs[i].db_version !== CURRENT_DB_VERSION)
                {
                    _this.migrate_user(user);
                }
                
                _this.users.push(user);

                var time = (new Date).getTime();
                if(user.last_updated === undefined || time - user.last_updated >= _this.get_user_update_interval(user, time))
                {
                    _this.update_user(user);
                }
            }
            
            stats.update("osu_num_users", _this.users.length);
        }).catch(function(err){
            console.log("OsuUser.find: " + err);
        });
    }

    on_shutdown()
    {
        clearInterval(this.check);
        clearInterval(this.api_stats);
        
        for(var i = 0;i<this.pending.length;i++)
        {
            this.load_balancer.cancel(this.pending[i]);
        }
    }
    
    on_load(server)
    {
        if(this.servers[server.id] !== undefined)
            return;

        this.servers[server.id] = server;
    }

    on_unload(server)
    {
        if(this.servers[server.id] === undefined)
            return;

        delete this.servers[server.id];
    }

    log_call()
    {
        var curr = (new Date()).getMinutes();

        if(this.stats.last_minute !== curr)
        {
            stats.update("osu_api_calls", this.stats.last);

            this.stats.last = 0;
            this.stats.last_minute = curr;
        }
        
        this.stats.last++;
    }
    
    api_call(method, params, first, num)
    {
        var defer = Q.defer();

        num = (num === undefined) ? 0 : num;

        first = (first === undefined) ? true : first;
        var url = (method.startsWith("http:") ? method : (typeof config.osu_api_url !== "undefined") ? config.osu_api_url + method : "http://osu.ppy.sh/api/" + method) + "?k=" + config.osu_api;

        for(var key in params)
        {
            url += "&" + key + "=" + params[key];
        }
            
        this.pending.push(this.load_balancer.create(url).then(function(obj){
            this.log_call();
            
            var response = obj.response;
            var body = obj.body;
            
            try
            {
                var data = JSON.parse(body);
                if(first)
                {
                    data = data[0];
                }

                return defer.resolve(data);
            }
            catch(e)
            {
                if(num === 4)
                    return defer.reject(e);

                this.api_call(method, params, first, num + 1).then(function(result){
                    defer.resolve(result);
                }).catch(function(err){
                    defer.reject(err);
                });
            }
        }.bind(this)).catch(function(err){
            defer.reject(err);
        }));
        
        return defer.promise;
    }

    get_user(username)
    {
        return this.api_call("get_user", {u: username});
    }

    get_beatmaps(id)
    {
        return this.api_call("http://osu.ppy.sh/api/get_beatmaps", {b: id});
    }

    get_user_best(username, start, limit)
    {
        return this.api_call("get_user_best", {u: username, m: start, limit: limit}, false);
    }

    force_check(username, message, no_report, force)
    {
        no_report = no_report || false;
        
        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() === username.toLowerCase() || this.users[i].user_id === username.toLowerCase())
            {
                profile = this.users[i];
                break;
            }
        }

        if(profile === null)
        {
            if(message)
                this.bot.respond(message, responses.get("OSU_NOT_FOLLOWING").format({author: message.author.id, user: username}));

            return;
        }

        if(message)
            this.bot.respond(message, responses.get("OSU_CHECK").format({author: message.author.id, user: profile.username}));
        
        if(!force && profile.checking)
            return;
        
        profile.checking = true;

        var _this = this;
        var topRank;
        this.get_user_best(username, 0, 50).then(function(profile, json){
            for (var j = 0; j < json.length; j++)
            {
                var beatmap = json[j];
                beatmap.count50 = parseInt(beatmap.count50);
                beatmap.count100 = parseInt(beatmap.count100);
                beatmap.count300 = parseInt(beatmap.count300);
                beatmap.countmiss = parseInt(beatmap.countmiss);
                beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
                beatmap.perfect = parseInt(beatmap.perfect);
                beatmap.pp = Math.round(parseFloat(beatmap.pp));

                var totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
                var totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

                beatmap.acc = (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);

                if(["X", "XH"].indexOf(beatmap.rank) !== -1)
                    beatmap.rank = "SS";
                else if(beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                var i;
                for(i = 0;i<16;i++)
                {
                    if((beatmap.enabled_mods & (1 << i)) > 0)
                        if(i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
                            beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + _this.modsList[i];
                }

                var skip = false;
                var index = -1;
                var date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();
                
                profile.last_record = Math.max(profile.last_record, date);
                
                for(i = 0;i<profile.records.length;i++)
                {
                    if(profile.records[i].beatmap_id === beatmap.beatmap_id)
                    {
                        index = i;
                        if(profile.records[i].date === date)
                        {
                            skip = true;
                            break;
                        }
                    }
                }
                
                if (!skip)
                {
                    topRank = j + 1;

                    if(index === -1)
                    {
                        profile.records.push({date: date, beatmap_id: beatmap.beatmap_id});
                    }
                    else
                    {
                        profile.records[index].date = date;
                    }
                    
                    if(!no_report)
                    {
                        _this.get_beatmaps(beatmap.beatmap_id).then(function(profile, beatmap, beatmap_info){
                            _this.update_user(profile).then(function(profile, beatmap, beatmap_info, user_data){
                                var oldTotalpp = profile.pp;
                                var newTotalpp = user_data.pp_raw;
                                var deltapp = user_data.pp_raw - profile.pp;
                                var oldRank = profile.rank;
                                var deltaRank = user_data.pp_rank - profile.rank;

                                if(deltapp > 0)
                                    deltapp = "+" + deltapp.toFixed(2) + "pp";
                                else if(deltapp < 0)
                                    deltapp = deltapp.toFixed(2) + "pp";
                                else
                                    deltapp = "no gain";

                                if(deltaRank === 0)
                                    deltaRank = "no gain";
                                else if(deltaRank > 0)
                                    deltaRank += " lost";
                                else if(deltaRank < 0)
                                    deltaRank = Math.abs(deltaRank) + " gained";

                                var newRank = profile.rank = parseInt(user_data.pp_rank);
                                profile.pp = parseFloat(user_data.pp_raw);

                                beatmap.additional = "";
                                if (beatmap.perfect === 0)
                                    beatmap.additional = "| **" + beatmap.maxcombo + "/" + beatmap_info.max_combo + "** " + beatmap.countmiss + "x Miss";

                                var announcement = responses.get("OSU_NEW_SCORE_NODATE").format({
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
                                    old_total_pp: oldTotalpp,
                                    new_total_pp: newTotalpp,
                                    delta_pp: deltapp,
                                    old_rank: oldRank,
                                    new_rank: newRank,
                                    delta_rank: deltaRank
                                });
                                
                                _this.on_new_record(profile, announcement);
                            }.bind(null, profile, beatmap, beatmap_info)).catch(function(err){
                                console.log("update_user: ", err, err.stack);
                            });
                        }.bind(null, profile, beatmap)).catch(function(err){
                            console.log("get_beatmaps: ", err, err.stack);
                        });
                    }
                }
            }
            
            profile.last_checked = (new Date()).getTime();
            OsuUser.findOneAndUpdate({user_id: profile.user_id}, {db_version: CURRENT_DB_VERSION, records: profile.records, last_checked: profile.last_checked}, {});
            
            profile.checking = false;
        }.bind(null, profile)).catch(function(err){
            console.log("get_user_best: ", err, err.stack);
        });
    }

    check_user(username, message)
    {
        var profile = null;
        var num = 0;

        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() === username.toLowerCase() || this.users[i].user_id === username.toLowerCase())
            {
                profile = this.users[i];
                //break;
            }

            if(this.users[i].servers.indexOf(message.server.id) !== -1)
                num++;
        }

        if(num === message.server.config.value.osu_limit)
            return this.bot.respond(message, responses.get("OSU_MAX_USER_LIMIT").format({author: message.author.id, limit: message.server.config.value.osu_limit, user: profile.username}));

        if(profile !== null)
        {
            if(profile.servers.indexOf(message.server.id) === -1)
            {
                profile.servers.push(message.server.id);
                OsuUser.findOneAndUpdate({user_id: profile.user_id}, {servers: profile.servers}, {});

                return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: profile.username}));
            }

            return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING").format({author: message.author.id, user: profile.username}));
        }

        this.get_user(username).then(function(username, message, json){
            if(json === undefined || json.username === undefined)
            {
                if(message !== undefined)
                    this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND").format({author: message.author.id, user: username}));

                return;
            }

            var time = Date.now();
            var user = {user_id: json.user_id, username: json.username, pp: Number(json.pp_raw), rank: Number(json.pp_rank), servers: [message.server.id], update_in_progress: null, last_checked: time, last_updated: time, records: [], last_record: -1, checking: false, db_version: CURRENT_DB_VERSION};
            this.users.push(user);

            stats.update("osu_num_users", this.users.length);
            
            var dbuser = OsuUser.create(user);
            dbuser.save().then(function(){
                this.force_check(user.username, undefined, true);
                this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: json.username}));
            }.bind(this)).catch(function(err){
                console.log(err.stack);
            });
        }.bind(this, username, message)).catch(function(err){
            console.log("get_user: " + err.stack);
        });
    }

    update_user(profile)
    {
        if(profile.update_in_progress !== null)
            return profile.update_in_progress.promise;

        var defer = Q.defer();
        profile.update_in_progress = defer;

        this.get_user(profile.username).then(function(profile, data){
            profile.last_updated = (new Date).getTime();

            OsuUser.findOneAndUpdate({user_id: profile.user_id}, {db_version: CURRENT_DB_VERSION, user_id: data.user_id, pp: parseFloat(data.pp_raw), rank: parseInt(data.pp_rank), last_updated: profile.last_updated}).then(function(){
                profile.update_in_progress.resolve(data);
                profile.update_in_progress = null;
            }).catch(function(err){
                profile.update_in_progress.reject(err);
                profile.update_in_progress = null;
            });
        }.bind(this, profile)).catch(function(err){
            profile.update_in_progress.reject(err);
            profile.update_in_progress = null;
        });

        return profile.update_in_progress.promise;
    }
}

module.exports = new OsuModule();