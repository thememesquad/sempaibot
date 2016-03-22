var Discord = require("discord.js");
var responses = require("./responses.js");
var modules = require('auto-loader').load(__dirname + "/modules");
var db = require("./db.js");
var process = require("process");
var config = require("./config");

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
    commands: [],
    currentModule: "",
    addCommand: function(command){
        command.module = Bot.currentModule;
        Bot.commands.push(command);
    }
};

Bot.addCommand({
    name: "JOIN_SERVER",
    command: /join server (.*)/,
    sample: "sempai join server __*invite*__",
    description: "Allow sempai to join a new server",
    action: function(m, invite) {
        Bot.discord.getInvite(invite, function(error, inv) {
            if (error !== null) {
                Bot.discord.sendMessage(m.channel, response.get("JOIN_INVALID_INVITE").format({author: m.author.id, invite: inv.server.name}));
                return;
            }
            
            var servers = Bot.discord.servers;
            var success = true;
            for(var i = 0; i < servers.length; i++) {
                if (servers[i].name === inv.server.name) {
                    success = false;
                    break;
                }
            }
            
            if (!success) {
                Bot.discord.sendMessage(m.channel, response.get("JOIN_ALREADY").format({author: m.author.id, invite: inv.server.name}));
                return;
            }
            
            Bot.discord.joinServer(invite, function(error, server) {
                if (error !== null) {
                    Bot.discord.sendMessage(m.channel, response.get("JOIN_FAILED").format({author: m.author.id, invite: inv.server.name}));
                    return;
                }
                
                Bot.discord.sendMessage(m.channel, response.get("JOIN_SUCCESS").format({author: m.author.id, invite: server.name}));
            });
        });
    }
});

Bot.discord.getServers = function(){
    return this.internal.apiRequest("get", "https://discordapp.com/api/voice/regions", true);
};

Bot.discord.on("message", function (m){
    var n = m.content.split(" ");

    if(n[0].toLowerCase() == "sempai" || m.content.charAt(0) == "-")
    {
        for(var i = 0;i<Bot.commands.length;i++)
        {
            var data = [];
            if(Bot.commands[i].command !== null)
            {
                if(Array.isArray(Bot.commands[i].command))
                {
                    for(var j = 0;j<Bot.commands[i].command.length;j++)
                    {
                        data = Bot.commands[i].command[j].exec(m.content);
                        if(data === null)
                            continue;
                        
                        data.splice(0, 1);
                        data = [m].concat(data);
                        m.index = j;
                        
                        break;
                    }
                    
                    if(data === null)
                        continue;
                }else{
                    data = Bot.commands[i].command.exec(m.content);
                    if(data === null)
                        continue;

                    data.splice(0, 1);
                    data = [m].concat(data);
                    m.index = 0;
                }
            }
            else if(n.length > 1)
            {
                var targetName = m.content.substr(m.content.indexOf(" ") + 1);
                Bot.discord.sendMessage(m.channel, responses.get("UNKNOWN_COMMAND").format({author: m.author.id, command: targetName}));
                break;
            }
            else if(m.content.charAt(0) != "-")
            {
                data = [m];
            }
            else
            {
                //dont allow null commands to run without the name-keyword
                continue;
            }

            Bot.commands[i].action.apply(null, data);
            
            if(Bot.commands[i].stealth !== undefined)
            {
                var url = "https://discordapp.com/api/channels/" + m.channel.id + "/messages/" + m.id;
                Bot.discord.internal.apiRequest("delete", url, true).then(function(res){});
            }
            
            break;
        }
    }
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
                Bot.currentModule = mod.moduleName || key;
                
                mod.load(Bot);
                console.log("....Ok");
            }catch(e)
            {
                console.log("Error:");
                console.log(e);
            }
        }
        
        Bot.currentModule = "";
        
        //null command
        Bot.commands.push({
            command: null,
            hidden: true,
            action: function(m){
                Bot.discord.sendMessage(m.channel, responses.get("NAME").format({author: m.author.id}));
            }
        });
        
        Bot.discord.joinServer(config.server, function (error, server) {
            Bot.discord.sendMessage(Bot.discord.channels.get("name", "osu"), responses.get("ONLINE"));
        });
    });
});

Bot.discord.login(config.user, config.pass, function (error, token) {
    console.log(error + "; token: " + token);
});
