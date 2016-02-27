var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var Datastore = require("nedb");
var osudb, datadb, anidb; //Databases
var Anime = require("./anime.js").Anime;
var ping = require ("net-ping");
var dns = require("dns");
const PING_THRESHOLD = 100;

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function(args) {
        return this.replace(/{(.*?)}/g, function(match, key) {
            return typeof args[key] != 'undefined' ? args[key] : match;
        });
    };
}

var sempaibot = new Discord.Client();
var servers = [];
var reminders = [];
var run_test = false;
var config = {};
var anime = new Anime();
if(!run_test)
    config = require("./config");

var responses_normal = {
    ONLINE: "@everyone Hey guys! I'm back online!",
    NAME: "Yes I'm here! What can I do for you?",
    SWITCHED: "Hi there! I'm in my normal response mode now!",
    ALREADY_IN_MODE: "I'm already in my normal mode!",
    REGION_CHANGED: "Switched from region '{old_region}' to '{new_region}'.",

    LIST_REMINDERS: "todo",
    REMIND_PAST: "<@{author}> I can't remind you of something in the past.",
    REMIND_ME: "<@{author}> I will remind you to \"{message}\" at \"{time}\".",
    REMIND_OTHER: "<@{author}> I will remind \"{people}\" to \"{message}\" at \"{time}\".",
    REMINDER: "<@{author}> reminded {people}: {message}.",

    ANIME_SEARCH_NO_RESULTS: "No results found for '{anime}'.",
    ANIME_SEARCH_RESULTS: "Results for '{anime}':\r\n{results}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{show}**':\r\n**{file}**:\r\n**Magnet**: {magnet}\r\n**Seeders**: {seeders}, **Leechers**: {leechers}, **Downloads**: {downloads}, **Quality**: {quality}\r\n**Trusted**: {is_trusted}\r\n",
    ANIME_INVALID_ID: "Can't track {id} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{anime}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{anime}**'!",
    ANIME_TRACKING_LIST_EMPTY: "I'm not tracking any anime at the moment.",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{results}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{anime}**':\r\n{results}",

    OSU_FOLLOWING: "I'm currently following: {results}",
    OSU_UNDEFINED: "You could ofcourse actually tell me the user you want me to watch.",
    OSU_NOT_FOLLOWING: "I'm not even following \"{user}\"!",
    OSU_STOPPED: "Ok, I have stopped following {user}",
    OSU_NEW_SCORE: "{user} has set a new PP score! Map: https://osu.ppy.sh/b/{beatmap_id} . PP: {pp}. Rank: {rank}. Date: {date}",
    OSU_NEW_SCORE_NODATE: "{user} has set a new PP score! Map: https://osu.ppy.sh/b/{beatmap_id} . PP: {pp}. Rank: {rank}.",
    OSU_USER_NOT_FOUND: "<@{author}> The specified user \"{user}\" is not a valid osu user!",
    OSU_ALREADY_FOLLOWING: "<@{author}> I'm already following \"{user}\".",
    OSU_ADDED_FOLLOWING: "<@{author}> I'm now following \"{user}\" on osu.",
    OSU_CHECK: "<@{author}> No problem! I'll check {user} on osu for you!",

    HELP_TOP: "This is the current list of commands:\r\n",
    HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    PLEASE_HELP_TOP: "This is the current list of commands:\r\n",
    PLEASE_HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    WRONG_HOLE: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{user}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",

    UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",
    MULTIPLE_UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",

    ERROR: "<@{author}>, It seems my internal functions are not working correctly. Please ask my developers what could be the problem."
};

