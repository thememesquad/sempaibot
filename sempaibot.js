var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var ping = require ("net-ping");
var dns = require("dns");
var responses = require("./responses.js");
var modules = require('auto-loader').load(__dirname + "/modules");
var db = require("./db.js");
var process = require("process");
var util = require("./util.js");
var config = require("./config");
const PING_THRESHOLD = 100;

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function(args) {
        return this.replace(/{(.*?)}/g, function(match, key) {
            return typeof args[key] != 'undefined' ? args[key] : match;
        });
    };
}

var Bot = {
    discord: new Discord.Client(),
    commands: []
};

Bot.discord.getServers = function(){
    return this.internal.apiRequest("get", "https://discordapp.com/api/voice/regions", true);
};

function handle_message(m)
{
    var n = m.content.split(" ");

    if(n[0].toLowerCase() == "sempai" || m.content.charAt(0) == "-")
    {
        for(var i = 0;i<Bot.commands.length;i++)
        {
            var data = [];
            if(Bot.commands[i].command !== null)
            {
                data = Bot.commands[i].command.exec(m.content);
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

            Bot.commands[i].action.apply(null, data);
            break;
        }
    }
}

var serverSwitcher = function(){
    Bot.discord.getServers().then(function(res){
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
                            if(pings[Bot.discord.servers[0].region] >= PING_THRESHOLD)
                            {
                                var best = null;
                                for(var key in pings)
                                {
                                    if(best == null || pings[key] < pings[best])
                                    {
                                        best = key;
                                    }
                                }

                                if(Bot.discord.servers[0].region == best)
                                    return;

                                var old = Bot.discord.servers[0].region;
                                Bot.discord.internal.apiRequest("patch", "https://discordapp.com/api/guilds/" + Bot.discord.servers[0].id, true, {name: Bot.discord.servers[0].name, region: best}).then(function(res){
                                    Bot.discord.sendMessage(Bot.discord.channels.get("name", "osu"), responses.get("REGION_CHANGED").format({old_region: names[old], new_region: names[best]}));
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

Bot.discord.on("message", function (m) {
    handle_message(m);
});

Bot.discord.on("ready", function () {
    db.load(function(){
        db.data.find({}, function(err, docs){
            if (err !== null)
                return console.log(err);

            for(var i = 0;i<docs.length;i++)
            {
                if(docs[i].name == "mode")
                {
                    if(docs[i].value != responses.currentMode)
                        responses.setMode(docs[i].value);
                }else if(docs[i].name == "anime_tracked")
                {
                    continue;
                    //anime.setAllTracked(docs[i].value);
                }else{
                }
            }
        });

        for(var key in modules)
        {
            var mod = modules[key];
            if(mod.load === undefined)
            {
                console.log("Error: Module '" + key + "' is not setup correctly. missing function: load");
                continue;
            }
            
            var msg = "Loading module '" + key + "'";
            while(msg.length != 60)
                msg += ".";
            
            process.stdout.write(msg);
            try
            {
                mod.load(Bot);
                console.log("...Ok");
            }catch(e)
            {
                console.log("Error");
                console.log(e);
            }
        }
        
        //null command
        Bot.commands.push({
            command: null,
            hidden: true,
            action: function(m, target){
                if(responses.currentMode)
                {
                    return Bot.discord.sendMessage(m.channel, responses.get("NAME").format({author: m.author.id}));
                }

                if(target === undefined)
                    return Bot.discord.sendMessage(m.channel, responses.get("WRONG_HOLE").format({author: m.author.id}));

                var user = util.get_user(target, Bot);
                if(user !== -1)
                    return Bot.discord.sendMessage(m.channel, responses.get("WRONG_HOLE_USER").format({author: m.author.id, user: user}));

                return Bot.discord.sendMessage(m.channel, responses.get("WRONG_HOLE").format({author: m.author.id}));
            }
        });
        
        Bot.discord.joinServer(config.server, function (error, server) {
            Bot.discord.sendMessage(Bot.discord.channels.get("name", "osu"), responses.get("ONLINE"));

            setInterval(serverSwitcher, 10000);
        });
    });
});

Bot.discord.login(config.user, config.pass, function (error, token) {
    console.log(error + "; token: " + token);
});
