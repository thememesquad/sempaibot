"use strict";

var http = require("http");
var request = require("request");
var Q = require("q");
var net = require('net');
var lodash = require("lodash");
const config = require("../config");
const db = require("../src/db.js");
const responses = require("../src/responses.js");
const permissions = require("../src/permissions.js");
const IModule = require("../src/IModule.js");
const Document = require('camo').Document;

var USER_UPDATE_INTERVAL = 3600000;
var BEST_UPDATE_INTERVAL = 60000;

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
                    //376 = names list start
                    //353 = names list entry
                    //366 = names list end

                    if(command == "001")
                    {
                    }
                    else if(command == "375")
                    {
                    }
                    else if(command == "372")
                    {
                    }
                    else if(command == "376")
                    {
                        this.online_buffer = [];
                    }else if(command == "353")
                    {
                        var str = line.substr(line.indexOf("osu :") + "osu :".length);
                        var names = str.split(" ");
                        names = names.splice(0, names.length - 1);

                        for(var j = 0;j<names.length;j++)
                        {
                            names[j] = names[j].replace("_", " ");
                        }

                        this.online_buffer = this.online_buffer.concat(names);
                    }else if(command == "366")
                    {
                        var req = this.requests["names"];
                        this.requests["names"] = null;
                        req.resolve(this.online_buffer);
                    }else{
                        console.log(line);
                    }
                }
            }
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
        })
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

        if(config.osu_irc_username !== undefined && config.osu_irc_password !== undefined)
            this.bancho = new OsuBancho();

        this.name = "osu!";
		this.description = [
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to fanboy about Cookiezi, or make fun of your friend for setting a new PP score with bad acc!",
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to keep track of our Erogelord225's crazy score sprees.",
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Who needs /r/osugame when you have this?",
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! This is like /r/osugame, but automated and with worse memes. I tried, okay.",
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Just don't follow everyone on osu! because Peppy will get angry at us.",
			"This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Also, don't bother following Azer he's not going to get PP."
		];
        this.last_checked = -1;
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
        this.servers = {};

        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");

        this.add_command({
            match: function(message){
                var messages = [
                    "who are you following",
                    "who do you follow"
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
                    "stop stalking"
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
        var online = "online";
        
        while(rank.length != 11)
            rank += " ";
            
        while(name.length != 15)
            name += " ";
            
        while(pp.length != 12)
            pp += " ";
            
        response += rank + " " + name + " " + pp + " " + online;
        
        var num = 0;
        for(var i in users)
        {
            //Check if the server is actually following this player
            if(users[i].servers.indexOf(message.server.id) === -1)
                continue;

            var rank = users[i].rank;
            var name = users[i].username;
            var pp = "(" + users[i].pp + "pp)";
            var online = users[i].online ? "yes" : "no";
            
            while(rank.length != 10)
                rank += " ";
                
            while(name.length != 15)
                name += " ";
                
            while(pp.length != 12)
                pp += " ";
                
            response += "\r\n";
            response += "#" + rank + " " + name + " " + pp + " " + online;
            
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
            if(this.users[j].username.toLowerCase() == user.toLowerCase() || this.users[j]._id == user.toLowerCase())
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
            OsuUser.deleteOne({_id: profile._id}, {}, function(numrem){});
        }
        else
        {
            profile.servers.splice(profile.servers.indexOf(message.server.id), 1);
            OsuUser.findOneAndUpdate({_id: profile._id}, {servers: profile.servers}, {});
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

            if(time - this.last_checked >= BEST_UPDATE_INTERVAL)
            {
                if(config.osu_irc_username !== undefined && config.osu_irc_password !== undefined)
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

                for (var i = 0; i < this.users.length; i++)
                {
                    var user = this.users[i];
                    this.force_check(user.username, false);
                }

                this.last_checked = time;
            }else{
                //don't update users when the beatmaps are being updated since there is a chance that the beatmap update code will also trigger a user update.

                for(var i in this.users)
                {
                    if(time - this.users[i].last_updated >= USER_UPDATE_INTERVAL)
                    {
                        this.update_user(this.users[i]);
                    }
                }
            }
        }.bind(this), 1);

        var _this = this;
        OsuUser.find({}).then(function (docs) {
            for (var i = 0; i < docs.length; i++)
            {
                var user = {
                    _id: docs[i]._id,
                    user_id: docs[i].user_id,
                    username: docs[i].username,
                    pp: docs[i].pp,
                    rank: docs[i].rank,
                    last_updated: docs[i].last_updated,
                    servers: docs[i].servers,
                    update_in_progress: null,
                    online: false
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

    api_call(method, params, first, num)
    {
        num = (num === undefined) ? 0 : num;
        
        first = (first === undefined) ? true : first;
        var url = "http://osu.ppy.sh/api/" + method + "?k=" + config.osu_api;

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
        return this.api_call("get_beatmaps", {b: id});
    }

    get_user_best(username, start, limit)
    {
        return this.api_call("get_user_best", {u: username, m: start, limit: limit}, false);
    }

    force_check(username, message)
    {
        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase() || this.users[i]._id == username.toLowerCase())
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
        
        /*if(profile.online == false)
        {
            //if(message)
                //TODO: Send a response message saying the user isn't online so no need to check.

            return;
        }*/

        var endDate = new Date();
        endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000 - 1 * 60 * 1000);

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

                if(["X", "XH"].indexOf(beatmap.rank) != -1)
                    beatmap.rank = "SS";
                else if(beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                for(var i = 0;i<16;i++)
                {
                    if((beatmap.enabled_mods & (1 << i)) > 0)
                        beatmap.mods += ((beatmap.mods.length != 0) ? "" : "+") + _this.modsList[i];
                }

                var bdate = new Date(beatmap.date);
                var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                if (date > endDate)
                {
                    topRank = j + 1;

                    _this.get_beatmaps(beatmap.beatmap_id).then(function(profile, beatmap, beatmap_info){
                        _this.update_user(profile).then(function(profile, beatmap, beatmap_info, user_data){
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
                                delta_pp: deltapp,
                                old_rank: oldRank,
                                new_rank: newRank,
                                delta_rank: deltaRank
                            });

                            _this.on_new_record(profile, announcement);
                        }.bind(null, profile, beatmap, beatmap_info)).catch(function(err){
                            console.log("update_user: " + err.stack);
                        });
                    }.bind(null, profile, beatmap)).catch(function(err){
                        console.log("get_beatmaps: " + err.stack);
                    });
                }
            }
        }.bind(null, profile)).catch(function(err){
            console.log("get_user_best: " + err.stack);
        });
    }

    check_user(username, message)
    {
        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase() || this.users[i]._id == username.toLowerCase())
            {
                profile = this.users[i];
                break;
            }
        }

        if(profile !== null)
        {
            if(profile.servers.indexOf(message.server.id) === -1)
            {
                profile.servers.push(message.server.id);
                OsuUser.findOneAndUpdate({_id: profile._id}, {servers: profile.servers}, {});

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
            var user = {_id: json.user_id, user_id: json.user_id, username: json.username, pp: Number(json.pp_raw), rank: Number(json.pp_rank), servers: [message.server.id], update_in_progress: null, last_updated: time};
            this.users.push(user);

            var dbuser = OsuUser.create(user);
            dbuser.save().then(function(doc){
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

            OsuUser.findOneAndUpdate({_id: profile._id}, {user_id: data.user_id, pp: parseFloat(data.pp_raw), rank: parseInt(data.pp_rank), last_updated: profile.last_updated}).then(function(doc){
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