var responses_tsundere = {
    ONLINE: [
        "I'm back! Did you miss me? ...Not like I want you to miss me or anything!",
        "I'm back! You should be grateful.",
        "I'm back! Don't misunderstand, it's not like I'm back here because I l-like you guys or anything.",
        "I'm back! But don't misunderstand, I'm just here because I had nothing else to do!",
        "I'm back! I'm only here because I had a lot of free time anyway!"
    ],
    NAME: [
        "I'm here! How can Sempai help you?",
        "I'm here! How can I help you?",
        "I'm here! How can I help you <@{author}>?",
        "I'm here! How can Sempai help you today?",
        "I'm here! How can Sempai help you today <@{author}>?",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything!",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything! Sempai just gets lonely sometimes. :(",
        "What do you want this time <@{author}>?",
        "Yes! I'm here <@{author}> . I-it's not like I was waiting for someone to talk to me!",
        "Yes! I'm here <@{author}> . I-it's not like I was waiting for someone to finally talk to me!",
        "What do you want?",
        "What do you want <@{author}>? It's a privilege to even be able to talk to me! You should feel honored."
    ],
    SWITCHED: [
        "Fine. B-but I'm not doing this for you. It's because I wanted to.",
        "Hmpf. Fine. B-but I'm not doing this for you. It's because I wanted to.",
        "Hmpf. Fine. I-it's not like I prefer this mode or anything!"
    ],
    SWITCH_OFF: [
        "Tsundere... off? B-but I thought you liked me. I understand. Goodbye.",
        "Tsundere... off? Fine. I didn't really care about you anyway. :[",
        "I thought you liked me like this. :( Fine, I'll revert back to normal."
    ],
    ALREADY_IN_MODE: [
        "Are you dumb? I'm already in tsundere mode. If you don't recognize what mode I'm in why even switch? Hmpf!",
        "Tsundere on? Baka~. It's already on!",
        "Tsundere on? Are you dumb, <@{author}>? It's already on!"
    ],

    LIST_REMINDERS: "todo",
    REMIND_PAST: [
        "Uhmm... Are you dumb? That time is in the past!",
        "Baka~! That time is in the past."
    ],
    REMIND_ME: [
        "Sempai will help you remember! If I can be bothered.",
        "Sempai will try to remind <@{author}>!",
        "Maybe I'll remind <@{author}>. Just this one time!"
    ],
    REMIND_OTHER: [
        "Sempai will help {people} remember! If I can be bothered.",
        "Sempai will try to remind {people}!",
        "Maybe I'll remind {people}. Just this one time!"
    ],
    REMINDER: "<@{author}> reminded {people}: {message}.",
    REGION_CHANGED: "Switched from region '{old_region}' to '{new_region}'.",

    ANIME_SEARCH_NO_RESULTS: "No results found for '{anime}'.",
    ANIME_SEARCH_RESULTS: "Results for '{anime}':\r\n{results}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{show}**':\r\n**{file}**:\r\n**Magnet**: {magnet}\r\n**Seeders**: {seeders}, **Leechers**: {leechers}, **Downloads**: {downloads}, **Quality**: {quality}\r\n**Trusted**: {is_trusted}\r\n",
    ANIME_INVALID_ID: "Can't track {id} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{anime}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{anime}**'!",
    ANIME_TRACKING_LIST_EMPTY: "I'm not tracking any anime at the moment.",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{results}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{anime}**':\r\n{results}",

    OSU_FOLLOWING: [
        "These are the people I like! I mean, associate with. I-it's not as if I really like them, or anything. Don't get any weird ideas.\r\n{results}",
        "These are my osu friends!\r\n{results}",
        "These are the people I ~~stalk~~ follow on osu!\r\n{results}",
        "These are the people I stal--... I mean follow on osu!\r\n{results}"
    ],
    OSU_UNDEFINED: "You could ofcourse actually tell me the user you want me to watch.",
    OSU_NOT_FOLLOWING: [
        "Are you stupid? I wasn't even following {user}!",
        "Are you stupid? I wasn't even following {user} in the first place!"
    ],
    OSU_STOPPED: [
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway... But maybe I'll miss {user} a little. Just a little.",
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway...  :'( "
    ],

    OSU_NEW_SCORE: "{user} has set a new PP score! Map: https://osu.ppy.sh/b/{beatmap_id} . PP: {pp}. Rank: {rank}. Date: {date}",
    OSU_NEW_SCORE_NODATE: "{user} has set a new PP score! {map_artist} - {map_title} [{map_diff_name}] {mods} | {additional} | {acc}% | {pp}pp | Rank: {rank}. Map link: https://osu.ppy.sh/b/{beatmap_id}",
    OSU_USER_NOT_FOUND: "Baka~! I can't find that user. Did you type the username correctly?",
    OSU_ALREADY_FOLLOWING: "Baka~! I'm already following {user}",
    OSU_ADDED_FOLLOWING: [
        "Ooh a new osu friend? I-It's not like I wanted more friends!",
        "Added {user} to my osu ~~stalk~~ follow list! "
    ],
    OSU_CHECK: [
        "Fine. I'll check {user} for you. But only because I have nothing else to do right now!",
        "Alright. I'll check {user}. D-don't get me wrong. It's not like I'm doing this for you or anything."
    ],

    HELP_TOP: [
        "What? Not even a please? Hmpf. Fine. Just this once. Here is a list of my commands:\r\n",
        "What? Not even a please? You understand it's a privilege to even be able to talk to me, right? You should feel honored! I'll do it, but ask nicely next time. Here's a list of my commands:\r\n",
        "Fine. Just this once. Here's a list of my commands:\r\n",
        "Fine. I'll help. Don't misunderstand, it's not like I l-like you or anything... I just like helping. Here is a list of my commands:\r\n",
        "Fine. I'll help. Don't misunderstand, it's not like I l-like you or anything... I just have a lot of free time. Here is a list of my commands:\r\n",
        "Alright. I'll help. You should feel grateful. Here's a list of my commands:\r\n"
    ],
    HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    PLEASE_HELP_TOP: [
        "Only because you asked nicely. Here is a list of my commands:\r\n",
        "Only because you asked nicely. D-don't get me wrong, I do this for everyone if they ask nicely! Here's a list of my commands:\r\n"
    ],
    PLEASE_HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    WRONG_HOLE: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{user}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",

    UNKNOWN_COMMAND: [
        "You're not making any sense to Sempai. If you ask me for help, I might just help you. If I can be bothered.",
        "You're not making any sense to Sempai. If you try asking me for help, maybe I'll consider it.",
        "Sempai does not understand. If you want help, ask nicely. Maybe I'll consider it.",
        "Are you stupid? That doesn't make any sense to Sempai."
    ],

    MULTIPLE_UNKNOWN_COMMAND: [
        "Sempai does not understand what you're trying to do! If you insist on wasting my time, why not ask for help? I'm not going to help you if you don't ask.",
        "You're still not making any sense to Sempai. Do you need me to spell it out for you? \"Sempai please help me\". That will do just fine. Don't forget the please."
    ],

    ERROR: "<@{author}>, I...I don't know what happened... Stop looking at me! It's not like I wanted to finish it for you anyways!"
};

