var db = require("../db.js");
var responses = require("../responses.js");
var config = require("../config");
var http = require("http");
var request = require("request");

function OsuModule(Bot)
{
    this.osuusers = [];
    this.Bot = Bot;
    this.osucheck = setInterval(function () {
        for (var i = 0; i < this.osuusers.length; i++) {
            var user = this.osuusers[i];
            this.osu_force_check(null, user.username);
        }
    }.bind(this), 1000 * 60);
}

function get_user_data(user, callback)
{
    request.get("http://osu.ppy.sh/api/get_user?k=" + config.osuapi + "&u=" + user, function(error, response, body){
        var user_data = JSON.parse(body)[0];
        callback(user_data);
    });
};

OsuModule.prototype.osu_force_check = function(m, user) {
    var user_profile = null;
    for(var i = 0;i<this.osuusers.length;i++)
    {
        if(this.osuusers[i].username == user)
        {
            user_profile = this.osuusers[i];
            break;
        }
    }

    if (user_profile == null) {
        if(m !== null)
            this.Bot.discord.sendMessage(this.Bot.discord.channels.get("name", "osu"), responses.get("OSU_NOT_FOLLOWING").format({author: m.author.id, user: user}));

        return;
    }

    var p = "/api/get_user_best?"
            + "k=" + config.osuapi
            + "&u=" + user
            + "&m=0"
            + "&limit=50";

    var _this = this;
    var options = {
        host: 'osu.ppy.sh',
        port: 80,
        path: p,
        method: "GET"
    };
    var endDate = new Date();
    endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000 - 1 * 60 * 1000);
    http.get(options, function (user, res)
	{
        var data = "";
        res.on('data', function (chunk)
		{
            data += chunk;
        });
        res.on('end', function ()
		{
            var json;
            try
			{
                json = JSON.parse(data);
            }
			catch(e)
			{
                console.log("error: " + e);
                console.log("Raw JSON data: " + data);
                return;
            }

            var modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];

            var  topRank;
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

                var totalPointOfHits = beatmap.count50*50 + beatmap.count100*100 + beatmap.count300 * 300;
                var totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;
                beatmap.acc = (totalPointOfHits / (totalNumberOfHits*300) * 100).toFixed(2);

                if(["X", "XH"].indexOf(beatmap.rank) != -1)
                    beatmap.rank = "SS";
                else if(beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";
                for(var i = 0;i<16;i++)
                {
                  if((beatmap.enabled_mods & (1 << i)) > 0)
                    beatmap.mods += ((beatmap.mods.length != 0) ? "" : "+") + modsList[i];
                }


                var bdate = new Date(beatmap.date);
                var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                if (date > endDate)
				{
                    topRank = j+1;
					http.get("http://osu.ppy.sh/api/get_beatmaps?k=" + config.osuapi + "&b=" + beatmap.beatmap_id, function(beatmap, res)
					{
						var data = "";
						res.on('data', function (chunk)
						{
							data += chunk;
						});

						res.on('end', function ()
						{
                            var beatmap_info = JSON.parse(data)[0];
                            get_user_data(user, function(user_data){
                                db.osu.update({type: "user", username: user}, {$set: {pp: parseFloat(user_data.pp_raw), rank: parseInt(user_data.pp_rank)}}, {}, function (err, docs) {
                                    if (err !== null)
                                        console.log(err);
                                });

                                var deltapp = user_data.pp_raw - user_profile.pp;
                                var oldRank = user_profile.rank;
                                var deltaRank = user_data.pp_rank - user_profile.rank;

                                if(deltapp > 0)
                                    deltapp = "+" + deltapp.toFixed(2);
                                else if(deltapp < 0)
                                    deltapp = deltapp.toFixed(2);
                                else
                                    deltapp = "no gain";

                                if(deltaRank == 0)
                                    deltaRank = "no gain";
                                else if(deltaRank > 0)
                                    deltaRank += " lost";
                                else if(deltaRank < 0)
                                    deltaRank = Math.abs(deltaRank) + " gained";

                                var newRank = user_profile.rank = parseInt(user_data.pp_rank);
                                user_profile.pp = parseFloat(user_data.pp_raw);

                                beatmap.additional = "";
    							/*if(beatmap.countmiss == 0 && beatmap.perfect == 0)
    								beatmap.additional = "**" + beatmap.maxcombo + "/" + beatmap_info.max_combo + "** Sliderbreak";
    							else */if (beatmap.perfect == 0)
    								beatmap.additional = "| **" + beatmap.maxcombo + "/" + beatmap_info.max_combo + "** " + beatmap.countmiss + "x Miss";
    							/*else if(beatmap.perfect == 1)
    								beatmap.additional = "**FC**";*/

    							_this.Bot.discord.sendMessage(_this.Bot.discord.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format({user: user, beatmap_id: beatmap.beatmap_id, pp: beatmap.pp,
    								rank: beatmap.rank, acc: beatmap.acc, mods: beatmap.mods, map_artist: beatmap_info.artist, map_title: beatmap_info.title, map_diff_name: beatmap_info.version, additional: beatmap.additional,
                                    top_rank: topRank, delta_pp: deltapp, old_rank: oldRank, new_rank: newRank, delta_rank: deltaRank}));
                            });
						});
					}.bind(null, beatmap));
                }
            }
        });
    }.bind(null, user));
}

