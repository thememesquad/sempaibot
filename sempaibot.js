var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var Datastore = require("nedb");
var osudb; //Databases
var datadb; //Data db

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
var run_test = true;
var config = {};
if(!run_test)
    config = require("./config");

var responses_normal = {
    "ONLINE": "@everyone Hey guys! I'm back online!",
    "NAME": "Yes I'm here! What can I do for you?",
    "SWITCHED": "Hi there! I'm in my normal response mode now!",
    "ALREADY_IN_MODE": "I'm already in my normal mode!",
    
    "LIST_REMINDERS": "todo",
    "REMIND_PAST": "<@{0}> I can't remind you of something in the past.",
    "REMIND_ME": "<@{0}> I will remind you to \"{1}\" at \"{2}\".",
    "REMIND_OTHER": "<@{0}> I will remind \"{1}\" to \"{2}\" at \"{3}\".",
    "REMINDER": "<@{0}> reminded {1}: {2}.",
    
    "ANIME_UNDEFINED": "You could ofcourse actually tell me what anime to search for.",
    "ANIME_DOWN": "<@{0}> Oops, looks like {1} is down.",
    
    "OSU_FOLLOWING": "I'm currently following: {0}",
    "OSU_UNDEFINED": "You could ofcourse actually tell me the user you want me to watch.",
    "OSU_NOT_FOLLOWING": "I'm not even following \"{0}\"!",
    "OSU_STOPPED": "Ok, I have stopped following {0}",
    "OSU_NEW_SCORE": "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}. Date: {4}",
    "OSU_NEW_SCORE_NODATE": "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}.",
    "OSU_USER_NOT_FOUND": "<@{0}> The specified user \"{1}\" is not a valid osu user!",
    "OSU_ALREADY_FOLLOWING": "<@{0}> I'm already following \"{1}\".",
    "OSU_ADDED_FOLLOWING": "<@{0}> I'm now following \"{1}\" on osu.",
    
    "HELP_TOP": "This is the current list of commands:\r\n",
    "HELP_BOTTOM": "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    
    "PLEASE_HELP_TOP": "This is the current list of commands:\r\n",
    "PLEASE_HELP_BOTTOM": "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    
    "WRONG_HOLE": "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    "WRONG_HOLE_USER": "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{0}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo"
};

