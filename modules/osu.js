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

class OsuBancho
{
    constructor()
    {
        this.buffer = "";
        this.requests = {};
        this.online_buffer = [];
        this.connected = Q.defer();
        this.client = new net.Socket();
        this.client.connect(6667, "irc.ppy.sh", function(){
            this.onConnect();
        }.bind(this));

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
                    //376 = names list start
                    //353 = names list entry
                    //366 = names list end

                    if(command == "376")
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
                    }
                }
            }
        }.bind(this));

        this.client.on("close", function(){
            console.log("Disconnected from Bancho, attempting reconnect in 1.5s");

            setTimeout(function(){
                console.log("Reconnecting to Bancho");
                this.client.connect(6667, "irc.ppy.sh", function(){
                    this.onConnect();
                }.bind(this));
            }.bind(this), 1500);
        }.bind(this));
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
        this.last_checked = -1;
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
        this.servers = {};

        permissions.register("OSU_FOLLOW", "moderator");
        permissions.register("OSU_UNFOLLOW", "moderator");
        permissions.register("OSU_CHECK", "moderator");

        this.add_command({
            regex: [
                /who are you following/i,
				/who do you follow/i
            ],
            sample: "sempai who are you following?",
            description: "Lists all the people I'm following on osu.",
            permission: null,
            global: false,

            execute: this.handle_list_following
        });

        this.add_command({
            regex: [
                /follow (.*)/i,
                /stalk (.*)/i
            ],
            sample: "sempai follow __*user*__",
            description: "Adds the person to my following list for osu.",
            permission: "OSU_FOLLOW",
            global: false,

            execute: this.handle_follow
        });

        this.add_command({
            regex: [
                /stop following (.*)/i,
                /stop stalking (.*)/i
            ],
            sample: "sempai stop following __*user*__",
            description: "Removes the person from my following list for osu.",
            permission: "OSU_UNFOLLOW",
            global: false,

            execute: this.handle_unfollow
        });

        this.add_command({
            regex: /check (.*)/i,
            sample: "sempai check __*user*__",
            description: "Forces Sempai to check the person for scores that Sempai may have somehow missed.",
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
            return a.rank - b.rank;
        });

        var rank = "Rank";
        var name = "Name";
        var pp = "PP";
        
        while(rank.length != 11)
            rank += " ";
            
        while(name.length != 20)
            name += " ";
            
        response += rank + " " + name + " " + pp;
        
        for(var i in users)
        {
            //Check if the server is actually following this player
            if(users[i].servers.indexOf(message.server.id) === -1)
                continue;

            var rank = users[i].rank;
            var name = users[i].username;
            var pp = " (" + users[i].pp + "pp)";
            
            while(rank.length != 10)
                rank += " ";
                
            while(name.length != 20)
                name += " ";
                
            response += "\r\n";
            response += "#" + rank + " " + name + " (" + users[i].pp + "pp)";
        }
        response += "```";
        
        this.bot.respond(message, responses.get("OSU_FOLLOWING").format({author: message.author.id, results: response}));
    }

    handle_follow(message, name)
    {
        if(name === undefined)
        {
            return this.bot.respond(message, responses.get("OSU_UNDEFINED").format({author: message.author.id}));
        }

        this.check_user(name, message);
    }

    handle_unfollow(message, user)
    {
        if(user === undefined)
        {
            return this.bot.respond(message, responses.get("OSU_UNDEFINED").format({author: message.author.id}));
        }

        var i = -1;
        for(var j in this.users)
        {
            if(this.users[j].username.toLowerCase() == user.toLowerCase())
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

        this.bot.respond(message, responses.get("OSU_STOPPED").format({author: message.author.id, user: user}));
    }

    handle_check(message, user)
    {
        if(user === undefined)
        {
            return this.bot.respond(message, responses.get("OSU_UNDEFINED").format({author: message.author.id}));
        }

        this.bot.respond(message, responses.get("OSU_CHECK").format({author: message.author.id, user: user}));
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
                            if(users.indexOf(this.users[i].username) !== -1)
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

    api_call(method, params, first)
    {
        first = (first === undefined) ? true : first;
        var url = "http://osu.ppy.sh/api/" + method + "?k=" + config.osuapi;

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
            }catch(e){
                return defer.reject(e);
            }
        });

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
        if(username === undefined)
            return;

        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase())
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
        if(username === undefined)
            return;

        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase())
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

                return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: json.username}));
            }

            return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING").format({author: message.author.id, user: username}));
        }

        this.get_user(username).then(function(username, message, json){
            if(json === undefined || json.username === undefined)
            {
                if(message !== undefined)
                    this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND").format({author: message.author.id, user: username}));

                return;
            }

            var time = (new Date).getTime();
            var user = {_id: json.user_id, user_id: json.user_id, username: json.username, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank), servers: [message.server.id], last_updated: time};
            this.users.push(user);

            var dbuser = OsuUser.create(user);
            dbuser.save().catch(function(err){
                console.log(err);
            });

            return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: json.username}));
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