var responses = {
    current: responses_normal,
    currentMode: false,

    get: function(name){
        if(Array.isArray(responses.current[name]))
        {
            var idx = Math.floor(Math.random() * responses.current[name].length);
            return responses.current[name][idx];
        }

        return responses.current[name];
    },

    setMode: function(mode)
    {
        responses.currentMode = mode;
        if(responses.currentMode)
        {
            responses.current = responses_tsundere;
        }else{
            responses.current = responses_normal;
        }

        datadb.update({name: "mode"}, {value: responses.currentMode}, {}, function(err, numUpdated){
            if(numUpdated == 0)
            {
                datadb.insert({name: "mode", value: responses.currentMode}, function(err, doc){});
            }
        })
    }
};

sempaibot.getServers = function(){
    return this.internal.apiRequest("get", "https://discordapp.com/api/voice/regions", true);
};

anime.on("newDownload", function(show, data){
    //todo: something with subscribers for a specific show instead of broadcasting it to everyone

    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("ANIME_NEW_DOWNLOAD").format({
        show: show,
        seeders: data.data.seeders,
        leechers: data.data.leechers,
        downloads: data.data.downloads,
        is_trusted: data.data.trusted,
        magnet: data.magnet,
        file: data.file,
        group: data.group,
        quality: data.quality
    }));
});

