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
            regex: [
                /^remind (\S+)(?:(?:\s+)to)?(?:\s+)([^0-9]+)(?:at|in|after)(?:\s+)(.{4,})/i,
                /^remind (\S+)(?:(?:\s+)to)?(?:\s+)([^0-9]+)(?:\s+)(.{4,})/i
            ],
            sample: "sempai remind __*name*__  to __*reminder*__  at __*time*__",
            description: "Send yourself (or someone else) a reminder at a given timestamp. (name should be me when referring to yourself) (Timezone is set to the timezone of your discord server).",
            permission: null,
            global: false,
            
            execute: this.handle_remind
        });
        
        /*console.log("5 minutes: " + this.parse_timestring("5 minutes"));
        console.log("1 hour: " + this.parse_timestring("1 hour"));
        console.log("1 year: " + this.parse_timestring("1 year"));
        console.log("19:30: " + this.parse_timestring("19:30"));
        console.log("tomorrow: " + this.parse_timestring("tomorrow"));
        console.log("next week: " + this.parse_timestring("next week"));
        console.log("2 weeks: " + this.parse_timestring("2 weeks"));
        console.log("tuesday: " + this.parse_timestring("tuesday"));
        console.log("saturday: " + this.parse_timestring("saturday"));*/
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
    
    parse_timestring(str)
    {
        str = str.toLowerCase();
        
        var regex = /(\S+)(?:\s+)(\S+)/i;
        
        var time = "";
        var currentDate = new Date();
        
        var day_func = function(target){
            var current = currentDate.getDay();
            
            if(current == target)
                return currentDate;
                
            var num = 0;
            if(current > target)
                num = ((target + 6) - current) + 1;
            else
                num = target - current;
                
            return (new Date(currentDate.getTime() + (num * 86400000)));
        };
        
        switch(str)
        {
            case "monday":
            {
                return day_func(1);
            }
            
            case "tuesday":
            {
                return day_func(2);
            }
            
            case "wednesday":
            {
                return day_func(3);
            }
            
            case "thursday":
            {
                return day_func(4);
            }
            
            case "friday":
            {
                return day_func(5);
            }
            
            case "saturday":
            {
                return day_func(6);
            }
            
            case "sunday":
            {
                return day_func(0);
            }
            
            case "tomorrow":
            {
                return (new Date(currentDate.getTime() + 86400000));
            }
        }
        
        var match = regex.exec(str);
        if(match !== null)
        {
            switch(match[2])
            {
                case "second":
                case "seconds":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown second: " + match[1]);
                        return currentDate;
                    }
                    
                    return (new Date(currentDate.getTime() + (num * 1000)));
                }
                
                case "minute":
                case "minutes":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown minute: " + match[1]);
                        return currentDate;
                    }
                    
                    return (new Date(currentDate.getTime() + (num * 60000)));
                }
                
                case "hour":
                case "hours":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown hour: " + match[1]);
                        return currentDate;
                    }
                    
                    return (new Date(currentDate.getTime() + (num * 3600000)));
                }
                
                case "day":
                case "days":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown day: " + match[1]);
                        return currentDate;
                    }
                    
                    return (new Date(currentDate.getTime() + (num * 86400000)));
                }
                
                case "week":
                case "weeks":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        switch(match[1])
                        {
                            case "next":
                                num = 1;
                                break;
                                
                            default:
                                console.log("Unknown week: " + match[1]);
                                return currentDate;
                        }
                    }
                    
                    return (new Date(currentDate.getTime() + ((num * 7) * 86400000)));
                }
                
                case "month":
                case "months":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown month: " + match[1]);
                        return currentDate;
                    }
                    
                    var month = (currentDate.getMonth() + num) % 12;
                    time = (month + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear() + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
                    
                    return new Date(time);
                }
                
                case "year":
                case "years":
                {
                    var num = parseInt(match[1]);
                    if(isNaN(num))
                    {
                        console.log("Unknown year: " + match[1]);
                        return currentDate;
                    }
                    
                    var year = currentDate.getFullYear() + num;
                    time = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + year + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
                    
                    return new Date(time);
                }
            }
        }
        
        time = str;
        if (time.split(" ").length == 1)
        {
            time = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear() + " " + time;
        }
        
        return new Date(time);
    }
    
    handle_remind(message, name, reminder, time)
    {
        var who = false;
        if (name != "me")
        {
            who = name;
        }

        var currentDate = new Date();
        var info = reminder.trim();
        var parsedtime = this.parse_timestring(time);

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
