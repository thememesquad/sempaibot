"use strict";

const request = require("request");
const Q = require("q");
const net = require("net");
const lodash = require("lodash");
const config = require("../config");
const responses = require("../src/responses.js");
const permissions = require("../src/permissions.js");
const IModule = require("../src/IModule.js");
const Document = require("camo").Document;

const USER_UPDATE_INTERVAL = 1200000;
const BEST_UPDATE_INTERVAL = 60000;
const MAX_USER_LIMIT = 50;

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
        this.servers = [String];
        this.records = [Object];
    }
}

const ReconnectTimer = 15000;
const ReconnectTime = "15.0s";

class OsuBancho
{
    constructor()
    {
        this.buffer = "";
        this.requests = {};
        this.online_buffer = [];
        this.connected = Q.defer();
        this.client = new net.Socket();
        
        var connect = function(){
            try
            {
                this.client.connect(6667, "irc.ppy.sh", function(){
                    this.onConnect();
                }.bind(this));
            }
            catch(e)
            {
                console.log("Failed to connect to bancho, new attempt in " + ReconnectTime);
                setTimeout(connect, ReconnectTimer);
            }
        }.bind(this);
        
        connect();
        
        var linesplit = /\r\n|\r|\n/;
        var last = /(\r\n|\r|\n)(?=[^(\r\n|\r|\n)]*$)/;

        this.client.on("data", function(data){
            this.buffer += data.toString();
            if(this.buffer.match(last) === null)
                return;
                
            var str = this.buffer.substr(0, this.buffer.search(last));
            var lines = str.split(linesplit);

            this.buffer = this.buffer.substr(str.length + this.buffer.match(last)[0].length);
            for(var i = 0;i<lines.length;i++)
            {
                var line = lines[i];
                if(line.indexOf(":cho.ppy.sh") != -1)
                {
                    var idx1 = line.indexOf(" ");
                    var idx2 = line.indexOf(" ", idx1 + 1);
                    var command = line.substr(idx1 + 1, idx2 - idx1 - 1);

                    //001 = welcome message
                    //375 = motd start
                    //372 = motd entry
                    //376 = motd end
                    //353 = names list entry
                    //366 = names list end

                    if(command == "001")
                    {
                        //welcome message
                    }
                    else if(command == "375")
                    {
                        //motd start
                    }
                    else if(command == "372")
                    {
                        //motd entry
                    }
                    else if(command == "376")
                    {
                        //motd end
                    }
                    else if(command == "353")
                    {
                        str = line.substr(line.indexOf("osu :") + "osu :".length);
                        var names = str.split(" ");
                        names = names.splice(0, names.length - 1);

                        for(var j = 0;j<names.length;j++)
                        {
                            names[j] = names[j].replace("_", " ");
                        }

                        this.online_buffer = this.online_buffer.concat(names);
                    }
                    else if(command == "366")
                    {
                        var req = this.requests["names"];
                        this.requests["names"] = null;
                        
                        var tmp = this.online_buffer;
                        this.online_buffer = null;
                        
                        req.resolve(tmp);
                    }
                    else
                    {
                        console.log(line);
                    }
                }
            }
            
            lines = null;
            str = null;
        }.bind(this));

        this.client.on("close", function(){
            console.log("Disconnected from Bancho, attempting reconnect in " + ReconnectTime);

            var reconnect = function(){
                console.log("Reconnecting to Bancho");
                
                this.connected = Q.defer();
                try
                {
                    this.client.connect(6667, "irc.ppy.sh", function(){
                        this.onConnect();
                    }.bind(this));
                }
                catch(e)
                {
                    console.log("Failed to connect, attempting reconnect in " + ReconnectTime);
                    setTimeout(reconnect, ReconnectTimer);
                }
            }.bind(this);
            
            setTimeout(reconnect, ReconnectTimer);
        }.bind(this));
        
        this.client.on("error", function(error){
            console.log("Error in the connection to bancho: " + error + ", reconnecting in " + ReconnectTime);
            setTimeout(connect, ReconnectTimer);
        });
    }

    send(command)
    {
        this.client.write(command + "\n");
    }

