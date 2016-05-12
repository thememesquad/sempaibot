"use strict";

const responses = require("../src/responses.js");
const IModule = require("../src/IModule.js");
const Document = require("camo").Document;
const moment = require("moment");

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
                /^remind (\S+)(?:(?:\s+)to)?(?:\s+)([^0-9]+)(at|in|after|on|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)(?:\s+)?(.{4,})?/i,
                /^remind (\S+)(?:(?:\s+)to)?(?:\s+)([^0-9]+)(?:\s+)(.{4,})/i
            ],
            sample: "sempai remind __*name*__  to __*reminder*__  at __*time*__",
            description: "Send yourself (or someone else) a reminder at a given timestamp. (name should be me when referring to yourself) (Timezone is set to the timezone of your discord server).",
            permission: null,
            global: false,
            
            execute: this.handle_remind
        });
        
        /*console.log("5 minutes: " + this.parse_timestring("", "5 minutes"));
        console.log("1 hour: " + this.parse_timestring("", "1 hour"));
        console.log("1 year: " + this.parse_timestring("", "1 year"));
        console.log("19:30: " + this.parse_timestring("", "19:30"));
        console.log("tomorrow: " + this.parse_timestring("", "tomorrow"));
        console.log("next week: " + this.parse_timestring("next", "week"));
        console.log("2 weeks: " + this.parse_timestring("", "2 weeks"));
        console.log("tuesday: " + this.parse_timestring("", "tuesday"));
        console.log("saturday: " + this.parse_timestring("", "saturday"));*/
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
            
            response += "\r\n - " + moment(reminder.time).calendar() + ", <@" + reminder.source + "> will remind " + who + " to '" + reminder.message + "'.";
        }
        
        return this.bot.respond(message, responses.get("LIST_REMINDERS").format({author: message.author.id, response: response}));
    }
    
    parse_timestring(base, str)
    {
        str = str.toLowerCase();
        
        var regex = /(\S+)(?:\s+)(\S+)/i;
        
        var time = "";
        var currentDate = moment();
        
        var day_func = function(target, day){
            var current = currentDate.day();
            
            if(current == target)
                return currentDate;
                
            var num = 0;
            if(current > target)
                num = ((target + 6) - current) + 1;
            else
                num = target - current;
            
            return ["on " + day, currentDate.add(num, "days")];
        };
        
        switch(str)
        {
            case "monday":
            {
                return day_func(1, "monday");
            }
            
            case "tuesday":
            {
                return day_func(2, "tuesday");
            }
            
            case "wednesday":
            {
                return day_func(3, "wednesday");
            }
            
            case "thursday":
            {
                return day_func(4, "thursday");
            }
            
            case "friday":
            {
                return day_func(5, "friday");
            }
            
            case "saturday":
            {
                return day_func(6, "saturday");
            }
            
            case "sunday":
            {
                return day_func(0, "sunday");
            }
            
            case "tomorrow":
            {
                return ["tomorrow", currentDate.add(1, "day")];
            }
            
            case "week":
            case "weeks":
            {
                var num = 0;
                var name = "";
                
                if(base === "next")
                {
                    num = 1;
                    name = "next week";
                }else{
                    console.log("Unknown week: " + base, str);
                    return currentDate;
                }
                
                return [name, currentDate.add(num, "weeks")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " second";
                    else
                        name += " seconds";
                        
                    return ["in " + name, moment(currentDate.getTime() + (num * 1000))];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " minute";
                    else
                        name += " minutes";
                    
                    return ["in " + name, currentDate.add(num, "minutes")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " hour";
                    else
                        name += " hours";
                    
                    return ["in " + name, currentDate.add(num, "hours")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " day";
                    else
                        name += " days";
                    
                    return ["in " + name, currentDate.add(num, "days")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " week";
                    else
                        name += " weeks";
                    
                    return ["in " + name, currentDate.add(num, "weeks")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " month";
                    else
                        name += " months";
                    
                    return ["in " + name, currentDate.add(num, "months")];
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
                    
                    var name = "" + num;
                    if(num == 1)
                        name += " year";
                    else
                        name += " years";
                    
                    return ["in " + name, currentDate.add(num, "years")];
                }
            }
        }
        
        time = str;
        var tmp = moment(time, "YYYY-MM-DD HH:mm");
        if(!tmp.isValid())
        {
            tmp = moment(time, "HH:mm");
        }
        
        return ["at " + time, tmp];
    }
    
    handle_remind(message, name, reminder, base, time)
    {
        var who = false;
        if (name != "me")
        {
            who = name;
        }

        var currentDate = moment();
        var info = reminder.trim();
        var parsed = (message.index === 0) ? ((time === undefined) ? this.parse_timestring("", base) : this.parse_timestring(base, time)) : this.parse_timestring("", base);
        var parsedtime = parsed[1];

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
            this.bot.respond(message, responses.get("REMIND_ME").format({author: message.author.id, message: info, time: parsed[0]}));
        else
            this.bot.respond(message, responses.get("REMIND_OTHER").format({author: message.author.id, people: whos, message: info, time: parsed[0]}));
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

        var reminder = Reminder.create({source: me, target: w, time: when.valueOf(), message: what, server: server.id})
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
            var d = moment();
            var n = d.valueOf();
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
