"use strict";

var db = require("../db.js");
var responses = require("../responses.js");
var config = require("../config");
var http = require("http");
var request = require("request");
var Q = require("q");

var USER_UPDATE_INTERVAL = 3600000;
var BEST_UPDATE_INTERVAL = 60000;

class OsuModule
{
    constructor(bot)
    {
        this.modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
        this.users = [];
        this.bot = bot;
        this.check = setInterval(function () {
            for (var i = 0; i < this.users.length; i++) {
                var user = this.users[i];
                this.force_check(user.username, false);
            }
        }.bind(this), BEST_UPDATE_INTERVAL);
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
        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username == username)
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

        var endDate = new Date();
        endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000 - 1 * 60 * 1000);

        var topRank;
        this.get_user_best(username, 0, 50).then(function(username, json){
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

                //if (date > endDate)
                if(j == 0)
                {
                    topRank = j + 1;

                    this.get_beatmaps(beatmap.beatmap_id).then(function(username, beatmap_info){
                        this.update_user(username).then(function(user_data){
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

                            this.bot.message("osu", responses.get("OSU_NEW_SCORE_NODATE").format({user: username, beatmap_id: beatmap.beatmap_id, pp: beatmap.pp,
                                rank: beatmap.rank, acc: beatmap.acc, mods: beatmap.mods, map_artist: beatmap_info.artist, map_title: beatmap_info.title, map_diff_name: beatmap_info.version, additional: beatmap.additional,
                                top_rank: topRank, delta_pp: deltapp, old_rank: oldRank, new_rank: newRank, delta_rank: deltaRank}));
                        }.bind(this));
                    }.bind(this, username));
                }
            }
        }.bind(this, username));
    }

    check_user(username, message)
    {
        if(username === undefined)
            return;

        this.get_user(username).then(function(username, message, json){
            if(json === undefined || json.username === undefined)
            {
                if(log !== undefined)
                    this.bot.respond(message, responses.get("OSU_USER_NOT_FOUND").format({author: message.author.id, user: username}));

                return;
            }

            var found = false;
            for(var i in this.users)
            {
                if(this.users[i].username == username)
                {
                    found = true;
                    break;
                }
            }

            if(found)
            {
                return this.bot.respond(message, responses.get("OSU_ALREADY_FOLLOWING").format({author: message.author.id, user: username}));
            }

            var time = (new Date).getTime();
            this.users.push({username: username, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank), last_updated: time});
            db.osu.insert({type: "user", username: username, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank), last_updated: time}, function (err, docs) {
                if (err !== null)
                    console.log(err);
            });

            return this.bot.respond(message, responses.get("OSU_ADDED_FOLLOWING").format({author: message.author.id, user: username}));
        }.bind(this, username, message));
    }

    update_user(username)
    {
        var profile = null;
        for(var i in this.users)
        {
            if(this.users[i].username == username)
            {
                profile = this.users[i];
                break;
            }
        }

        if(profile.update_in_progress !== null)
            return profile.update_in_progress;

        var defer = Q.defer();
        profile.update_in_progress = defer;

        this.get_user(username).then(function(profile, data){
            profile.last_updated = (new Date).getTime();

            db.osu.update({type: "user", username: data.username}, {$set: {pp: parseFloat(data.pp_raw), rank: parseInt(data.pp_rank), last_updated: profile.last_updated}}, {}, function (err, docs) {
                if (err !== null)
                    console.log(err);
            });

            profile.update_in_progress.resolve(data);
            profile.update_in_progress = null;
        }.bind(profile)).catch(function(err){
            profile.update_in_progress.reject(err);
            profile.update_in_progress = null;
        });

        return defer;
    }
}

module.exports = {
    moduleName: "osu!",
    load: function(Bot){
        var osu = new OsuModule(Bot);

        Bot.addCommand({
            name: "OSU_FOLLOWING",
            command: [
                /who are you following on osu/,
				/who do you follow on osu/,

                /show who you are following on osu/,
                /show (?: the)? (?: osu)?(?: follow|following|stalking) list/
            ],
            sample: "sempai who are you following on osu?",
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
                /follow (\w*)?(?: on )?(osu)?/,
                /stalk (\w*)?(?: on )?(osu)?/,
                /add (\w*)? to (?: follow| follow list| stalking list| following list| the follow list| the stalking list| the following list| the list| list)?(?: on )?(osu)?/
            ],
            sample: "sempai follow __*user*__  on osu",
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
                /stop following (\w*)?(?: on )?(osu)?/,
                /stop stalking (\w*)?(?: on )?(osu)?/,
                /remove (\w*)? from (?: follow| the follow list| the following list| the stalking list| follow list| following list| stalking list| the list| list)?(?: on )?(osu)?/
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

                db.osu.remove({type: "user", username: user}, {}, function (err, numrem) {
                    if(err)
                        console.log("Error removing '" + user + "' from osu db: " + err);
                });

                Bot.respond(m, responses.get("OSU_STOPPED").format({author: m.author.id, user: user}));
            }
        });

        Bot.addCommand({
            name: "OSU_CHECK",
            command: /check (\w*)?(?: on )?(osu)?/,
            sample: "sempai check __*user*__",
            description: "Forces Sempai to check the person for scores that Sempai may have somehow missed.",
            action: function(m, user){
                Bot.respond(m, responses.get("OSU_CHECK").format({author: m.author.id, user: user}));
                osu.force_check(user, m);
            }
        });

        db.osu.find({type: "user"}, function (err, docs) {
            if (err !== null)
                return console.log(err);

            for (var i = 0; i < docs.length; i++)
            {
                var user = {
                    username: docs[i].username,
                    pp: docs[i].pp,
                    rank: docs[i].rank,
                    last_updated: docs[i].last_updated,
                    update_in_progress: null
                };

                osu.users.push(user);

                var time = (new Date).getTime();
                if(user.last_updated === undefined || time - user.last_updated >= USER_UPDATE_INTERVAL)
                {
                    osu.update_user(user.username);
                }
            }
        });
    }
};
