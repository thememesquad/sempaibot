var db = require("../db.js");
var responses = require("../responses.js");
var lodash = require("lodash");

module.exports = {
    moduleName: "General",
    load: function(Bot){
        Bot.addCommand({
            command: /please help me/,
            hidden: true,
            action: function(m){
                var message = responses.get("PLEASE_HELP_TOP").format({author: m.author.id});
                var commands = lodash.clone(Bot.commands);
                commands.sort(function(a, b){
                    if(a.module < b.module) return -1;
                    if(a.module > b.module) return 1;
                    
                    return 0;
                });
                
                for(var i = 0;i<commands.length;i++)
                {
                    if(commands[i].hidden !== undefined)
                        continue;

                    if(i == 0 || commands[i].module != commands[i-1].module)
                    {
                        if(i != 0)
                            message += "\r\n";
                        
                        message += "**" + commands[i].module + "**:\r\n";
                    }
                    
                    message += "**" + commands[i].sample + "** - " + commands[i].description;
                    message += "\r\n";
                }
                message += "\r\n";
                message += responses.get("PLEASE_HELP_BOTTOM").format({author: m.author.id});

                Bot.discord.reply(m, message);
            }
        });
        
        Bot.addCommand({
            command: /help me/,
            hidden: true,
            action: function(m){
                var message = responses.get("HELP_TOP").format({author: m.author.id});
                var commands = lodash.clone(Bot.commands);
                commands.sort(function(a, b){
                    if(a.module < b.module) return -1;
                    if(a.module > b.module) return 1;
                    
                    return 0;
                });
                
                var lastMod = "";
                for(var i = 0;i<commands.length;i++)
                {
                    if(commands[i].hidden !== undefined)
                        continue;

                    if(commands[i].module != lastMod)
                    {
                        if(i != 0)
                            message += "\r\n";
                        
                        message += "**" + commands[i].module + "**:\r\n";
                        lastMod = commands[i].module;
                    }

                    message += "**" + commands[i].sample + "** - " + commands[i].description;
                    message += "\r\n";
                }
                message += "\r\n";
                message += responses.get("HELP_BOTTOM").format({author: m.author.id});

                Bot.discord.reply(m, message);
            }
        });
        
        Bot.addCommand({
            command: /tsundere on/,
            hidden: true,
            action: function(m){
                if(responses.currentMode)
                    return Bot.discord.sendMessage(m, responses.get("ALREADY_IN_MODE").format({author: m.author.id}));

                responses.setMode(true);
                Bot.discord.sendMessage(m, responses.get("SWITCHED").format({author: m.author.id}));
            }
        });
        
        Bot.addCommand({
            command: /tsundere off/,
            hidden: true,
            action: function(m){
                if(!responses.currentMode)
                    return Bot.discord.sendMessage(m, responses.get("ALREADY_IN_MODE").format({author: m.author.id}));

                responses.setMode(false);
                Bot.discord.sendMessage(m, responses.get("SWITCHED").format({author: m.author.id}));
            }
        });
    }
};