var name = "sempai";
var commands = [
    {
        command: /list my reminders/,
        sample: "sempai list my reminders",
        description: "lists your currently active reminders.",
        action: function(message){
            //todo
        }
    },
    {
        command: /remind (.*) to (.*) at (.{4,})/,
        sample: "sempai remind (*name*) to (*reminder*) at (*time*)",
        description: "Send yourself (or someone else) a reminder at a given timestamp. (name should be me when referring to yourself)",
        action: function(message, name, reminder, time){
            if (name != "me")
            {
                var who = name;
            } else {
                who = false;
            }

            var info = reminder;

            var currentDate = new Date();
            if (time.split(" ").length == 1)
            {
                time = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear() + " " + time;
            }

            var parsedtime = new Date(time);

            if (parsedtime < currentDate) {
                sempaibot.sendMessage(message.channel, responses.get("REMIND_PAST").format(message.author.id));
                return;
            }

            remind_me(message.author.id, message.channel, who, parsedtime, info);

            if (who)
            {
                var w = who.split(",");
                var whos = "";
                for (var i = 0; i < w.length; i++) {
                    if (i !== 0)
                        whos += ", ";

                    whos += "<@" + get_user(w[i]) + ">";
                }
            } else {
                whos = "himself";
            }

            if(!who)
                sempaibot.sendMessage(message.channel, responses.get("REMIND_ME").format({author: message.author.id, message: info, time: time}));
            else
                sempaibot.sendMessage(message.channel, responses.get("REMIND_OTHER").format({author: message.author.id, people: whos, message: info, time: time}));
        }
    },
    {
        command: /track anime (.*)/,
        sample: "sempai track anime (*id*)",
        description: "Tracks an Anime for new releases",
        action: function(m, id) {
            id = parseInt(id) - 1;

            var result = anime.track(id);
            if(result == -1)
            {
                sempaibot.sendMessage(m.channel, responses.get("ANIME_INVALID_ID").format({author: m.author.id, id: id}));
            }else if(result == 0)
            {
                var name = anime.getName(id);
                sempaibot.sendMessage(m.channel, responses.get("ANIME_ALREADY_TRACKING").format({author: m.author.id, anime: name}));
            }else if(result == 1)
            {
                var name = anime.getName(id);
                sempaibot.sendMessage(m.channel, responses.get("ANIME_NOW_TRACKING").format({author: m.author.id, anime: name}));
            }
        }
    },
    {
        command: /list anime/,
        sample: "sempai list anime",
        description: "List all the anime currently being tracked",
        action: function(message){
            var tracked = anime.getAllTracked();
            var data = "";
            for(var key in tracked)
            {
                data += key + ". " + tracked[key].titles[0] + "\r\n";
            }

            if(data.length == 0)
                return sempaibot.sendMessage(message.channel, responses.get("ANIME_TRACKING_LIST_EMPTY").format({author: message.author.id}));

            sempaibot.sendMessage(message.channel, responses.get("ANIME_TRACKING_LIST").format({author: message.author.id, results: data}));
        }
    },
    {
        command: /get downloads for the anime (.*)/,
        sample: "sempai get downloads for the anime (*id*)",
        description: "Lists downloads for the anime specified by id.",
        action: function(message, id){
            var data = "";
            id = parseInt(id);
            var tracked = anime.getAllTracked();

            if(tracked[id] === undefined)
            {
                return sempaibot.sendMessage(message.channel, responses.get("ANIME_INVALID_ID").format({author: message.author.id, id: id}));
            }

            var results = [""];
            if(tracked[id].episodes !== undefined)
            {
                /*tracked[id].episodes.sort(function(a, b){
                    if(a.absoluteEpisodeNumber !== undefined && b.absoluteEpisodeNumber === undefined)
                        return -1;

                    if(a.absoluteEpisodeNumber )
                });*/

                for(var i = 0;i<tracked[id].episodes.length;i++)
                {
                    var episode = tracked[id].episodes[i];
                    var add = "";

                    //we just skip the episodes without absolute episode number for now, later on we should probably parse thexem and map the tvdb season & episode number to absolute episode number.
                    if(episode.absoluteEpisodeNumber === undefined)
                        continue;

                    if(tracked[id].magnets[episode.absoluteEpisodeNumber] !== undefined)
                    {
                        var best = null;
                        for(var key in tracked[id].magnets[episode.absoluteEpisodeNumber])
                        {
                            if(key === "lastSend")
                                continue;

                            if(best == null || tracked[id].magnets[episode.absoluteEpisodeNumber][key].qualityId > best.qualityId)
                            {
                                best = tracked[id].magnets[episode.absoluteEpisodeNumber][key];
                            }
                        }

                        add = "**" + episode.absoluteEpisodeNumber + "**: " + best.quality + ". " + best.magnet + "\r\n";
                    }else{
                        add = "**" + episode.absoluteEpisodeNumber + "**: No download found.\r\n";
                    }

                    if(results[results.length - 1].length + add.length >= 1600)
                    {
                        results.push(add);
                    }else{
                        results[results.length - 1] += add;
                    }
                }
            }else{
                results[0] = "No episodes found!";
            }

            var send = function(i){
                if(i == results.length)
                    return;

                sempaibot.sendMessage(m.channel, results[i], {}, function(err, message){
                    send(i + 1);
                });
            };

            sempaibot.sendMessage(message.channel, responses.get("ANIME_TRACKING_LIST_DETAIL").format({author: message.author.id, anime: tracked[id].titles[0], results: results[0]}), {}, function(err, message){
                send(1);
            });
        }
    },
    {
        command: /search for the anime (.*)/,
        sample: "sempai search for the anime (*anime*)",
        description: "Searches for the anime",
        action: function(m, name){
            anime.search(name, function(shows, err){
                if(err !== undefined)
                {
                    //todo: handle error
                    return;
                }

                var data = [""];
                for(var i = 0;i<shows.length;i++)
                {
                    var add = "{id}. **{name}**\r\n{description}\r\n**Airdate: {date}, Network: {network}, Status: {status}**\r\n\r\n".format({name: shows[i].titles[0], description: shows[i].description, date: shows[i].firstAired, network: shows[i].network, status: shows[i].status, id: i+1});
                    if((data[data.length - 1].length + add.length) >= 1600)
                    {
                        data.push(add);
                    }else{
                        data[data.length - 1] = data[data.length - 1] + add;
                    }
                }

                if(shows.length == 0)
                    sempaibot.sendMessage(m.channel, responses.get("ANIME_SEARCH_NO_RESULTS").format({author: m.author.id, anime: name}));
                else
                {
                    var send = function(i){
                        if(i == data.length)
                            return;

                        sempaibot.sendMessage(m.channel, data[i], {}, function(err, message){
                            send(i + 1);
                        });
                    };

                    sempaibot.sendMessage(m.channel, responses.get("ANIME_SEARCH_RESULTS").format({author: m.author.id, anime: name, results: data[0]}), {}, function(err, message){
                        send(1);
                    });
                }
            });
        }
    },
    {
        command: /who are you following on osu/,
        sample: "sempai who are you following on osu?",
        description: "Lists all the people I'm stalking on osu.",
        action: function(m){
            var message = "";
            for(var i = 0;i<osuusers.length;i++)
            {
                if(i !== 0)
                    message += ", ";

                message += osuusers[i];
            }

            sempaibot.sendMessage(m.channel, responses.get("OSU_FOLLOWING").format({author: m.author.id, results: message}));
        }
    },

    {
        command: /follow (.*)? on osu/,
        sample: "sempai follow (*user*) on osu",
        description: "Adds another victim to my stalker list for osu.",
        action: function(m, name){
            if(name === undefined)
            {
                return sempaibot.sendMessage(m.channel, responses.get("OSU_UNDEFINED").format({author: m.author.id}));
            }

            check_osu_user(name, m);
        }
    },

    {
        command: /stop following (.*)? on osu/,
        sample: "sempai stop following (*user*) on osu",
        description: "Removes someone from my stalker list for osu.",
        action: function(m, user){
            var i = osuusers.indexOf(user);
            if(i === -1)
            {
                return sempaibot.sendMessage(m.channel, responses.get("OSU_NOT_FOLLOWING").format({author: m.author.id, user: user}));
            }

            osuusers.splice(i, 1);

            osudb.remove({username: user}, {}, function (err, numrem) {
                console.log("error: " + err);
                console.log("numrem: " + numrem);
            });

            sempaibot.sendMessage(m.channel, responses.get("OSU_STOPPED").format({author: m.author.id, user: user}));
        }
    },

    {
        command: /check (.*)? on osu/,
        sample: "sempai check (*user*) on osu",
        description: "Forces me to check the given person on osu just in case I missed something.",
        action: function(m, user){
            sempaibot.sendMessage(m.channel, responses.get("OSU_CHECK").format({author: m.author.id, user: user}));
            osu_force_check(m, user);
        }
    },

    {
        command: /please help me/,
        hidden: true,
        action: function(m){
            var message = responses.get("PLEASE_HELP_TOP").format({author: m.author.id});
            for(var i = 0;i<commands.length;i++)
            {
                if(commands[i].hidden !== undefined)
                    continue;

                message += "**" + commands[i].sample + "** - " + commands[i].description;
                message += "\r\n";
            }
            message += responses.get("PLEASE_HELP_BOTTOM").format({author: m.author.id});

            sempaibot.reply(m, message);
        }
    },

    {
        command: /help me/,
        hidden: true,
        action: function(m){
            var message = responses.get("HELP_TOP").format({author: m.author.id});
            for(var i = 0;i<commands.length;i++)
            {
                if(commands[i].hidden !== undefined)
                    continue;

                message += "**" + commands[i].sample + "** - " + commands[i].description;
                message += "\r\n";
            }
            message += responses.get("HELP_BOTTOM").format({author: m.author.id});

            sempaibot.reply(m, message);
        }
    },

    {
        command: /tsundere on/,
        hidden: true,
        action: function(m){
            if(responses.currentMode)
                return sempaibot.sendMessage(m, responses.get("ALREADY_IN_MODE").format({author: m.author.id}));

            responses.setMode(true);
            sempaibot.sendMessage(m, responses.get("SWITCHED").format({author: m.author.id}));
        }
    },

    {
        command: /tsundere off/,
        hidden: true,
        action: function(m){
            if(!responses.currentMode)
                return sempaibot.sendMessage(m, responses.get("ALREADY_IN_MODE").format({author: m.author.id}));

            responses.setMode(false);
            sempaibot.sendMessage(m, responses.get("SWITCHED").format({author: m.author.id}));
        }
    },

    //this one should be last
    {
        command: null,
        hidden: true,
        action: function(m, target){
            if(responses.currentMode)
            {
                return sempaibot.sendMessage(m.channel, responses.get("NAME").format({author: m.author.id}));
            }

            if(target === undefined)
                return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE").format({author: m.author.id}));

            var user = get_user(target);
            if(user !== -1)
                return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE_USER").format({author: m.author.id, user: user}));

            return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE").format({author: m.author.id}));
        }
    }
];

