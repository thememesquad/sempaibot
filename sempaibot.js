var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var Datastore = require("nedb");
var osudb; //Databases


var sempaibot = new Discord.Client();
var servers = [];
var reminders = [];
var run_test = false;
var config = {};
if(!run_test)
    config = require("./config");

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
                sempaibot.sendMessage(message.channel, "<@" + message.author.id + "> I can't remind you of something in the past.");
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
                sempaibot.sendMessage(message.channel, "<@" + message.author.id + "> I will remind you to \"" + info + "\" at \"" + time + "\".");
            else
                sempaibot.sendMessage(message.channel, "<@" + message.author.id + "> I will remind \"" + whos + "\" to \"" + info + "\" at \"" + time + "\".");
        }
    },
    {
        command: /find anime (.*)/,
        sample: "sempai find anime (*anime*)",
        description: "Searches nyaa.eu for magnet links for the given anime.",
        action: function(message, anime){
            if (anime === undefined) {
                sempaibot.reply(m, "Please specify what anime you want to look for.");
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
            var message = "We are currently following: ";
            for(var i = 0;i<osuusers.length;i++)
            {
                if(i !== 0)
                    message += ", ";
                
                message += osuusers[i];
            }
            
            sempaibot.reply(m, message);
        }
    },
    
    {
        command: /follow (.*)? on osu/,
        sample: "sempai follow (*user*) on osu",
        description: "Adds another victim to my stalker list for osu.",
        action: function(m, name){
            if(name === undefined)
            {
                return sempaibot.reply(m, "You could ofcourse.....actually say the person that you want me to watch.");
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
                return sempaibot.reply(m, "Couldn't stop watching " + user + " because we aren't even watching him!");
            }
            
            osuusers.splice(i, 1);

            osudb.remove({username: user}, {}, function (err, numrem) {
                console.log("error: " + err);
                console.log("numrem: " + numrem);
            });

            sempaibot.reply(m, "Successfully stopped watching " + user);
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
        command: /help me/,
        sample: "sempai help me",
        description: "Sends this lovely help text to you!",
        action: function(m){
            var message = "This is the current list of commands:\r\n";
            for(var i = 0;i<commands.length;i++)
            {
                message += "**" + commands[i].sample + "** - " + commands[i].description;
                message += "\r\n";
            }
            message += "You could also just prefix the commands with - instead of sempai:\r\n";
            message += "**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.\r\n";
            
            sempaibot.reply(m, message);
        }
    },
    
    //this one should be last
    {
        command: null,
        sample: "sempai (*user*)",
        description: "Well, you should just try this command out instead of reading the description. (user is optional)",
        action: function(m, target){
            if(target === undefined)
                return sempaibot.reply(m, "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo");
            
            var user = get_user(target);
            if(user !== -1)
                return sempaibot.reply(m, "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@" + user + ">~ONIICHAN VoHiYo KYAA~~~ VoHiYo");
            
            return sempaibot.reply(m, "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo");
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
            sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), "@everyone Hey guys I'm online!");
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

    sempaibot.sendMessage(reminder.channel, "<@" + reminder.me + "> reminded " + who + ": " + reminder.what + ".");
    var index = reminders.indexOf(reminder);
    if (index === -1) {
        sempaibot.sendMessage(reminder.channel, "I fucked up, save yourself AngelThump");
    } else {
        reminders.splice(index, 1);
    }
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
        sempaibot.sendMessage(channel, "<@" + f + ">, Oops, looks like Nyaa.se is down.");
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
        sempaibot.sendMessage(channel, "<@" + f + ">, Oops, looks like anidex.moe is down.");
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
            console.log(err);
        users = docs;

        for (var i = 0; i < users.length; i++) {
            osuusers.push(users[i].username);
        }
    });


}

/****************************************/
/*	OSU Integration 					*/
/****************************************/

var osuusers = [];

function osu_force_check(user) {
    if (osuusers.indexOf(user) === -1) {
        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), "Couldn't find user: " + user);
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
                    sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), user + " has set a new PP score! Map: https://osu.ppy.sh/b/" + beatmap.beatmap_id + " . PP: " + beatmap.pp + ". Rank: " + beatmap.rank + ". Date: " + date);
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
                        sempaibot.sendMessage(sempaibot.channels.get("name", "osu"), user + " has set a new PP score! Map: https://osu.ppy.sh/b/" + beatmap.beatmap_id + " . PP: " + beatmap.pp + ". Rank: " + beatmap.rank);
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
                sempaibot.sendMessage(m.channel, "<@" + m.author.id + ">, Sorry but I can't find this user.");
                return;
            }

            if (osuusers.indexOf(user) !== -1) {
                sempaibot.sendMessage(m.channel, "<@" + m.author.id + ">, This user is already being tracked.");
                return;
            }

            osuusers.push(user);
            osudb.insert([{username: user}], function (err, docs) {
                if (err !== null)
                    console.log(err);
            });
            sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> Added user \"" + user + "\" to the Osu Userlist");
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
        handle_message(fake_message("sempai remind SempaiSC2 to test123 at 12:50"));
        handle_message(fake_message("sempai remind me to test123 at 12:50"));
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