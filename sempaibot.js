var Discord = require("discord.js");
var http = require("http");
var cheerio = require("cheerio");
var config = require("./config");


var sempaibot = new Discord.Client();
var servers = [];
var reminders = [];

sempaibot.on("message", function(m) {
	if (m.content.indexOf(' ') !== -1) {
		var command = m.content.substr(0,m.content.indexOf(' ')); // "72"
		var data = m.content.substr(m.content.indexOf(' ')+1); // "tocirah sneab"
	} else {
		var command = m.content;
	}
	if (command === "-sempai") {
		if (typeof data === "undefined") {
			sempaibot.reply(m, "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo");
			return;
		}
		
		var user = get_user(data);
		if (user !== -1) {
			sempaibot.reply(m, "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@" + user + ">~ONIICHAN VoHiYo KYAA~~~ VoHiYo")
			return;
		}
	}
		
	if (command === "-anime") {
		if (typeof data === "undefined") {
			sempaibot.reply(m, "Please specify what anime you want to look for.");
			return;
		}
		var anime = data.split(" -")[0];
		if (typeof anime === "undefined") {
			sempaibot.reply(m, "Please specify what anime you want to look for.");
			return;
		}
		
		var i;
		if ((i = data.indexOf("-to")) !== -1) {
			var to = data.substr(i + 4);
			to = to.split(",");
			var f = "for ";
			if (to.length > 1) {
				for( var i = 0; i < to.length; i++) {
					if (i !== 0) f += ", ";
					f += "<@" + get_user(to[i]) + ">";
				}
			} else {
				f = "<@" + get_user(to[0]) + ">";
			}
			sempaibot.sendMessage(m.channel, "<@" + m.author.id + ">, I'm looking up \"" + anime +"\" " + f);
		}
		
		get_anime_info(anime, m.channel, m.author.id, to);
	}
	
	if (command === "-remindme") {
		if (data.indexOf("-time") === -1) {
			sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> please send a valid Timestamp.");
			return;
		}
				
		if (data.indexOf("-who") !== -1) {
			if (data.indexOf("-who") < data.indexOf("-time")) {
				sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> please correctly format your command with -remindme -time -who");
				return;
			}
			var who = data.substr(data.indexOf("-who") + 5);
		} else {
			who = false;
		}
		
		var info = data.substr(0, data.indexOf("-time") - 1);
		
		if (!who) {
			var time = data.substr(data.indexOf("-time") + 6);
		} else {
			var time = data.substr(data.indexOf("-time") + 6, data.indexOf("-who") - 1 - (data.indexOf("-time") + 6));
		}
		var split1 = time.split(" ");
		var currentDate = new Date();
		if(split1.length == 1)
		{
			time = (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "-" + currentDate.getFullYear() + " " + time;
		}

		var parsedtime = new Date(time);
		
		if (parsedtime < currentDate) {
			sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> I can't remind you of something in the past.");
			return;
		}
		
		remind_me(m.author.id, m.channel, who, parsedtime, info);
		
		if (who) {
			var w = who.split(",");
			var whos = "";
			for(var i = 0; i < w.length; i++) {
				if (i !== 0) whos += ", ";
				whos += "<@" + get_user(w[i]) + ">";
			}
		} else {
			whos = "himself";
		}
		
		sempaibot.sendMessage(m.channel, "<@" + m.author.id + "> I will remind you \"" + info + "\" at \"" + time + "\" to " + whos + ".");
		return;
	}
});

function remind_me(me, channel, who, when, what) {
	if (who) {
		var w = [];
		var tmp = who.split(',');
		
		for(var i = 0; i < tmp.length; i++) {
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

var remind = setInterval(function() {
	var d = new Date();
	var n = d.getTime();
	if (reminders.length > 0) {
		console.log("checking reminders");
		for(var i = 0; i < reminders.length; i++) {
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
		for(var i = 0; i < w.length; i++) {
			if (i !== 0) who += ", ";
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
	http.get(options, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			console.log(data);
			sempaibot.sendMessage(channel, "<@" + f + ">, We found some interesting results!");
		});
	}).on('error', function(e) {
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
	http.get(options, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			var $ = cheerio.load(data);
			console.log(data);
			sempaibot.sendMessage(channel, "<@" + f + ">, We found some interesting results!");
		});
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
		sempaibot.sendMessage(channel, "<@" + f + ">, Oops, looks like anidex.moe is down.");
	});
}

function get_user(name) {
	
	for(var i = 0; i < sempaibot.users.length; i++) {
		var user = sempaibot.users[i];
		if (user.username === name) {
			return user.id;
		}
	}
	
	return -1;
}

sempaibot.on("ready", function(){
    sempaibot.joinServer(config.server, function(error, server) {
		servers.push(server);
    });
});

sempaibot.login(config.user, config.pass, function(error, token) {
	console.log(error
	+"; token: " + token);
});