var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var Datastore = require("nedb");
var osudb, datadb, anidb; //Databases
var Anime = require("./anime.js").Anime;

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
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
    
    LIST_REMINDERS: "todo",
    REMIND_PAST: "<@{0}> I can't remind you of something in the past.",
    REMIND_ME: "<@{0}> I will remind you to \"{1}\" at \"{2}\".",
    REMIND_OTHER: "<@{0}> I will remind \"{1}\" to \"{2}\" at \"{3}\".",
    REMINDER: "<@{0}> reminded {1}: {2}.",
    
    ANIME_SEARCH_NO_RESULTS: "No results found for '{1}'.",
    ANIME_SEARCH_RESULTS: "Results for '{1}':\r\n{2}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{0}**':\r\n**{6}**:\r\n**Magnet**: {5}\r\n**Seeders**: {1}, **Leechers**: {2}, **Downloads**: {3}, **Quality**: {8}\r\n**Trusted**: {4}\r\n",
    ANIME_INVALID_ID: "Can't track {1} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{1}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{1}**'!",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{1}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{1}**':\r\n{2}",
    ANIME_UNDEFINED: "You could ofcourse actually tell me what anime to search for.",
    ANIME_DOWN: "<@{0}> Oops, looks like {1} is down.",
    NO_ANIME_FOUND: "<@{0}> I couldn't find anything with the name \"{1}\"",
    
    OSU_FOLLOWING: "I'm currently following: {1}",
    OSU_UNDEFINED: "You could ofcourse actually tell me the user you want me to watch.",
    OSU_NOT_FOLLOWING: "I'm not even following \"{1}\"!",
    OSU_STOPPED: "Ok, I have stopped following {1}",
    OSU_NEW_SCORE: "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}. Date: {4}",
    OSU_NEW_SCORE_NODATE: "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}.",
    OSU_USER_NOT_FOUND: "<@{0}> The specified user \"{1}\" is not a valid osu user!",
    OSU_ALREADY_FOLLOWING: "<@{0}> I'm already following \"{1}\".",
    OSU_ADDED_FOLLOWING: "<@{0}> I'm now following \"{1}\" on osu.",
    OSU_CHECK: "<@{0}> No problem! I'll check {1} on osu for you!",
    
    HELP_TOP: "This is the current list of commands:\r\n",
    HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
   
    PLEASE_HELP_TOP: "This is the current list of commands:\r\n",
    PLEASE_HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    
    WRONG_HOLE: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{1}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    
    UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",
    MULTIPLE_UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",
    
    ERROR: "<@{0}>, It seems my internal functions are not working correctly. Please ask my developers what could be the problem."
};