    update_online_buffer()
    {
        if(this.requests["names"] !== undefined && this.requests["names"] !== null)
            return this.requests["names"].promise;

        var defer = Q.defer();

        if(this.connected != null)
        {
            this.connected.promise.then(function(){
                this.names();
            }.bind(this));
        }else{
            this.names();
        }

        this.requests["names"] = defer;
        return defer.promise;
    }

    names()
    {
        this.online_buffer = [];
        this.send("NAMES osu");
    }

    onConnect()
    {
        this.send("PASS " + config.osu_irc_password);
        this.send("NICK " + config.osu_irc_username);
        this.send("USER " + config.osu_irc_username + " " + config.osu_irc_username + " " + config.osu_irc_username);

        console.log("Connected to Bancho");

        var connected = this.connected;
        this.connected = null;

        connected.resolve();
    }
}

class OsuModule extends IModule
{
    constructor()
    {
        super();

        if(typeof config.osu_irc_enabled !== "undefined" && config.osu_irc_enabled)
            this.bancho = new OsuBancho();

        this.name = "osu!";
        this.description = [
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to fanboy about Cookiezi, or make fun of your friend for setting a new PP score with bad acc!",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Who needs /r/osugame when you have this?",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! This is like /r/osugame, but automated and with worse memes. I tried, okay.",
            "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Just don't follow everyone on osu! because Peppy will get angry at us.",
        ];
        this.last_checked = -1;
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
        this.stats = {
            actual: [],
            average: [],
            last: 0
        };
        this.servers = {};
        this.default_on = true;

        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");

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
        
        var last = (new Date().getTime() / 1000.0) / 60;
        setInterval(function(){
            var curr = (new Date().getTime() / 1000.0) / 60;
            
            if(Math.floor(last) !== Math.floor(curr))
            {
                this.stats.average.push(this.stats.last);
                if(this.stats.average.length > 10)
                    this.stats.average.splice(0, 1);
                
                this.stats.last = 0;
                last = curr;
            }
        }.bind(this), 10);
    }