var responses_tsundere = {
    "ONLINE": [
        "I'm back! Did you miss me? ...Not like I want you to miss me or anything!",
        "I'm home!"
    ],
    "NAME": [
        "I'm here! How can Sempai help you?",
        "I'm here! How can I help you?",
        "I'm here! How can Sempai help you today?",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything!",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything! Sempai just gets lonely sometimes. :("
    ],
    "SWITCHED": "Fine. B-but I'm not doing this for you. It's because I wanted to.",
    "ALREADY_IN_MODE": [
        "Are you dumb? If you don't recognize what mode I'm in why even switch? Hmpf!",
        "Tsundere on? Baka~. It's already on!"
    ],
    
    "LIST_REMINDERS": "todo",
    "REMIND_PAST": [
        "Uhmm... Are you dumb? That time is in the past!",
        "Baka~! That time is in the past."
    ],
    "REMIND_ME": [
        "Sempai will help you remember! If I can be bothered.",
        "Sempai will try to remind {0}!",
        "Maybe I'll remind {0}. Just this one time!"
    ],
    "REMIND_OTHER": [
        "Sempai will help {1} remember! If I can be bothered.",
        "Sempai will try to remind {1}!",
        "Maybe I'll remind {1}. Just this one time!"
    ],
    "REMINDER": "<@{0}> reminded {1}: {2}.",
    
    "ANIME_UNDEFINED": "You could ofcourse actually tell me what anime to search for.",
    "ANIME_DOWN": "<@{0}> Oops, looks like {1} is down.",
    
    "OSU_FOLLOWING": [
        "These are my osu friends! {0}",
        "These are the people I ~~stalk~~ follow on osu! {0}",
        "These are the people I stal--... I mean follow on osu! {0}"
    ],
    "OSU_UNDEFINED": "You could ofcourse actually tell me the user you want me to watch.",
    "OSU_NOT_FOLLOWING": "I'm not even following \"{0}\"!",
    "OSU_STOPPED": "Ok, I have stopped following {0}",
    "OSU_NEW_SCORE": "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}. Date: {4}",
    "OSU_NEW_SCORE_NODATE": "{0} has set a new PP score! Map: https://osu.ppy.sh/b/{1} . PP: {2}. Rank: {3}.",
    "OSU_USER_NOT_FOUND": "<@{0}> The specified user \"{1}\" is not a valid osu user!",
    "OSU_ALREADY_FOLLOWING": "<@{0}> I'm already following \"{1}\".",
    "OSU_ADDED_FOLLOWING": "Ooh a new osu friend? I-It's not like I wanted more friends!",
    
    "HELP_TOP": [
        "What? Not even a please? Hmpf. Fine. Just this once. Here is a list of my commands:\r\n",
        "Fine. Just this once. Here's a list of my commands:\r\n"
    ],
    "HELP_BOTTOM": "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    "PLEASE_HELP_TOP": [
        "Only because you asked nicely. Here is a list of my commands:\r\n",
        "Only because you asked nicely. D-don't get me wrong, I do this for everyone if they ask nicely! Here's a list of my commands:\r\n"
    ],
    "PLEASE_HELP_BOTTOM": "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    
    "WRONG_HOLE": "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    "WRONG_HOLE_USER": "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{0}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo"
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
        command: /remind (\w+) to (.*)? at (.{4,})/,
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
        command: /find anime (.*)/,
        sample: "sempai find anime (*anime*)",
        description: "Searches nyaa.eu for magnet links for the given anime.",
        action: function(message, anime){
            if (anime === undefined) {
                sempaibot.reply(m, responses.get("ANIME_UNDEFINED"));
                return;
            }
            
            //todo: I have no idea what this code does. I think it allows you to send the results to someone else.
            /*
            var i;
            if ((i = data.indexOf("-to")) !== -1) {
                var to = data.substr(i + 4);
                to = to.split(",");
                var f = "for ";
                if (to.length > 1) {
                    for (var i = 0; i < to.length; i++) {
                        if (i !== 0)
                            f += ", ";
                        f += "<@" + get_user(to[i]) + ">";
                    }
                } else {
                    f = "<@" + get_user(to[0]) + ">";
                }
                sempaibot.sendMessage(m.channel, "<@" + m.author.id + ">, I'm looking up \"" + anime + "\" " + f);
            }*/

            var to = undefined;
            get_anime_info(anime, message.channel, message.author.id, to);
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
            
            sempaibot.reply(m, responses.get("OSU_FOLLOWING").format(message));
        }
    },
    
    {
        command: /follow (.*)? on osu/,
        sample: "sempai follow (*user*) on osu",
        description: "Adds another victim to my stalker list for osu.",
        action: function(m, name){
            if(name === undefined)
            {
                return sempaibot.reply(m, responses.get("OSU_UNDEFINED"));
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
                return sempaibot.reply(m, responses.get("OSU_NOT_FOLLOWING").format(user));
            }
            
            osuusers.splice(i, 1);

            osudb.remove({username: user}, {}, function (err, numrem) {
                console.log("error: " + err);
                console.log("numrem: " + numrem);
            });

            sempaibot.reply(m, responses.get("OSU_STOPPED").format(user));
        }
    },
    
    {
        command: /check (.*)? on osu/,
        sample: "sempai check (*user*) on osu",
        description: "Forces me to check the given person on osu just in case I missed something.",
        action: function(m, user){
            osu_force_check(user);
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
                return sempaibot.reply(m, responses.get("ALREADY_IN_MODE"));
            
            responses.setMode(true);
            sempaibot.reply(m, responses.get("SWITCHED"));
        }
    },
    
    {
        command: /tsundere off/,
        hidden: true,
        action: function(m){
            if(responses.currentMode)
                return sempaibot.reply(m, responses.get("ALREADY_IN_MODE"));
            
            responses.setMode(false);
            sempaibot.reply(m, responses.get("SWITCHED"));
        }
    },
    
    //this one should be last
    {
        command: null,
        hidden: true,
        action: function(m, target){
            if(responses.currentMode)
                return sempaibot.reply(m, responses.get("NAME"));
            
            if(target === undefined)
                return sempaibot.reply(m, responses.get("WRONG_HOLE"));
            
            var user = get_user(target);
            if(user !== -1)
                return sempaibot.reply(m, responses.get("WRONG_HOLE_USER").format(user));
            
            return sempaibot.reply(m, responses.get("WRONG_HOLE"));
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



function get_anime_info(anime, channel, f, to) {
    //Dummy function
    search_nyaa(anime, channel, f, to);
    search_anidex(anime, channel, f, to);
}

function search_nyaa(anime, channel, f, to) {
    var options = {
        host: 'www.nyaa.se',
        port: 80,
        path: "/?q=" + anime
    };
    http.get(options, function (res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            //console.log(data);
            sempaibot.sendMessage(channel, "<@" + f + ">, We found some interesting results!");
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        sempaibot.sendMessage(channel, responses.get("ANIME_DOWN").format(f, "Nyaa.se"));
    });
}

function search_anidex(anime, channel, f, to) {
    var options = {
        host: 'www.anidex.moe',
        port: 80,
        path: "/?q=" + anime
    };
    http.get(options, function (res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            var $ = cheerio.load(data);
            //console.log(data);
            sempaibot.sendMessage(channel, "<@" + f + ">, We found some interesting results!");
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        sempaibot.sendMessage(channel, responses.get("ANIME_DOWN").format(f, "anidex.moe"));
    });
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
}

/****************************************/
/*	OSU Integration 					*/
/****************************************/

var osuusers = [];

function osu_force_check(user) {
    if (osuusers.indexOf(user) === -1) {
        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NOT_FOLLOWING").format(user));
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
    endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000);
    http.get(options, function (res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            var json = JSON.parse(data);
            for (var j = 0; j < json.length; j++) {
                var beatmap = json[j];
                var bdate = new Date(beatmap.date);
                var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                if (date > endDate) {
                    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE").format(user, beatmap.beatmap_id, beatmap.pp, beatmap.rank, date));
                }
            }
        });
    });
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
        endDate = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000);
        http.get(options, function (res) {
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                var json = JSON.parse(data);
                for (var j = 0; j < json.length; j++) {
                    var beatmap = json[j];
                    var bdate = new Date(beatmap.date);
                    var date = new Date(bdate.valueOf() + -60 * 8 * 60000);

                    if (date > endDate) {
                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), responses.get("OSU_NEW_SCORE_NODATE").format(user, beatmap.beatmap_id, beatmap.pp, beatmap.rank));
                    }
                }
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
            return false;
        });
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
        handle_message(fake_message("-help me"));*/
    }, 100);
}