var db = require("./db.js");

var responses_normal = {
    ONLINE: "Hey guys! I'm back online!",
    NAME: "Yes I'm here! What can I do for you?",
    SWITCHED: "Hi there! I'm in my normal response mode now!",
    ALREADY_IN_MODE: "I'm already in my normal mode!",
    REGION_CHANGED: "Switched from region '{old_region}' to '{new_region}'.",

    LIST_REMINDERS: "todo",
    REMIND_PAST: "I can't remind you of something in the past.",
    REMIND_ME: "I will remind you to \"{message}\" at \"{time}\".",
    REMIND_OTHER: "I will remind \"{people}\" to \"{message}\" at \"{time}\".",
    REMINDER: "<@{author}> reminded {people}: {message}.",

    ANIME_SEARCH_NO_RESULTS: "No results found for '{anime}'.",
    ANIME_SEARCH_RESULTS: "Results for '{anime}':\r\n{results}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{show}**':\r\n**{file}**:\r\n**Magnet**: {magnet}\r\n**Seeders**: {seeders}, **Leechers**: {leechers}, **Downloads**: {downloads}, **Quality**: {quality}\r\n**Trusted**: {is_trusted}\r\n",
    ANIME_INVALID_ID: "Can't track {id} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{anime}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{anime}**'!",
    ANIME_TRACKING_LIST_EMPTY: "I'm not tracking any anime at the moment.",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{results}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{anime}**':\r\n{results}",
    ANIME_NOT_TRACKING: "I'm not even tracking {name}!",
    ANIME_STOPPED_TRACKING: "Okay, I'll stop tracking {name}",

    OSU_FOLLOWING: "I'm currently following: {results}",
    OSU_NOT_FOLLOWING: "I'm not even following \"{user}\"!",
    OSU_STOPPED: "Okay, I have stopped following {user}",
    OSU_NEW_SCORE_NODATE: "**{user}** has set a new #**{top_rank}** PP score! **{map_artist} - {map_title} [{map_diff_name}] {mods}** {additional} | **{acc}%** | **{pp}pp** ({delta_pp}) | **Rank: {rank}** | #**{old_rank}** -> #**{new_rank}**! ({delta_rank})\r\nMap link: https://osu.ppy.sh/b/{beatmap_id}",
    OSU_USER_NOT_FOUND: [
        "The specified user \"{user}\" is not a valid osu user!",
        "I can't find user \"{user}\". Did you type it correctly?",
    ],
    OSU_ALREADY_FOLLOWING: "I'm already following \"{user}\".",
    OSU_ADDED_FOLLOWING: "I'm now following \"{user}\" on osu!",
    OSU_CHECK: "No problem! I'll check {user} on osu for you!",

    JOIN_INVALID_INVITE: "I can't find a server with the Invite: \"{invite}\"",
    JOIN_ALREADY: "I am already part of \"{invite}\"",
    JOIN_FAILED: "I was not able to join the server \"{invite}\"",
    JOIN_SUCCESS: "I just joined \"{invite}\"! Thanks for allowing me to join",

    HELP_TOP: "This is the current list of commands:\r\n",
    HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    PLEASE_HELP_TOP: "This is the current list of commands:\r\n",
    PLEASE_HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    SEMPAI_FUCKYOU: "I'm sorry, I didn't mean to offend you <@{user}>",

    WRONG_HOLE: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{user}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",

    UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",
    MULTIPLE_UNKNOWN_COMMAND: "That command is unknown! If you are unsure what command to enter, please type \"sempai help me\".",

    ERROR: "<@{author}>, It seems my internal functions are not working correctly. Please ask the developers what the problem could be."
};