    handle_list_following(message)
    {
        var response = "```";

        var users = lodash.clone(this.users);
        users.sort(function(a, b){
            return b.pp - a.pp;
        });

        var rank = "Rank";
        var name = "Name";
        var pp = "PP";
        
        while(rank.length != 11)
            rank += " ";
            
        while(name.length != 15)
            name += " ";
            
        while(pp.length != 12)
            pp += " ";
            
        response += rank + " " + name + " " + pp + " ";
        
        var num = 0;
        for(var i in users)
        {
            //Check if the server is actually following this player
            if(users[i].servers.indexOf(message.server.id) === -1)
                continue;

            rank = users[i].rank;
            name = users[i].username;
            pp = "(" + users[i].pp + "pp)";
            
            while(rank.length != 10)
                rank += " ";
                
            while(name.length != 15)
                name += " ";
                
            while(pp.length != 12)
                pp += " ";
                
            response += "\r\n";
            response += "#" + rank + " " + name + " " + pp + " ";
            
            num++;
        }
        response += "```";
        
        if(num === 0)
            this.bot.respond(message, responses.get("OSU_FOLLOW_LIST_EMPTY").format({author: message.author.id}));
        else
            this.bot.respond(message, responses.get("OSU_FOLLOWING").format({author: message.author.id, results: response}));
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
            if(this.users[j].username.toLowerCase() == user.toLowerCase() || this.users[j].user_id == user.toLowerCase())
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

        if(profile.servers.length == 1)
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

    on_setup(bot)
    {
        this.bot = bot;
        this.check = setInterval(function(){
            var time = (new Date).getTime();
            var i;
            
            if(time - this.last_checked >= BEST_UPDATE_INTERVAL)
            {
                if(typeof config.osu_irc_enabled !== "undefined" && config.osu_irc_enabled)
                {
                    this.bancho.update_online_buffer().then(function(users){
                        for(var i in this.users)
                        {
                            if(users.indexOf(this.users[i].username) != -1)
                            {
                                this.users[i].online = true;
                            }
                            else
                            {
                                this.users[i].online = false;
                            }
                        }
                    }.bind(this));
                }

                for (i = 0; i < this.users.length; i++)
                {
                    var user = this.users[i];
                    this.force_check(user.username, false);
                }

                this.last_checked = time;
            }
            
            for(i in this.users)
            {
                if(time - this.users[i].last_updated >= USER_UPDATE_INTERVAL)
                {
                    this.update_user(this.users[i]);
                }
            }
        }.bind(this), 1);

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
                    servers: docs[i].servers,
                    update_in_progress: null,
                    online: false,
                    records: records,
                    checking: false
                };

                _this.users.push(user);

                var time = (new Date).getTime();
                if(user.last_updated === undefined || time - user.last_updated >= USER_UPDATE_INTERVAL)
                {
                    _this.update_user(user);
                }
            }
        }).catch(function(err){
            console.log("OsuUser.find: " + err);
        });
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
        this.stats.last++;
        this.stats.actual.push(Date.now());
        for(var i = this.stats.actual.length - 1;i>=0;i--)
        {
            if(this.stats.actual[i] < Date.now() - (60 * 1000))
                this.stats.actual.splice(i, 1);
        }
    }
    
    api_call(method, params, first, num)
    {
        this.log_call();
        
        num = (num === undefined) ? 0 : num;
        
        first = (first === undefined) ? true : first;
        var url = (method.startsWith("http:") ? method : (typeof config.osu_api_url !== "undefined") ? config.osu_api_url + method : "http://osu.ppy.sh/api/" + method) + "?k=" + config.osu_api;

        for(var key in params)
        {
            url += "&" + key + "=" + params[key];
        }

        var defer = Q.defer();

        request.get(url, function(error, response, body){
            if(error != null)
            {
                return defer.reject(error);
            }

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
        }.bind(this));

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
            if(this.users[i].username.toLowerCase() == username.toLowerCase() || this.users[i].user_id == username.toLowerCase())
            {
                profile = this.users[i];
                break;
            }
        }

        if(profile == null)
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
        /*if(config.osu_irc_enabled && !profile.online)
        {
            //if(message)
                //TODO: Send a response message saying the user isn't online so no need to check.

            return;
        }*/

        var _this = this;
        var topRank;
        this.get_user_best(username, 0, 50).then(function(profile, json){
            var updated = false;
            
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

                if(["X", "XH"].indexOf(beatmap.rank) != -1)
                    beatmap.rank = "SS";
                else if(beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                var i;
                for(i = 0;i<16;i++)
                {
                    if((beatmap.enabled_mods & (1 << i)) > 0)
                        beatmap.mods += ((beatmap.mods.length != 0) ? "" : "+") + _this.modsList[i];
                }

                var skip = false;
                var index = -1;
                var date = (new Date(beatmap.date)).valueOf();
                
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
                    updated = true;
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

                                if(deltaRank == 0)
                                    deltaRank = "no gain";
                                else if(deltaRank > 0)
                                    deltaRank += " lost";
                                else if(deltaRank < 0)
                                    deltaRank = Math.abs(deltaRank) + " gained";

                                var newRank = profile.rank = parseInt(user_data.pp_rank);
                                profile.pp = parseFloat(user_data.pp_raw);

                                beatmap.additional = "";
                                if (beatmap.perfect == 0)
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
            
            if(updated)
                OsuUser.findOneAndUpdate({user_id: profile.user_id}, {records: profile.records}, {});
            
            profile.checking = false;
        }.bind(null, profile)).catch(function(err){
            console.log("get_user_best: ", err);
        });
    }

    check_user(username, message)
    {
        var profile = null;
        var num = 0;

        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase() || this.users[i].user_id == username.toLowerCase())
            {
                profile = this.users[i];
                //break;
            }

            if(this.users[i].servers.indexOf(message.server.id) !== -1)
                num++;
        }

        if(num === MAX_USER_LIMIT)
            return this.bot.respond(message, responses.get("OSU_MAX_USER_LIMIT").format({author: message.author.id, user: profile.username}));

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

            var time = (new Date).getTime();
            var user = {user_id: json.user_id, username: json.username, pp: Number(json.pp_raw), rank: Number(json.pp_rank), servers: [message.server.id], update_in_progress: null, last_updated: time, records: [], checking: false};
            this.users.push(user);

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

            OsuUser.findOneAndUpdate({user_id: profile.user_id}, {user_id: data.user_id, pp: parseFloat(data.pp_raw), rank: parseInt(data.pp_rank), last_updated: profile.last_updated}).then(function(){
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

if(require.main == module)
{
    var user_best = [{"beatmap_id":"796721","score":"4626700","maxcombo":"486","count50":"1","count100":"21","count300":"313","countmiss":"1","countkatu":"18","countgeki":"58","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-08-02 07:44:18","rank":"A","pp":"123.729"},{"beatmap_id":"690778","score":"5356400","maxcombo":"530","count50":"1","count100":"51","count300":"309","countmiss":"1","countkatu":"26","countgeki":"42","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-03-23 21:02:46","rank":"B","pp":"121.425"},{"beatmap_id":"814293","score":"3844160","maxcombo":"431","count50":"0","count100":"66","count300":"329","countmiss":"1","countkatu":"33","countgeki":"50","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-06-20 04:32:09","rank":"B","pp":"91.9515"},{"beatmap_id":"735272","score":"1345250","maxcombo":"234","count50":"7","count100":"58","count300":"269","countmiss":"5","countkatu":"20","countgeki":"49","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-05-21 08:55:33","rank":"C","pp":"87.6663"},{"beatmap_id":"380646","score":"587950","maxcombo":"152","count50":"1","count100":"43","count300":"147","countmiss":"4","countkatu":"23","countgeki":"49","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-03-04 23:07:56","rank":"C","pp":"86.8992"},{"beatmap_id":"514516","score":"615830","maxcombo":"163","count50":"5","count100":"37","count300":"135","countmiss":"3","countkatu":"20","countgeki":"33","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-02-23 23:57:58","rank":"C","pp":"77.2901"},{"beatmap_id":"374841","score":"3293092","maxcombo":"448","count50":"6","count100":"52","count300":"300","countmiss":"1","countkatu":"28","countgeki":"34","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2015-12-26 05:18:00","rank":"B","pp":"77.0371"},{"beatmap_id":"807414","score":"463943","maxcombo":"166","count50":"1","count100":"7","count300":"92","countmiss":"0","countkatu":"5","countgeki":"19","perfect":"1","enabled_mods":"64","user_id":"3600584","date":"2016-06-23 02:54:32","rank":"S","pp":"76.5084"},{"beatmap_id":"586761","score":"4432460","maxcombo":"523","count50":"4","count100":"42","count300":"270","countmiss":"0","countkatu":"28","countgeki":"34","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2015-12-21 02:48:04","rank":"A","pp":"73.3331"},{"beatmap_id":"317107","score":"3846346","maxcombo":"489","count50":"15","count100":"100","count300":"392","countmiss":"3","countkatu":"40","countgeki":"49","perfect":"0","enabled_mods":"0","user_id":"3600584","date":"2016-06-26 23:20:31","rank":"C","pp":"70.4385"}];
    
    String.prototype.format = function(args) {
        return this.replace(/{(.*?)}/g, function(match, key) {
            return typeof args[key] != "undefined" ? args[key] : match;
        });
    };

    var tmp = new OsuModule();
    tmp.servers[0] = {};
    
    tmp.bot = {
        respond: function(message){
            console.log(arguments);
            
            if(message.test_type === 0)
            {
                var interval = setInterval(function(){
                    var profile = null;
                    for(var i in tmp.users)
                    {
                        if(tmp.users[i].username.toLowerCase() === "calsmurf2904" || tmp.users[i].user_id === "calsmurf2904")
                        {
                            profile = tmp.users[i];
                            break;
                        }
                    }
                    
                    if(profile.checking)
                        return;
                    
                    tmp.force_check("calsmurf2904", {
                        server: {
                            id: "0"
                        },
                        author: {
                            id: "0"
                        },
                        test_type: 1
                    }, false, true);
                    
                    clearInterval(interval);
                }, 10);
            }
        },
        message: function(){
            console.log(arguments);
        }
    };
    
    var original = tmp.api_call;
    var numCalled = 0;
    
    tmp.api_call = function(method, params, first, num){
        if(method === "get_user_best")
        {
            numCalled++;
            if(numCalled > 1)
            {
                var defer = Q.defer();

                setTimeout(function(){
                    defer.resolve(user_best);
                }, 1);

                return defer.promise;
            }
        }
        
        console.log("api_call: ", method, params, first, num);
        return original(method, params, first, num);
    }.bind(tmp);
    
    const db = require("../src/db.js");
    
    db.load().then(function(){
        tmp.check_user("calsmurf2904", {
            server: {
                id: "0"
            },
            author: {
                id: "0"
            },
            test_type: 0
        });
    });
}