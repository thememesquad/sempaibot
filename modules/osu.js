"use strict";

var db = require("../db.js");
var responses = require("../responses.js");
var config = require("../config");
var http = require("http");
var request = require("request");
var Q = require("q");
var net = require('net');
//var irc = require("irc");

var USER_UPDATE_INTERVAL = 3600000;
var BEST_UPDATE_INTERVAL = 60000;

//Afk, Idle, Playing, Watching, Editing
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

class OsuModule
{
    constructor(bot)
    {
        if(config.osu_irc_username !== undefined && config.osu_irc_password !== undefined)
            this.bancho = new OsuBancho();

        this.last_checked = -1;
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
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
                        beatmap.mods += ((beatmap.mods.length != 0) ? "" : "+") + this.modsList[i];
                }

                var bdate = new Date(beatmap.date);
                var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                if (date > endDate)
                {
                    topRank = j + 1;

                    this.get_beatmaps(beatmap.beatmap_id).then(function(profile, beatmap, beatmap_info){
                        this.update_user(profile).then(function(profile, beatmap, beatmap_info, user_data){
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

                            this.bot.message("osu", responses.get("OSU_NEW_SCORE_NODATE").format({
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
                            }));
                        }.bind(this, profile, beatmap, beatmap_info)).catch(function(err){
                            console.log("update_user: " + err);
                        });
                    }.bind(this, profile, beatmap));
                }
            }
        }.bind(this, profile));
    }

    check_user(username, message)
    {
        if(username === undefined)
            return;

        var found = false;
        for(var i in this.users)
        {
            if(this.users[i].username.toLowerCase() == username.toLowerCase())
            {
                found = true;
                break;
            }
        }

        if(found)
        {
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
            var user = {username: json.username, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank), last_updated: time};
            this.users.push(user);

            var dbuser = db.OsuUser.create(user);
            dbuser.save();

            return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: json.username}));
        }.bind(this, username, message));
    }

    update_user(profile)
    {
        if(profile.update_in_progress !== null)
            return profile.update_in_progress.promise;

        var defer = Q.defer();
        profile.update_in_progress = defer;

        this.get_user(profile.username).then(function(profile, data){
            profile.last_updated = (new Date).getTime();

            db.OsuUser.findOneAndUpdate({username: profile.username}, {pp: parseFloat(data.pp_raw), rank: parseInt(data.pp_rank), last_updated: profile.last_updated}).then(function(doc){
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

module.exports = {
    moduleName: "osu!",
    load: function(Bot){
        var osu = new OsuModule(Bot);

        Bot.addCommand({
            name: "OSU_FOLLOWING",
            command: [
                /who are you following/i,
				/who do you follow/i
            ],
            sample: "sempai who are you following?",
            description: "Lists all the people I'm following on osu.",
            action: function(m){
                var message = "";
                for(var i in osu.users)
                {
                    if(i != 0)
                        message += ", ";

                    message += osu.users[i].username;
                }

                Bot.respond(m, responses.get("OSU_FOLLOWING").format({author: m.author.id, results: message}));
            }
        });

        Bot.addCommand({
            name: "OSU_FOLLOW",
            command: [
                /follow (.*)/i,
                /stalk (.*)/i
            ],
            sample: "sempai follow __*user*__",
            description: "Adds the person to my following list for osu.",
            action: function(m, name){
                if(name === undefined)
                {
                    return Bot.respond(m, responses.get("OSU_UNDEFINED").format({author: m.author.id}));
                }

                osu.check_user(name, m);
            }
        });

        Bot.addCommand({
            name: "OSU_STOP_FOLLOW",
            command: [
                /stop following (.*)/i,
                /stop stalking (.*)/i
            ],
            sample: "sempai stop following __*user*__",
            description: "Removes the person from my following list for osu.",
            action: function(m, user){
                var i = -1;
                for(var j in osu.users)
                {
                    if(osu.users[j].username == user)
                    {
                        i = j;
                        break;
                    }
                }

                if(i === -1)
                {
                    return Bot.respond(m, responses.get("OSU_NOT_FOLLOWING").format({author: m.author.id, user: user}));
                }

                osu.users.splice(i, 1);

                db.OsuUser.deleteOne({username: user}, {}, function(numrem) {
                }).catch(function(err){
                    console.log("Error removing '" + user + "' from osu db: " + err);
                });

                Bot.respond(m, responses.get("OSU_STOPPED").format({author: m.author.id, user: user}));
            }
        });

        Bot.addCommand({
            name: "OSU_CHECK",
            command: /check (.*)/i,
            sample: "sempai check __*user*__",
            description: "Forces Sempai to check the person for scores that Sempai may have somehow missed.",
            action: function(m, user){
                Bot.respond(m, responses.get("OSU_CHECK").format({author: m.author.id, user: user}));
                osu.force_check(user, m);
            }
        });

        db.OsuUser.find({}).then(function (docs) {
            for (var i = 0; i < docs.length; i++)
            {
                var user = {
                    username: docs[i].username,
                    pp: docs[i].pp,
                    rank: docs[i].rank,
                    last_updated: docs[i].last_updated,
                    update_in_progress: null,
                    online: false
                };

                osu.users.push(user);

                var time = (new Date).getTime();
                if(user.last_updated === undefined || time - user.last_updated >= USER_UPDATE_INTERVAL)
                {
                    osu.update_user(user);
                }
            }
        }).catch(function(err){
            console.log("OsuUser.find: " + err);
        });
    }
};