var responses_tsundere = {
    ONLINE: [
        "I'm back! Did you miss me? ...Not like I want you to miss me or anything!",
        "I'm home!",
        "I'm back! You should be grateful.",
        "I'm back! Don't misunderstand, it's not like I'm back here because I l-like you guys or anything.",
        "I'm back! But don't misunderstand, I'm just here because I had nothing else to do!",
        "I'm back! I'm only here because I had a lot of free time anyway!"
    ],
    NAME: [
        "I'm here! How can Sempai help you?",
        "I'm here! How can I help you?",
        "I'm here! How can I help you <@{0}>?",
        "I'm here! How can Sempai help you today?",
        "I'm here! How can Sempai help you today <@{0}>?",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything!",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything! Sempai just gets lonely sometimes. :(",
        "And? What do you want? ",
        "And? What do you want <@{0}>?",
        "What do you want this time <@{0}>?",
        "Yes! I'm here <@{0}> . I-it's not like I was waiting for someone to talk to me!",
        "Yes! I'm here <@{0}> . I-it's not like I was waiting for someone to finally talk to me!",
        "What do you want?",
        "What do you want <@{0}>? It's a privilege to even be able to talk to me! You should feel honored."
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
        "Tsundere on? Are you dumb, <@{0}> ? It's already on!"
    ],
    
    LIST_REMINDERS: "todo",
    REMIND_PAST: [
        "Uhmm... Are you dumb? That time is in the past!",
        "Baka~! That time is in the past."
    ],
    REMIND_ME: [
        "Sempai will help you remember! If I can be bothered.",
        "Sempai will try to remind <@{0}>!",
        "Maybe I'll remind <@{0}>. Just this one time!"
    ],
    REMIND_OTHER: [
        "Sempai will help {1} remember! If I can be bothered.",
        "Sempai will try to remind {1}!",
        "Maybe I'll remind {1}. Just this one time!"
    ],
    REMINDER: "<@{0}> reminded {1}: {2}.",
    
    ANIME_SEARCH_NO_RESULTS: "No results found for '{1}'.",
    ANIME_SEARCH_RESULTS: "Results for '{1}':\r\n{2}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{0}**':\r\n**{6}**:\r\n**Magnet**: {5}\r\n**Seeders**: {1}, **Leechers**: {2}, **Downloads**: {3}, **Quality**: {8}\r\n**Trusted**: {4}\r\n",
    ANIME_INVALID_ID: "Can't track {1} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{1}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{1}**'!",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{1}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{1}**':\r\n{2}",
    ANIME_UNDEFINED: "You could ofcourse actually tell me what anime to search for.",
    ANIME_DOWN: "<@{0}> Oops, looks like {1} is down.",
    NO_ANIME_FOUND: "<@{0}> Baka... I don't even own this anime collection...",
    
    OSU_FOLLOWING: [
        "These are the people I like! I mean, associate with. I-it's not as if I really like them, or anything. Don't get any weird ideas.\r\n{1}",
        "These are my osu friends!\r\n{1}",
        "These are the people I ~~stalk~~ follow on osu!\r\n{1}",
        "These are the people I stal--... I mean follow on osu!\r\n{1}"
    ],
    OSU_UNDEFINED: "You could ofcourse actually tell me the user you want me to watch.",
    OSU_NOT_FOLLOWING: [
        "Are you stupid? I wasn't even following {1}!",
        "Are you stupid? I wasn't even following {1} in the first place!"
    ],
    OSU_STOPPED: [
        "Okay. I won't follow {1} anymore. I-it's not like I really liked that person or anything anyway... But maybe I'll miss {1} a little. Just a little.",
        "Okay. I won't follow {1} anymore. I-it's not like I really liked that person or anything anyway...  :'( "
    ],
    OSU_NEW_SCORE: "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}. Date: {4}",
    OSU_NEW_SCORE_NODATE: "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}.",
    OSU_USER_NOT_FOUND: "Baka~! I can't find that user. Did you type the username correctly?",
    OSU_ALREADY_FOLLOWING: "Baka~! I'm already following {1}",
    OSU_ADDED_FOLLOWING: [
        "Ooh a new osu friend? I-It's not like I wanted more friends!",
        "Added {1} to my osu ~~stalk~~ follow list! "
    ],
    OSU_CHECK: [
        "Fine. I'll check {1} for you. But only because I have nothing else to do right now!",
        "Alright. I'll check {1}. D-don't get me wrong. It's not like I'm doing this for you or anything."
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
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{1}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    
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
    
    ERROR: "<@{0}>, I...I don't know what happened... Stop looking at me! It's not like I wanted to finish it for you anyways!"
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

//ANIME_NEW_DOWNLOAD: "New download for show '{0}':\r\n{6}:\r\nMagnet: {5}\r\nSeeders: {1}, Leechers: {2}, Downloads: {3}, Quality: {8}\r\nTrusted: {4}\r\n"
anime.on("newDownload", function(show, data){
    //todo: something with subscribers for a specific show instead of broadcasting it to everyone
    
    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("ANIME_NEW_DOWNLOAD").format(show, data.data.seeders, data.data.leechers, data.data.downloads, data.data.trusted, data.magnet, data.file, data.group, data.quality));
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
                sempaibot.sendMessage(message.channel, responses.get("REMIND_ME").format(message.author.id, info, time));
            else
                sempaibot.sendMessage(message.channel, responses.get("REMIND_OTHER").format(message.author.id, whos, info, time));
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
                sempaibot.sendMessage(m.channel, responses.get("ANIME_INVALID_ID").format(m.author.id, id));
            }else if(result == 0)
            {
                var name = anime.getName(id);
                sempaibot.sendMessage(m.channel, responses.get("ANIME_ALREADY_TRACKING").format(m.author.id, name));
            }else if(result == 1)
            {
                var name = anime.getName(id);
                sempaibot.sendMessage(m.channel, responses.get("ANIME_NOW_TRACKING").format(m.author.id, name));
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
                data = "You aren't tracking any anime at the moment!";
            
            sempaibot.sendMessage(message.channel, responses.get("ANIME_TRACKING_LIST").format(message.author.id, data));
        }
    },
    {
        command: /get downloads for anime (.*)/,
        sample: "sempai get downloads for (*id*)",
        description: "Lists downloads for the anime specified by id.",
        action: function(message, id){
            var data = "";
            id = parseInt(id);
            var tracked = anime.getAllTracked();
            
            if(tracked[id] === undefined)
            {
                return sempaibot.sendMessage(message.channel, responses.get("ANIME_INVALID_ID").format(message.author.id, id));
            }
            
            var results = "";
            if(tracked[id].episodes !== undefined)
            {
                for(var i = 0;i<tracked[id].episodes.length;i++)
                {
                    var episode = tracked[id].episodes[i];
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
                        
                        results += "**" + episode.absoluteEpisodeNumber + "**: " + best.quality + ". " + best.magnet + "\r\n";
                    }else{
                        results += "**" + episode.absoluteEpisodeNumber + "**: No download found.\r\n";
                    }
                }
            }else{
                results += "No episodes found!";
            }
            
            sempaibot.sendMessage(message.channel, responses.get("ANIME_TRACKING_LIST_DETAIL").format(message.author.id, tracked[id].titles[0], results));
        }
    },
    {
        command: /search for the anime (.*)/,
        sample: "sempai search for the anime (*anime*)",
        description: "Searches for the anime",
        action: function(m, name){
            anime.search(name, function(shows){
                var data = "";
                for(var i = 0;i<shows.length;i++)
                {
                    data += "{5}. **{0}**\r\n{1}\r\n**Airdate: {2}, Network: {3}, Status: {4}**\r\n\r\n".format(shows[i].titles[0], shows[i].description, shows[i].firstAired, shows[i].network, shows[i].status, i+1);
                }
                
                if(shows.length == 0)
                    sempaibot.sendMessage(m.channel, responses.get("ANIME_SEARCH_NO_RESULTS").format(m.author.id, name));
                else
                    sempaibot.sendMessage(m.channel, responses.get("ANIME_SEARCH_RESULTS").format(m.author.id, name, data));
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
            
            sempaibot.sendMessage(m.channel, responses.get("OSU_FOLLOWING").format(m.author.id, message));
        }
    },
    
    {
        command: /follow (.*)? on osu/,
        sample: "sempai follow (*user*) on osu",
        description: "Adds another victim to my stalker list for osu.",
        action: function(m, name){
            if(name === undefined)
            {
                return sempaibot.sendMessage(m.channel, responses.get("OSU_UNDEFINED").format(m.author.id));
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
                return sempaibot.sendMessage(m.channel, responses.get("OSU_NOT_FOLLOWING").format(m.author.id, user));
            }
            
            osuusers.splice(i, 1);

            osudb.remove({username: user}, {}, function (err, numrem) {
                console.log("error: " + err);
                console.log("numrem: " + numrem);
            });

            sempaibot.sendMessage(m.channel, responses.get("OSU_STOPPED").format(m.author.id, user));
        }
    },
    
    {
        command: /check (.*)? on osu/,
        sample: "sempai check (*user*) on osu",
        description: "Forces me to check the given person on osu just in case I missed something.",
        action: function(m, user){
            sempaibot.sendMessage(m.channel, responses.get("OSU_CHECK").format(m.author.id, user));
            osu_force_check(m, user);
        }
    },
    
    {
        command: /please help me/,
        hidden: true,
        action: function(m){
            var message = responses.get("PLEASE_HELP_TOP");
            for(var i = 0;i<commands.length;i++)
            {
                if(commands[i].hidden !== undefined)
                    continue;
                
                message += "**" + commands[i].sample + "** - " + commands[i].description;
                message += "\r\n";
            }
            message += responses.get("PLEASE_HELP_BOTTOM");
            
            sempaibot.reply(m, message);
        }
    },
    
    {
        command: /help me/,
        hidden: true,
        action: function(m){
            var message = responses.get("HELP_TOP");
            for(var i = 0;i<commands.length;i++)
            {
                if(commands[i].hidden !== undefined)
                    continue;
                
                message += "**" + commands[i].sample + "** - " + commands[i].description;
                message += "\r\n";
            }
            message += responses.get("HELP_BOTTOM");
            
            sempaibot.reply(m, message);
        }
    },
    
    {
        command: /tsundere on/,
        hidden: true,
        action: function(m){
            if(responses.currentMode)
                return sempaibot.sendMessage(m, responses.get("ALREADY_IN_MODE").format(m.author.id));
            
            responses.setMode(true);
            sempaibot.sendMessage(m, responses.get("SWITCHED").format(m.author.id));
        }
    },
    
    {
        command: /tsundere off/,
        hidden: true,
        action: function(m){
            if(!responses.currentMode)
                return sempaibot.sendMessage(m, responses.get("ALREADY_IN_MODE").format(m.author.id));
            
            responses.setMode(false);
            sempaibot.sendMessage(m, responses.get("SWITCHED").format(m.author.id));
        }
    },
    
    //this one should be last
    {
        command: null,
        hidden: true,
        action: function(m, target){
            if(responses.currentMode)
            {
                return sempaibot.sendMessage(m.channel, responses.get("NAME").format(m.author.id));
            }
            
            if(target === undefined)
                return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE").format(m.author.id));
            
            var user = get_user(target);
            if(user !== -1)
                return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE_USER").format(m.author.id, user));
            
            return sempaibot.sendMessage(m.channel, responses.get("WRONG_HOLE").format(m.author.id));
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
    sempaibot.on("message", function (m) {
        handle_message(m);
    });

    sempaibot.on("ready", function () {
        load_data();

        sempaibot.joinServer(config.server, function (error, server) {
            servers.push(server);
            sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("ONLINE"));
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

    sempaibot.sendMessage(reminder.channel, responses.get("REMINDER").format(reminder.me, who, reminder.what));
    var index = reminders.indexOf(reminder);
    reminders.splice(index, 1);
}



function get_anime_info(m, anime) {
    //Look into the DB to find any anime with this name
    anidb.count({"anime": anime}, function(err, count) {
        if (err !== null) {
            sempaibot.sendMessage(m.channel, responses.get("ERROR").format(m.author.id));
            return console.log(err);
        }
        
        if (count <= 0) {
            sempaibot.sendMessage(m.channel, responses.get("NO_ANIME_FOUND").format(m.author.id, anime));
            return;
        }
        
        //Good we found something, lets get the data
        anidb.find({"anime": anime}, function(err, docs) {
            if (err !== null) {
                sempaibot.sendMessage(m.channel, responses.get("ERROR").format(m.author.id));
                return console.log(err);
            }

            var anime = [];
            for(var i = 0; i < docs.length; i++) {
                var obj = { anime: docs[i].anime, episode: docs[i].episode, magnet: docs[i].magnet };
                anime.push(obj);
            }

            anime.sort(sort_anime);
            var title = '', message;
            for (var i = 0; i < anime.length; i++) {
                if (anime[i].anime !== title) {
                    message += "\r\nAnime title: " + anime[i].anime;
                    title = anime[i].title;
                }

                message += "\r\nEpisode " + anime[i].episode + ". Magnet link: " + anime[i].magnet;
            }

            sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> I found you these Episodes:" + message);
        });
    });  
}

function track_anime(m, anime) {
    sempaibot.sendMessage(m.channel, responses.get("ERROR").format(m.author.id));
}

function sort_anime(a,b) {
  if (a.anime < b.anime)
    return -1;
  else if (a.anime > b.anime)
    return 1;
  else 
    return 0;
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
        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NOT_FOLLOWING").format(m.author.id, user));
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
    console.log(endDate);
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
            for (var j = 0; j < json.length; j++) {
                var beatmap = json[j];
                var bdate = new Date(beatmap.date);
                var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                if (date > endDate) {
                    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format(user, beatmap.beatmap_id, beatmap.pp, beatmap.rank));
                }
            }
        });
    }.bind(null, user));
    
    /*function (res) {
        console.log(res);
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
                    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE").format(user, beatmap.beatmap_id, beatmap.pp, beatmap.rank, date));
                }
            }
        });
    }*/
}

var osucheck = setInterval(function () {
    for (var i = 0; i < osuusers.length; i++) {
        var user = osuusers[i];
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
                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format(user, beatmap.beatmap_id, beatmap.pp, beatmap.rank));
                    }
                }
            });
        }.bind(null, user)).on('error', function (e) {
            console.log("Got error: " + e.message);
            return false;
        });
        /* function (res) {
            res.user = user;
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
                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format(res.user, beatmap.beatmap_id, beatmap.pp, beatmap.rank));
                    }
                }
            });
        }*/
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
            if (typeof json.username === "undefined") {
                sempaibot.sendMessage(m.channel, responses.get("OSU_USER_NOT_FOUND").format(m.author.id, user));
                return;
            }

            if (osuusers.indexOf(user) !== -1) {
                sempaibot.sendMessage(m.channel, responses.get("OSU_ALREADY_FOLLOWING").format(m.author.id, user));
                return;
            }

            osuusers.push(user);
            osudb.insert([{username: user}], function (err, docs) {
                if (err !== null)
                    console.log(err);
            });
            sempaibot.sendMessage(m.channel, responses.get("OSU_ADDED_FOLLOWING").format(m.author.id, user));
            return;
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        return false;
    });
}
/*
if(run_test)
{
    sempaibot = {};
    sempaibot.reply = function(m, data){
        console.log("reply", data);
    };
    
    sempaibot.sendMessage = function(channel, data){
        console.log("sendMessage", channel, data);
    };
    
    sempaibot.channels = {
        get: function(name, query){
            return "osu";
        }
    };
    
    var fake_user = function(user){
        return {
            id: user,
            username: user
        }
    };
    
    sempaibot.users = [fake_user("Calsmurf2904"), fake_user("SempaiSC2")];
    
    var fake_message = function(message){
        console.log("message", message);
        return {
            channel: "test123",
            author: fake_user("Calsmurf2904"),
            content: message
        }
    };
    
    load_data();
    
    setTimeout(function(){
        handle_message(fake_message("sempai tsundere on"));
        handle_message(fake_message("sempai remind SempaiSC2 to test123 at 14:50"));
        handle_message(fake_message("sempai remind me to test123 at 15:50"));
        handle_message(fake_message("sempai who are you following on osu?"));
        handle_message(fake_message("sempai check calsmurf2904 on osu"));
        handle_message(fake_message("sempai help me"));
        handle_message(fake_message("sempai please help me"));
        /*handle_message(fake_message("test123"));
        handle_message(fake_message("sempai"));
        handle_message(fake_message("sempai remind me to test123 at 12:30"));
        handle_message(fake_message("sempai find anime nisekoi"));
        handle_message(fake_message("sempai who are you following on osu?"));
        handle_message(fake_message("sempai check calsmurf2904 on osu"));
        handle_message(fake_message("sempai help me"));
        handle_message(fake_message("-remind me to test123 at 00:28"));
        handle_message(fake_message("-find anime nisekoi"));
        handle_message(fake_message("-who are you following on osu?"));
        handle_message(fake_message("-check calsmurf2904 on osu"));
        handle_message(fake_message("-help me"));
    }, 100);
}*/