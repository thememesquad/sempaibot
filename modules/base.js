var db = require("../db.js");
var responses = require("../responses.js");

module.exports = {
    load: function(Bot){
        Bot.commands.push({
            command: /please help me/,
            hidden: true,
            action: function(m){
                var message = responses.get("PLEASE_HELP_TOP").format({author: m.author.id});
                for(var i = 0;i<Bot.commands.length;i++)
                {
                    if(Bot.commands[i].hidden !== undefined)
                        continue;

                    message += "**" + Bot.commands[i].sample + "** - " + Bot.commands[i].description;
                    message += "\r\n";
                }
                message += responses.get("PLEASE_HELP_BOTTOM").format({author: m.author.id});

                Bot.discord.reply(m, message);
            }
        });
        
        Bot.commands.push({
            command: /help me/,
            hidden: true,
            action: function(m){
                var message = responses.get("HELP_TOP").format({author: m.author.id});
                for(var i = 0;i<Bot.commands.length;i++)
                {
                    if(Bot.commands[i].hidden !== undefined)
                        continue;

                    message += "**" + Bot.commands[i].sample + "** - " + Bot.commands[i].description;
                    message += "\r\n";
                }
                message += responses.get("HELP_BOTTOM").format({author: m.author.id});

                Bot.discord.reply(m, message);
            }
        });
        
        Bot.commands.push({
            command: /tsundere on/,
            hidden: true,
            action: function(m){
                if(responses.currentMode)
                    return Bot.discord.sendMessage(m, responses.get("ALREADY_IN_MODE").format({author: m.author.id}));

                responses.setMode(true);
                Bot.discord.sendMessage(m, responses.get("SWITCHED").format({author: m.author.id}));
            }
        });
        
        Bot.commands.push({
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