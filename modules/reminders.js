var responses = require("../responses.js");
var reminders = [];

module.exports = {
    moduleName: "Reminders",
    load: function(Bot){
        function remind_me(me, channel, who, when, what) {
            if (who) 
            {
                var w = [];
                var tmp = who.split(',');

                for (var i = 0; i < tmp.length; i++) 
                {
                    w.push("<@" + util.get_user(tmp[i], Bot) + ">");
                }
            } 
            else 
            {
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
            if (reminders.length > 0) 
            {
                for (var i = 0; i < reminders.length; i++) 
                {
                    if (reminders[i].when < n) 
                    {
                        remind_message(reminders[i]);
                    }
                }
            }
        }, 1000);

        function remind_message(reminder) {
            if (reminder.who) 
            {
                var w = reminder.who;
                var who = "";
                for (var i = 0; i < w.length; i++) 
                {
                    if (i !== 0)
                        who += ", ";
                    
                    who += w[i];
                }
            } 
            else 
            {
                who = "himself";
            }

            Bot.discord.sendMessage(reminder.channel, responses.get("REMINDER").format({author: reminder.me, people: who, message: reminder.what}));
            var index = reminders.indexOf(reminder);
            reminders.splice(index, 1);
        }
        
        Bot.addCommand({
            command: /list my reminders/,
            sample: "sempai list my reminders",
            description: "lists your currently active reminders.",
            action: function(message){
                //todo
            }
        });
        
        Bot.addCommand({
            command: /remind (.*) to (.*) at (.{4,})/,
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
                    Bot.discord.sendMessage(message.channel, responses.get("REMIND_PAST").format(message.author.id));
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

                        whos += "<@" + util.get_user(w[i], Bot) + ">";
                    }
                } else {
                    whos = "himself";
                }

                if(!who)
                    Bot.discord.sendMessage(message.channel, responses.get("REMIND_ME").format({author: message.author.id, message: info, time: time}));
                else
                    Bot.discord.sendMessage(message.channel, responses.get("REMIND_OTHER").format({author: message.author.id, people: whos, message: info, time: time}));
            }
        });
    }
};