OsuModule.prototype.check_osu_user = function(user, m) {
    if (typeof user === "undefined")
        return false;

    var p = "/api/get_user?"
            + "k=" + config.osuapi
            + "&u=" + user;

    var _this = this;
    var options = {
        host: 'osu.ppy.sh',
        port: 80,
        path: p,
        method: "GET"
    };

    http.get(options, function (res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            var json = JSON.parse(data)[0];
            if(json === undefined || json.username === undefined)
            {
                _this.Bot.discord.sendMessage(m.channel, responses.get("OSU_USER_NOT_FOUND").format({author: m.author.id, user: user}));
                return;
            }

            var found = false;
            for(var i = 0;i<_this.osuusers.length;i++)
            {
                if(_this.osuusers[i].username == user)
                {
                    found = true;
                    break;
                }
            }

            if (found)
            {
                _this.Bot.discord.sendMessage(m.channel, responses.get("OSU_ALREADY_FOLLOWING").format({author: m.author.id, user: user}));
                return;
            }

            _this.osuusers.push({username: user, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank)});
            db.osu.insert({type: "user", username: user, pp: parseFloat(json.pp_raw), rank: parseInt(json.pp_rank)}, function (err, docs) {
                if (err !== null)
                    console.log(err);
            });
            _this.Bot.discord.sendMessage(m.channel, responses.get("OSU_ADDED_FOLLOWING").format({author: m.author.id, user: user}));
            return;
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        return false;
    });
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
                for(var i = 0;i<osu.osuusers.length;i++)
                {
                    if(i !== 0)
                        message += ", ";

                    message += osu.osuusers[i].username;
                }

                Bot.discord.sendMessage(m.channel, responses.get("OSU_FOLLOWING").format({author: m.author.id, results: message}));
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
                    return Bot.discord.sendMessage(m.channel, responses.get("OSU_UNDEFINED").format({author: m.author.id}));
                }

                osu.check_osu_user(name, m);
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
                for(var j = 0;j<osu.osuusers.length;j++)
                {
                    if(osu.osuusers[j].username == user)
                    {
                        i = j;
                        break;
                    }
                }

                if(i === -1)
                {
                    return Bot.discord.sendMessage(m.channel, responses.get("OSU_NOT_FOLLOWING").format({author: m.author.id, user: user}));
                }

                osu.osuusers.splice(i, 1);

                db.osu.remove({type: "user", username: user}, {}, function (err, numrem) {
                    if(err)
                        console.log("Error removing '" + user + "' from osu db: " + err);
                });

                Bot.discord.sendMessage(m.channel, responses.get("OSU_STOPPED").format({author: m.author.id, user: user}));
            }
        });

        Bot.addCommand({
            name: "OSU_CHECK",
            command: /check (\w*)?(?: on )?(osu)?/,
            sample: "sempai check __*user*__",
            description: "Forces Sempai to check the person for scores that Sempai may have somehow missed.",
            action: function(m, user){
                Bot.discord.sendMessage(m.channel, responses.get("OSU_CHECK").format({author: m.author.id, user: user}));
                osu.osu_force_check(m, user);
            }
        });

        db.osu.find({type: "user"}, function (err, docs) {
            if (err !== null)
                return console.log(err);

            for (var i = 0; i < docs.length; i++) {
                osu.osuusers.push({username: docs[i].username, pp: docs[i].pp, rank: docs[i].rank});
            }
        });
    }
};

if(require.main === module)
{
    request.get("http://osu.ppy.sh/api/get_user?k=" + config.osuapi + "&u=chezus", function(error, response, body){
        var user_data = JSON.parse(body)[0];
        console.log(user_data);
    });
}