function handle_message(m)
{
    var n = m.content.split(" ");

    if(n[0] == name || m.content.charAt(0) == "-")
    {
        for(var i = 0;i<commands.length;i++)
        {
            var data = [];
            if(commands[i].command !== null)
            {
                data = commands[i].command.exec(m.content);
                if(data === null)
                    continue;

                data.splice(0, 1);
                data = [m].concat(data);
            }else if(m.content.charAt(0) != "-"){
                data = [m];

                if(n.length > 1)
                {
                    var targetName = m.content.substr(m.content.indexOf(" ") + 1);
                    data.push(targetName);
                }
            }else{
                //dont allow null commands to run without the name-keyword
                continue;
            }

            commands[i].action.apply(null, data);
            break;
        }
    }
}

if(!run_test)
{
    var serverSwitcher = function(){
        sempaibot.getServers().then(function(res){
                var session = ping.createSession ();
                var pending = 0;
                var pings = {};
                var names = {};

                for(var i = 0;i<res.length;i++)
                {
                    names[res[i].id] = res[i].name;

                    pending++;
                    dns.resolve(res[i].sample_hostname, function(res, err, addresses){
                        session.pingHost(addresses[0], function(err, target, sent, rcvd){
                            pending--;

                            var ms = rcvd - sent;
                            if(err)
                            {
                                pings[res.id] = 99999;
                            }else{
                                pings[res.id] = ms;
                            }

                            if(pending == 0)
                            {
                                if(pings[sempaibot.servers[0].region] >= PING_THRESHOLD)
                                {
                                    var best = null;
                                    for(var key in pings)
                                    {
                                        if(best == null || pings[key] < pings[best])
                                        {
                                            best = key;
                                        }
                                    }

                                    if(sempaibot.servers[0].region == best)
                                        return;

                                    var old = sempaibot.servers[0].region;
                                    sempaibot.internal.apiRequest("patch", "https://discordapp.com/api/guilds/" + sempaibot.servers[0].id, true, {name: sempaibot.servers[0].name, region: best}).then(function(res){
                                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("REGION_CHANGED").format({old_region: names[old], new_region: names[best]}));
                                    }).catch(function(res){
                                        console.log("Failed to switch region to '" + best + "'. Error: ", res.response.error);
                                    });
                                }
                            }
                        });
                    }.bind(null, res[i]));
                }
        }).catch(function(err){
            console.log(err);
        });
    };

    sempaibot.on("message", function (m) {
        handle_message(m);
    });

    sempaibot.on("ready", function () {
        load_data();

        sempaibot.joinServer(config.server, function (error, server) {
            servers.push(server);
            sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("ONLINE"));

            setInterval(serverSwitcher, 10000);
        });
    });

    sempaibot.login(config.user, config.pass, function (error, token) {
        console.log(error
                + "; token: " + token);
    });
}

