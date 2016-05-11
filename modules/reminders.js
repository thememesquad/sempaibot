"use strict";

const responses = require("../src/responses.js");
const IModule = require("../src/IModule.js");
const Document = require("camo").Document;

class Reminder extends Document
{
    constructor()
    {
        super();
        
        this.source = String;
        this.target = [String];
        this.time = Number;
        this.message = String;
        this.server = String;
    }
}

class RemindersModule extends IModule
{
    constructor()
    {
        super();
        
        this.name = "Reminders";
        this.always_on = true;
        
        var _this = this;
        this.reminders = [];
        this.bot = null;
        
        Reminder.find({}).then(function(docs)
        {
            _this.reminders = docs;
        });
        
        this.add_command({
            regex: /^list reminders/i,
            sample: "sempai list reminders",
            description: "Lists reminders on this server.",
            permission: null,
            global: false,
            
            execute: this.handle_list_reminders
        });
        
        this.add_command({
            regex: /^remind (.*) to (.*) at (.{4,})/i,
            sample: "sempai remind __*name*__  to __*reminder*__  at __*time*__",
            description: "Send yourself (or someone else) a reminder at a given timestamp. (name should be me when referring to yourself) (Timezone is set to the timezone of your discord server).",
            permission: null,
            global: false,
            
            execute: this.handle_remind
        })
    }
    
    handle_list_reminders(message)
    {
        var response = "";
        
        for(var i = 0;i<this.reminders.length;i++)
        {
            var time = new Date();
            var reminder = this.reminders[i];
            
            if(reminder.server !== message.server.id)
                continue;
                
            if(time.getTime() > reminder.time)
                continue;
                
            var who = "";
            if (reminder.target.length != 0)
            {
                var w = reminder.target;
                for (var i = 0; i < w.length; i++)
                {
                    if (i !== 0)
                        who += ", ";

                    who += "<@" + w[i] + ">";
                }
            }
            else
            {
                who = "himself";
            }
            
            response += "\r\n - at " + (new Date(reminder.time)).toLocaleString() + ", <@" + reminder.source + "> will remind " + who + " to '" + reminder.message + "'.";
        }
        
        return this.bot.respond(message, responses.get("LIST_REMINDERS").format({author: message.author.id, response: response}));
    }
    
    handle_remind(message, name, reminder, time)
    {
        var who = false;
        if (name != "me")
        {
            who = name;
        }

        var info = reminder;

        var currentDate = new Date();
        if (time.split(" ").length == 1)
        {
            time = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear() + " " + time;
        }

        var parsedtime = new Date(time);

        if (parsedtime < currentDate) 
        {
            return this.bot.respond(message, responses.get("REMIND_PAST").format({author: message.author.id}));
        }

        this.create_reminder(message.user._id, message.server, who, parsedtime, info);

        if (who)
        {
            var w = who.split(",");
            var whos = "";
            for (var i = 0; i < w.length; i++) 
            {
                if (i !== 0)
                    whos += ", ";

                whos += w[i];
            }
        } 
        else 
        {
            whos = "himself";
        }

        if(!who)
            this.bot.respond(message, responses.get("REMIND_ME").format({author: message.author.id, message: info, time: time}));
        else
            this.bot.respond(message, responses.get("REMIND_OTHER").format({author: message.author.id, people: whos, message: info, time: time}));
    }
    
    create_reminder(me, server, who, when, what)
    {
        var w = [];
        
        if (who)
        {
            var tmp = who.split(',');

            for (var i = 0; i < tmp.length; i++)
            {
                w.push(tmp[i].substr(2, tmp[i].length - 3));
            }
        }

        var reminder = Reminder.create({source: me, target: w, time: when.getTime(), message: what, server: server.id})
        reminder.save().catch(function(err){
            console.log(err);
        });
        
        this.reminders.push(reminder);
    }
    
    on_remind(index)
    {
        var reminder = this.reminders[index];
        if (reminder.target.length != 0)
        {
            var w = reminder.target;
            var who = "";
            for (var i = 0; i < w.length; i++)
            {
                if (i !== 0)
                    who += ", ";

                who += "<@" + w[i] + ">";
            }
        }
        else
        {
            who = "himself";
        }

        this.bot.message(responses.get("REMINDER").format({author: reminder.source, people: who, message: reminder.message}), this.bot.servers[reminder.server]);
        this.reminders.splice(index, 1);
        
        reminder.delete().catch(function(err){
            console.log(err);
        });
    }
    
    on_setup(bot)
    {
        this.bot = bot;
        
        this.remind = setInterval(function () {
            var d = new Date();
            var n = d.getTime();
            if (this.reminders.length > 0)
            {
                for (var i = this.reminders.length - 1; i >= 0; i--)
                {
                    if (this.reminders[i].time < n)
                    {
                        this.on_remind(i);
                    }
                }
            }
        }.bind(this), 1000);
    }
    
    on_load(server)
    {
    }
    
    on_unload(server)
    {
    }
}

module.exports = new RemindersModule();
