"use strict";

const responses = require("../responses.js");
const ModuleBase = require("../modulebase.js");
const permissions = require("../permissions.js");
const users = require("../users.js");
const Time = require("../time.js");
const Util = require("../util.js");
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

class RemindersModule extends ModuleBase
{
    constructor()
    {
        super();
        
        this.name = "Reminders";
        this.description = "This module adds the possibility to send reminders to people! Cannot be disabled.";
        this.always_on = true;
        
        this.reminders = [];
        this.bot = null;
        
        Reminder.find({}).then(docs => this.reminders = docs);
        
        permissions.register("MANAGE_REMINDERS", "moderator");
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("list reminders"))
                    return null;
                    
                return [];
            },
            sample: "sempai list reminders",
            description: "Lists all active reminders.",
            permission: null,
            global: false,
            
            execute: this.handle_list_reminders
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("remove reminder"))
                    return null;
                
                return [parseInt(message.content.substr("remove reminder".length + 1).trim())];
            },
            sample: "sempai remove reminder __*id*__",
            description: "Removes a reminder.",
            permission: "MANAGE_REMINDERS",
            global: false,
            
            execute: this.handle_remove_reminder
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("remind"))
                    return null;
                    
                let parsed = Time.parse(message.content);
                if(parsed.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let date = parsed[parsed.length - 1];
                if(!date.ret[1].isValid())
                {
                    message.almost = true;
                    return null;
                }
                
                let str = message.content.substr(0, date.index).trim();
                let keywords = ["in", "after", "on", "at"];
                
                let split = str.split(" ");
                let name = split[1];
                let msg = "";
                
                for(let i = 2;i<split.length;i++)
                {
                    if(i === 2 && split[i].toLowerCase() === "to")
                        continue;
                        
                    if(i === split.length - 1)
                    {
                        if(keywords.indexOf(split[i].toLowerCase()) !== -1)
                            continue;
                    }
                    
                    if(msg.length !== 0)
                        msg += " ";
                        
                    msg += split[i];
                }
                
                return [name, msg, date.ret];
            },
            sample: "sempai remind __*name*__  to __*reminder message*__  at __*time*__",
            description: "Send yourself (or someone else) a reminder at a specified time! Use \"me\" to refer to yourself. The timezone is set to the timezone of your discord server.",
            permission: null,
            global: false,
            
            execute: this.handle_remind
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("clear reminders"))
                    return null;
                    
                return [];
            },
            sample: "sempai clear reminders",
            description: "Clears all the reminders for this server.",
            permission: "MANAGE_REMINDERS",
            global: false,
            
            execute: this.handle_clear_reminders
        });
    }
    
    handle_clear_reminders(message)
    {
        let num = 0;
        
        for(let i = this.reminders.length - 1;i>=0;i--)
        {
            let reminder = this.reminders[i];
            
            if(reminder.server !== message.server.id)
                continue;
                
            this.reminders.splice(i, 1);
            reminder.delete().catch(e => console.log(e));
            
            num++;
        }
        
        this.bot.respond(message, responses.get("CLEARED_REMINDERS").format({author: message.author.id, num: num}));
    }
    
    handle_remove_reminder(message, id)
    {
        let cleared = false;
        let j = 0;
        for(let i = 0;i<this.reminders.length;i++)
        {
            let time = moment();
            let reminder = this.reminders[i];
            
            if(reminder.server !== message.server.id)
                continue;
                
            if(time.valueOf() > reminder.time)
                continue;
                
            if(j++ === id - 1)
            {
                this.reminders.splice(i, 1);
                reminder.delete().catch(e => console.log(e));
                
                cleared = true;
                break;
            }
        }
        
        if(cleared)
        {
            this.bot.respond(message, responses.get("CLEARED_REMINDER").format({author: message.author.id}));
        }
        else
        {
            this.bot.respond(message, responses.get("NO_REMINDER").format({author: message.author.id, id: id}));
        }
    }
    
    handle_list_reminders(message)
    {
        let response = "";
        
        let j = 0;
        for(let i = 0;i<this.reminders.length;i++)
        {
            let time = moment();
            let reminder = this.reminders[i];
            
            if(reminder.server !== message.server.id)
                continue;
                
            if(time.valueOf() > reminder.time)
                continue;
                
            let who = "";
            if (reminder.target.length !== 0)
            {
                let w = reminder.target;
                for (let k = 0; k < w.length; k++)
                {
                    if (k !== 0)
                        who += ", ";

                    who += "<@" + w[k] + ">";
                }
            }
            else
            {
                who = "himself";
            }
            
            response += "\r\n #" + ((j++) + 1) + ". " + moment(reminder.time).calendar() + ", <@" + reminder.source + "> will remind " + who + ": '" + reminder.message + "'.";
        }
        
        if(j === 0)
            return this.bot.respond(message, responses.get("REMINDERS_LIST_EMPTY").format({author: message.author.id}));
            
        return this.bot.respond(message, responses.get("LIST_REMINDERS").format({author: message.author.id, response: response}));
    }
    
    handle_remind(message, name, reminder, parsed)
    {
        let who = false;
        if (name !== "me")
        {
            who = name;
        }

        let currentDate = moment();
        let info = reminder.trim();
        let parsedtime = parsed[1];

        if (parsedtime < currentDate) 
        {
            return this.bot.respond(message, responses.get("REMIND_PAST").format({author: message.author.id}));
        }

        if(!this.create_reminder(message.user.user_id, message.server, who, parsedtime, info))
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id}));
        }

        let whos = "";
        if (who)
        {
            let w = who.split(",");
            whos = "";
            for (let i = 0; i < w.length; i++) 
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
        let w = [];
        let valid = true;
        
        if (who)
        {
            let tmp = who.split(",");

            for (let i = 0; i < tmp.length; i++)
            {
                let id = Util.parse_id(tmp[i]);
                if(id.type !== "user")
                    continue;
                
                if(users.get_user_by_id(id.id, server) === null)
                {
                    valid = false;
                    break;
                }
                
                w.push(id.id);
            }
        }

        if(!valid)
            return false;
            
        let reminder = Reminder.create({source: me, target: w, time: when.valueOf(), message: what, server: server.id});
        reminder.save().catch(err => console.log(err));
        
        this.reminders.push(reminder);
        return true;
    }
    
    on_remind(index)
    {
        let reminder = this.reminders[index];
        let who = "";

        if (reminder.target.length !== 0)
        {
            let w = reminder.target;
            who = "";
            for (let i = 0; i < w.length; i++)
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
        
        reminder.delete().catch(err => console.log(err));
    }
    
    on_setup(bot)
    {
        this.bot = bot;
        
        this.remind = setInterval(() => {
            let d = moment();
            let n = d.valueOf();
            
            if (this.reminders.length > 0)
            {
                for (let i = this.reminders.length - 1; i >= 0; i--)
                {
                    if (this.reminders[i].time < n)
                    {
                        this.on_remind(i);
                    }
                }
            }
        }, 1000);
    }
    
    on_shutdown()
    {
        clearInterval(this.remind);
    }
    
    on_load()
    {
    }
    
    on_unload()
    {
    }
}

module.exports = new RemindersModule();