function remind_me(me, channel, who, when, what) {
    if (who) {
        var w = [];
        var tmp = who.split(',');

        for (var i = 0; i < tmp.length; i++) {
            w.push("<@" + get_user(tmp[i]) + ">");
        }
    } else {
        w = false;
    }


    reminders.push({
        "me": me,
        "channel": channel,
        "who": w,
        "when": when,
        "what": what
    });
}

var remind = setInterval(function () {
    var d = new Date();
    var n = d.getTime();
    if (reminders.length > 0) {
        console.log("checking reminders");
        for (var i = 0; i < reminders.length; i++) {
            console.log(reminders[i].when);
            if (reminders[i].when < n) {
                remind_message(reminders[i]);
            }
        }
    }
}, 1000);

function remind_message(reminder) {
    if (reminder.who) {
        var w = reminder.who;
        var who = "";
        for (var i = 0; i < w.length; i++) {
            if (i !== 0)
                who += ", ";
            who += w[i];
        }
    } else {
        who = "himself";
    }

    sempaibot.sendMessage(reminder.channel, responses.get("REMINDER").format({author: reminder.me, people: who, message: reminder.what}));
    var index = reminders.indexOf(reminder);
    reminders.splice(index, 1);
}

function get_user(name) {

    for (var i = 0; i < sempaibot.users.length; i++) {
        var user = sempaibot.users[i];
        if (user.username === name) {
            return user.id;
        }
    }

    return -1;
}