var responses_tsundere = {
    ONLINE: [
        "I'm back! Did you miss me? ...Not like I want you to miss me or anything!",
        "I'm back! You should be grateful.",
        "I'm back! Don't misunderstand, it's not like I'm back here because I l-like you guys or anything.",
        "I'm back! But don't misunderstand, I'm just here because I had nothing else to do!",
        "I'm back! Don't misunderstand! I'm only here because I had a lot of free time! It's not like I came back because I like hanging out with you guys, or anything!"
    ],
    NAME: [
        "I'm here! How can Sempai help you?",
        "I'm here! How can I help you?",
        "I'm here! How can I help you <@{author}>?",
        "I'm here! How can Sempai help you today?",
        "I'm here! How can Sempai help you today <@{author}>?",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything!",
        "Yes! I'm here! ...Don't get me wrong, it's not like I was waiting for you to say something this whole time or anything! Sempai just gets lonely sometimes. :(",
        "What do you want this time <@{author}>?",
        "Yes! I'm here <@{author}> . I-it's not like I was waiting for someone to talk to me!",
        "Yes! I'm here <@{author}> . I-it's not like I was waiting for someone to finally talk to me!",
        "What do you want?",
        "What do you want <@{author}>? It's a privilege to even be able to talk to me! You should feel honored."
    ],
    SWITCHED: [
        "Fine. B-but I'm not doing this for you. It's because I wanted to.",
        "Hmpf. Fine. B-but I'm not doing this for you. It's because I wanted to.",
        "Hmpf. Fine. I-it's not like I prefer this mode or anything!"
    ],
    SWITCH_OFF: [
        "Tsundere... off? B-but I thought you liked me. I understand. Goodbye.",
        "Tsundere... off? F-fine! I didn't really care about you anyway. B-baka. :'(",
        "I thought you liked me like this. :( Fine, I'll revert back to normal."
    ],
    ALREADY_IN_MODE: [
        "Are you dumb? I'm already in tsundere mode. If you don't recognize what mode I'm in why even switch? Hmpf!",
        "Tsundere on? Baka~. It's already on!",
        "Tsundere on? Are you dumb, <@{author}>? It's already on!"
    ],

    LIST_REMINDERS: "todo",
    REMIND_PAST: [
        "Uhmm... Are you dumb? That time is in the past!",
        "Baka~! That time is in the past."
    ],
    REMIND_ME: [
        "Sempai will help you remember! If I can be bothered.",
        "Sempai will try to remind <@{author}>!",
        "Maybe I'll remind <@{author}>. Just this one time!"
    ],
    REMIND_OTHER: [
        "Sempai will help {people} remember! If I can be bothered.",
        "Sempai will try to remind {people}!",
        "Maybe I'll remind {people}. Just this one time!"
    ],
    REMINDER: "<@{author}> reminded {people}: {message}.",
    REGION_CHANGED: "Switched from region '{old_region}' to '{new_region}'.",

    ANIME_SEARCH_NO_RESULTS: "No results found for '{anime}'.",
    ANIME_SEARCH_RESULTS: "Results for '{anime}':\r\n{results}",
    ANIME_NEW_DOWNLOAD: "New download for show '**{show}**':\r\n**{file}**:\r\n**Magnet**: {magnet}\r\n**Seeders**: {seeders}, **Leechers**: {leechers}, **Downloads**: {downloads}, **Quality**: {quality}\r\n",
    ANIME_INVALID_ID: "Can't track {id} because the id is invalid!",
    ANIME_ALREADY_TRACKING: "I'm already tracking '**{anime}**'!",
    ANIME_NOW_TRACKING: "Started tracking '**{anime}**'!",
    ANIME_TRACKING_LIST_EMPTY: "I'm not tracking any anime at the moment.",
    ANIME_TRACKING_LIST: "I'm currently tracking:\r\n{results}",
    ANIME_TRACKING_LIST_DETAIL: "Episode download list for '**{anime}**':\r\n{results}",
    ANIME_NOT_TRACKING: "I'm not even tracking {name}!",
    ANIME_STOPPED_TRACKING: "Okay, I'll stop tracking {name}.",

    OSU_FOLLOWING: [
        "These are the people I like! I mean, associate with. I-it's not as if I really l-like them, or anything. Don't get any weird ideas!\r\n{results}",
        "These are my osu friends!\r\n{results}",
        "These are the people I ~~stalk~~ follow on osu!\r\n{results}",
        "These are the people I stal--... I mean follow on osu!\r\n{results}"
    ],
    OSU_NOT_FOLLOWING: [
        "Are you stupid? I wasn't even following {user}!",
        "Are you stupid? I wasn't even following {user} in the first place!"
    ],
    OSU_STOPPED: [
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway... But maybe I'll miss {user} a little. Just a little.",
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway...  :'( "
    ],

    OSU_NEW_SCORE_NODATE: "**{user}** has set a new #**{top_rank}** PP score! **{map_artist} - {map_title} [{map_diff_name}] {mods}** {additional} | **{acc}%** | **{pp}pp** ({delta_pp}) | **Rank: {rank}** | #**{old_rank}** -> #**{new_rank}**! ({delta_rank})\r\nMap link: https://osu.ppy.sh/b/{beatmap_id}",
    OSU_USER_NOT_FOUND: "Baka~! I can't find that user. Did you type the username correctly?",
    OSU_ALREADY_FOLLOWING: "Baka~! I'm already following {user}",
    OSU_ADDED_FOLLOWING: [
        "Ooh a new osu friend? I-It's not like I wanted more friends!",
        "Ooh a new osu friend? Yaa~y! Uhm, I mean... I-It's not like I wanted more friends or anything!",
        "Added {user} to my osu ~~stalk~~ follow list!"
    ],
    OSU_CHECK: [
        "Fine. I'll check {user} for you. But only because I have nothing else to do right now!",
        "Alright. I'll check {user}. D-don't get me wrong. It's not like I'm doing this for you or anything."
    ],

    JOIN_INVALID_INVITE: "I... It's not like I wanted to join \"{invite}\"",
    JOIN_ALREADY: "Baka... I'm already stalking \"{invite}\"...",
    JOIN_FAILED: "It seems like \"{invite}\" doesn't like me... It's not like I wanted to be liked!",
    JOIN_SUCCESS: "New friends at \"{invite}\"? Yay!",

    HELP_TOP: [
        "What? Not even a please? Hmpf. Fine. Just this once. Here is a list of my commands:\r\n",
        "What? Not even a please? You understand it's a privilege to even be able to talk to me, right? You should feel honored! I'll do it, but ask nicely next time. Here's a list of my commands:\r\n",
        "Fine. Just this once. Here's a list of my commands:\r\n",
        "Fine. I'll help. Don't misunderstand, it's not like I l-like you or anything... I just like helping. Here is a list of my commands:\r\n",
        "Fine. I'll help. Don't misunderstand, it's not like I l-like you or anything... I just have a lot of free time. Here is a list of my commands:\r\n",
        "Alright. I'll help. You should feel grateful. Here's a list of my commands:\r\n",
        "Not even a please? Sempai has feelings too, you know! I mean, I may be a bot... but bots can have feelings too! You seem to be clueless, so I'll help you this one time. But try asking nicely next time.",
    ],
    HELP_BOTTOM: "You could also just prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",
    PLEASE_HELP_TOP: [
        "Eheh. :3 Okay, here is the list of my commands:\r\n",
        ":3 You're going to make Sempai blush. Here is the list of my commands you asked for!:\r\n",
        "You asked me nicely! If I was keeping track, you would gain one Sempai relationship point! T-t-that doesn't mean I like you now! Don't get any weird ideas. Anyway, here is the list of my commands you asked for!:\r\n",
        "Only because you asked nicely. D-don't get me wrong, I do this for everyone if they ask nicely!  Here is the list of my commands you asked for!:\r\n"
    ],
    PLEASE_HELP_BOTTOM: "You can also prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    SEMPAI_FUCKYOU: "I... It's not like I cared anyways <@{user}>! B..baka...",

    WRONG_HOLE: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo ONIICHAN VoHiYo KYAA~~~ VoHiYo",
    WRONG_HOLE_USER: "VoHiYo THATS VoHiYo THE VoHiYo WRONG VoHiYo HOLE VoHiYo <@{user}>~ONIICHAN VoHiYo KYAA~~~ VoHiYo",

    UNKNOWN_COMMAND: [
        "You're not making any sense to Sempai. If you ask me for help, I might just help you. If I can be bothered.",
        "You're not making any sense to Sempai. If you try asking me for help, maybe I'll consider it.",
        "Sempai does not understand. If you want help, ask nicely. Maybe I'll consider it.",
        "Are you stupid? That doesn't make any sense to Sempai."
    ],

    MULTIPLE_UNKNOWN_COMMAND: [
        "Sempai does not understand what you're trying to do! If you insist on wasting my time, why not ask for help? I'm not going to help you if you don't ask.",
        "You're still not making any sense to Sempai. Do you need me to spell it out for you? \"Sempai please help me\". That will do just fine. Don't forget the please."
    ],

    ERROR: [
        "I...I don't know what happened... Stop looking at me! I-it's not like I'm doing this on purpose or anything. Sempai is just really confused right now! :[",
        "Sempai is confused! Sempai hit herself in confusion. Ow!"
    ]
};

var responses = {
    current: responses_normal,
    currentMode: false,

    get: function(name){
        if(Array.isArray(responses.current[name]))
        {
            var idx = Math.floor(Math.random() * responses.current[name].length);
            return responses.current[name][idx];
        }

        return responses.current[name];
    },

    setMode: function(mode)
    {
        responses.currentMode = mode;
        if(responses.currentMode)
        {
            responses.current = responses_tsundere;
        }else{
            responses.current = responses_normal;
        }

        db.ConfigKeyValue.findOneAndUpdate({key: "mode"}, {value: {value: responses.currentMode}}, {}).then(function(doc){
            if(doc === null)
            {
                var dbkey = db.ConfigKeyValue.create({key: "mode", value: {value: responses.currentMode}});
                dbkey.save();
            }
        }).catch(function(err){
            console.log(err);
        });
    }
};

module.exports = responses;