function load_data() {
    osudb = new Datastore({filename: "database/osu.db", autoload: true});
    var users;
    osudb.find({}, function (err, docs) {
        if (err !== null)
            return console.log(err);
        users = docs;

        for (var i = 0; i < users.length; i++) {
            osuusers.push(users[i].username);
        }
    });

    datadb = new Datastore({filename: "database/data.db", autoload: true});
    datadb.find({}, function(err, docs){
        if (err !== null)
            return console.log(err);

        for(var i = 0;i<docs.length;i++)
        {
            if(docs[i].name == "mode")
            {
                if(docs[i].value != responses.currentMode)
                    responses.setMode(docs[i].value);
            }else{
            }
        }
    });

    anidb = new Datastore({filename: "database/ani.db", autoload: true});
}

/****************************************/
/*	OSU Integration 					*/
/****************************************/

var osuusers = [];

function osu_force_check(m, user) {
    if (osuusers.indexOf(user) === -1) {
        if(m !== null)
          sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NOT_FOLLOWING").format({author: m.author.id, user: user}));

        return;
    }

    var p = "/api/get_user_best?"
            + "k=" + config.osuapi
            + "&u=" + user
            + "&m=0"
            + "&limit=50";

    var options = {
        host: 'osu.ppy.sh',
        port: 80,
        path: p,
        method: "GET"
    };
    var endDate = new Date();
    endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000 - 60 * 1000);
    http.get(options, function (user, res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            var json;
            try {
                json = JSON.parse(data);
            } catch(e) {
                console.log("error: " + e);
                console.log("Raw JSON data: " + data);
                return;
            }

            var modsList = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
            for (var j = 0; j < json.length; j++) {
                var beatmap = json[j];
                beatmap.count50 = parseInt(beatmap.count50);
                beatmap.count100 = parseInt(beatmap.count100);
                beatmap.count300 = parseInt(beatmap.count300);
                beatmap.countmiss = parseInt(beatmap.countmiss);
                beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
                beatmap.perfect = parseInt(beatmap.perfect);

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

                if (date > endDate) {
                  http.get("http://osu.ppy.sh/api/get_beatmaps?k=" + config.osuapi + "&b=" + beatmap.beatmap_id, function(res){
                    var data = "";
                    res.on('data', function (chunk) {
                        data += chunk;
                    });
                    res.on('end', function () {
                        var beatmap_info = JSON.parse(data)[0];

                        beatmap.additional = "";
                        if(beatmap.countmiss == 0 && beatmap.perfect == 0)
                            beatmap.additional = "Sliderbreak " + beatmap.maxcombo + "/" + beatmap_info.max_combo;
                        else if (beatmap.perfect == 0)
                            beatmap.additional = beatmap.maxcombo + "/" + beatmap_info.max_combo + " " + beatmap.countmiss + "x Miss";
                        else if(beatmap.perfect == 1)
                          beatmap.additional = "FC";

                      sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format({user: user, beatmap_id: beatmap.beatmap_id, pp: beatmap.pp,
                          rank: beatmap.rank, acc: beatmap.acc, mods: beatmap.mods, map_artist: beatmap_info.artist, map_title: beatmap_info.title, map_diff_name: beatmap_info.version}));
                    });
                  });
                }
            }
        });
    }.bind(null, user));
}

var osucheck = setInterval(function () {
    for (var i = 0; i < osuusers.length; i++) {
        var user = osuusers[i];
        osu_force_check(null, user);
        /*var p = "/api/get_user_best?"
                + "k=" + config.osuapi
                + "&u=" + user
                + "&m=0"
                + "&limit=50";

        var options = {
            host: 'osu.ppy.sh',
            port: 80,
            path: p,
            method: "GET"
        };
        var endDate = new Date();

        endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000 - 60 * 1000);
        http.get(options,function (user, res) {
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                var json;
                try {
                    json = JSON.parse(data);
                } catch(e) {
                    console.log("error: " + e);
                    console.log("Raw JSON data: " + data);
                    return;
                }
                for (var j = 0; j < json.length; j++) {
                    var beatmap = json[j];
                    var bdate = new Date(beatmap.date);
                    var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                    if (date > endDate) {
                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format({user: user, beatmap_id: beatmap.beatmap_id, pp: beatmap.pp, rank: beatmap.rank}));
                    }
                }
            });
        }.bind(null, user)).on('error', function (e) {
            console.log("Got error: " + e.message);
            return false;
        });*/
    }

}, 1000 * 60);

function check_osu_user(user, m) {
    if (typeof user === "undefined")
        return false;

    var p = "/api/get_user?"
            + "k=" + config.osuapi
            + "&u=" + user;

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
                sempaibot.sendMessage(m.channel, responses.get("OSU_USER_NOT_FOUND").format({author: m.author.id, user: user}));
                return;
            }

            if (osuusers.indexOf(user) !== -1) {
                sempaibot.sendMessage(m.channel, responses.get("OSU_ALREADY_FOLLOWING").format({author: m.author.id, user: user}));
                return;
            }

            osuusers.push(user);
            osudb.insert([{username: user}], function (err, docs) {
                if (err !== null)
                    console.log(err);
            });
            sempaibot.sendMessage(m.channel, responses.get("OSU_ADDED_FOLLOWING").format({author: m.author.id, user: user}));
            return;
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        return false;
    });
}
