const db = require("./db.js");

const responses_normal = {
    ONLINE: [
        "Hey guys! I'm back online!",
        "Hello! I'm back online!",
        "_has come online!_",
        "I'm back online! How can I be of service?",
        "I'm back online! How can I help?",
        "Hello! I'm back online! How can I be of help?"
    ],
    NAME: [
        "Yes I'm here! What can I do for you?",
        "Yes I'm here! How can I help?",
        "Yes I'm here  <@{author}>! How can I help?",
        "What's up <@{author}>? How can I help you?",
        "I'm here! What's up?",
        "I'm here! What's up <@{author}>?"
    ],
    SWITCHED: [
        "You don't like Tsundere mode? :( Fine. I'll revert back to my normal response mode!",
        "Alright, let me change modes... ... ...There! I'm in my normal response mode now!",
        "Okay, I'll change back to my normal response mode!"
    ],
    ALREADY_IN_MODE: [
        "I'm already in my normal response mode!",
        "Sempai is already in normal response mode!"
    ],
    REGION_CHANGED: [
        "Switched from region '{old_region}' to '{new_region}'.",
        "I switched our discord region from '{old_region}' to '{new_region}'!"
    ],
    REMIND_PAST: [
        "That time is in the past! I can't remind you of something in the past.",
        "That time is in the past! I can't remind you of something in the past. Or well, I'd need a time machine. If you happen to have one, no problem!",
        "That time is in the past! Unfortunately, Sempai is not equipped for time travel (yet!).",
        "I can't remind you of something in the past, silly!",
        "I can't remind you of something in the past."
    ],
    REMIND_ME: [
        "I will remind you to \"{message}\" {time}.",
        "Sempai will remind you to \"{message}\" {time}.",
        "Sempai will remind <@{author}> to \"{message}\" {time}."
    ],
    REMIND_OTHER: [
        "I will remind {people} to \"{message}\" {time}.",
        "Sempai will remind {people} to \"{message}\" {time}."
    ],
    REMINDER: "<@{author}> reminded {people}: {message}.",
    LIST_REMINDERS: "List of reminders on this server:{response}",

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

    OSU_FOLLOWING: [
        "Sempai is currently following:",
        "I'm currently following:"
    ],
    OSU_FOLLOWING_EMPTY: [
        "I'm not even following anyone!"
    ],
    OSU_NOT_FOLLOWING: [
        "I'm not even following \"{user}\"!",
        "Sempai isn't even following \"{user}\"!"
    ],
    OSU_STOPPED: [
        "Okay, I have stopped following {user}.",
        "Sempai unfollowed {user}!",
        "Alright, I unfollowed {user}!",
        "Okay, I unfollowed {user}!",
        "Sempai will no longer follow {user}.",
        "I stopped following {user}!",
        "Sempai stopped following {user}!",
        "Got it! I've unfollowed {user}."
    ],
    OSU_NEW_SCORE: "**{user}** has set a new #**{top_rank}** PP score! **{map_artist} - {map_title} [{map_diff_name}] {mods}** {additional} | **{acc}%** | **{pp}pp** | **Rank: {rank}** | **{old_total_pp}pp** -> **{new_total_pp}pp** ({delta_pp}) | #**{old_rank}** -> #**{new_rank}**! ({delta_rank})\r\nMap link: https://osu.ppy.sh/b/{beatmap_id}",
    OSU_USER_NOT_FOUND: [
        "I can't find user \"{user}\". Did you type it correctly?",
        "I can't find user \"{user}\". Did you make a typo?",
        "I can't find user \"{user}\". Are you sure you typed it correctly?",
        "I can't find user \"{user}\". Are you sure you typed the name correctly?",
        "I'm having trouble finding \"{user}\". Did you type it correctly?",
        "I'm having trouble finding \"{user}\". Did you make a typo?",
        "I'm having trouble finding \"{user}\". Are you sure you typed it correctly?",
        "I'm having trouble finding \"{user}\". Are you sure you typed the name correctly?"
    ],
    OSU_ALREADY_FOLLOWING: [
        "I'm already following {user}!",
        "Sempai is already following {user}!"
    ],
    OSU_ADDED_FOLLOWING: [
        "I'm now following {user} on osu!",
        "Sempai will now follow {user} on osu!"
    ],
    OSU_CHECK: [
        "No problem! I'll check {user} on osu! for you!",
        "No problem! Sempai will check {user} on osu! for you!"
    ],
    OSU_FOLLOWING_MODE: [
        "Sempai is currently following on {mode}:",
        "I'm currently following on {mode}:"
    ],
    OSU_STOPPED_MODE: [
        "Okay, I have stopped following {user} on {mode}.",
        "Sempai unfollowed {user} on {mode}!",
        "Alright, I unfollowed {user} on {mode}!",
        "Okay, I unfollowed {user} on {mode}!",
        "Sempai will no longer follow {user} on {mode}.",
        "I stopped following {user} on {mode}!",
        "Sempai stopped following {user} on {mode}!",
        "Got it! I've unfollowed {user} on {mode}."
    ],
    OSU_NEW_SCORE_MODE: "**{user}** has set a new #**{top_rank}** PP score for {mode}! **{map_artist} - {map_title} [{map_diff_name}] {mods}** {additional} | **{acc}%** | **{pp}pp** | **Rank: {rank}** | **{old_total_pp}pp** -> **{new_total_pp}pp** ({delta_pp}) | #**{old_rank}** -> #**{new_rank}**! ({delta_rank})\r\nMap link: https://osu.ppy.sh/b/{beatmap_id}",
    OSU_USER_NOT_FOUND_MODE: [
        "I can't find user \"{user}\" on {mode}. Did you type it correctly?",
        "I can't find user \"{user}\" on {mode}. Did you make a typo?",
        "I can't find user \"{user}\" on {mode}. Are you sure you typed it correctly?",
        "I can't find user \"{user}\" on {mode}. Are you sure you typed the name correctly?",
        "I'm having trouble finding \"{user}\" on {mode}. Did you type it correctly?",
        "I'm having trouble finding \"{user}\" on {mode}. Did you make a typo?",
        "I'm having trouble finding \"{user}\" on {mode}. Are you sure you typed it correctly?",
        "I'm having trouble finding \"{user}\" on {mode}. Are you sure you typed the name correctly?"
    ],
    OSU_ALREADY_FOLLOWING_MODE: [
        "I'm already following {user} on {mode}!",
        "Sempai is already following {user} on {mode}!"
    ],
    OSU_ADDED_FOLLOWING_MODE: [
        "I'm now following {user} on osu {mode}!",
        "Sempai will now follow {user} on osu {mode}!"
    ],
    OSU_CHECK_MODE: [
        "No problem! I'll check {user} on osu! for you! {mode}",
        "No problem! Sempai will check {user} on osu! for you! {mode}"
    ],
    JOIN_INVALID_INVITE: "I can't find a server with the invite: \"{invite}\".",
    JOIN_ALREADY: "I am already part of \"{invite}\".",
    JOIN_FAILED: "I was not able to join the server \"{invite}\".",
    JOIN_SUCCESS: "I just joined \"{invite}\"! Thanks for allowing me to join. I made <@{admin}> the admin.",

    HELP_TOP: "This is the current list of commands:\r\n",
    HELP_BOTTOM: "You could also prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    PLEASE_HELP_TOP: "This is the current list of commands:\r\n",
    PLEASE_HELP_BOTTOM: "You could also prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work.",

    SEMPAI_FUCKYOU: [
        "What did I do? :(",
        "What did Sempai ever do to you? :(",
        ":(",
        "I don't know what I did, but I'm sorry {user}. :[",
        "Meanie. :("
    ],

    UNKNOWN_COMMAND: [
        "Sempai doesn't understand.",
        "I... I don't understand. What do you want me to do?"
    ],

    MULTIPLE_UNKNOWN_COMMAND: [
        "That's not a valid command either. If you need help, please type \"sempai help me\".",
        "I still don't understand what you want me to do. If you require help, please type \"sempai help me\"."
    ],

    ERROR: "Error, error, error! If you see this message, please consider contacting the developers on github here: https://github.com/thememesquad/sempaibot/",

    MY_ROLE: "Your role is {role}.",
    MY_PERMISSIONS: "Your permissions are: {permissions}",
    NOT_ALLOWED: "You don't have permission to do that.",
    MODULE_INVALID: "That's not a valid module name.",
    MODULE_ALREADY_ENABLED: "That module is already enabled!",
    MODULE_NOT_ENABLED: "That module is already disabled!",
    MODULE_ENABLED: "{module} module is now enabled!",
    MODULE_DISABLED: "{module} module is now disabled.",
    MODULE_ALWAYS_ON: "The {module} module can't be disabled.",
    MODULE_LIST: "List of modules:",
    LIST_ROLES: "List of roles:",
    LIST_PERMISSIONS: "List of permissions:",
    INVALID_USER: "That user doesn't exist!",
    INVALID_ROLE: "That's not a valid role!",
    INVALID_CHANNEL: "There's no channel with that name.",
    ROLE_ASSIGNED: "Assigned {role} to <@{user}>.",
    ROLE_ALREADY_ASSIGNED: "Already assigned {role} to <@{user}>.",
    SETTING_UP: "Nice to meet you! Sempai is currently setting up on this server! Where do you want me to go?\r\n(use the command \"sempai go to #channel\")",
    OUTPUT_CHANNEL: [
        "Okay then, <#{channel}> will be my new home channel! Hurray~! If you want to know more about what I can do, type \"sempai help me\".",
        "All right! This is my new home channel, huh? I like it. If you want to know more about what I can do, type \"sempai help me\"."
    ],
    SHOW_IGNORELIST: "Ignore list:{list}",
    IGNORE_LIST_EMPTY: "I'm not ignoring anyone right now!",
    OSU_FOLLOW_LIST_EMPTY: "I'm not following anyone on osu! right now.",
    STARTED_IGNORING: "Got it! I'll ignore <@{user}> from now on!",
    STOPPED_IGNORING: "Alright, I'll stop ignoring <@{user}>.",
    ADDED_PERMISSION: "Added permission {permission} to {role}.",
    REMOVED_PERMISSION: "Removed permission {permission} from {role}.",

    CLEARED_REMINDERS: "Cleared {num} reminders.",
    INCORRECT_FORMAT: [
        "Sorry, Sempai is a little dumb sometimes... I won't know what you mean unless you tell me in a way I can understand!\r\nThe correct format is: \"{sample}\".",
        "I... I don't understand.\r\nPlease use this format: \"{sample}\".",
        "Huh? ...That's not the correct format!\r\nPlease use this format: \"{sample}\".",
        "Sorry, what do you want me to do, exactly?\r\nPlease use this format: \"{sample}\"."
    ],
    CHANNEL_DELETED: [
        "You... you destroyed my home. :( All those good chat memories we had there. Gone! Where do I go now? (use the command \"sempai go to #channel\")",
        "Did...did you just delete my home? My home channel? Who would do such a thing? Wait, am I getting an upgrade? A better channel? (use the command \"sempai go to #channel\")",
        "Did...did you just destroy my home channel? You can't just do these things! Bots have rights too, you know! Where do I go now? (use the command \"sempai go to #channel\")",
        "You... deleted? My home channel? My home? Why...? So am I-... am I homeless now? A homeless bot? Or are you going to give me a new home? (use the command \"sempai go to #channel\")"
    ],
    REMINDERS_LIST_EMPTY: "The reminder list is empty.",
    TIMEZONE_LIST: "List of known timezones:{timezones}",
    TLDR_FAILED: "Failed to create a tldr. My tldr functionality works best with web articles.",
    TLDR: "**{title}**:\r\n\"{summary}\"\r\n**Original reduced by {percentage}%.**",
    OSU_MAX_USER_LIMIT: "Reached the user limit of '{limit}'.",
    CHANGELOG: "Hi there! I'm back online now with the following changes: \r\n{changelog}",
    SHOW_STATISTICS: "Here are my statistics:\r\n- I'm currently running on {num_servers} servers and track {osu_num_users} users on osu!\r\n- I have made a total of {osu_alltime} osu! api calls, of which {osu_last_month} in the current month, {osu_last_week} in the current week, {osu_last_day} in the current day and {osu_last_minute} in the current minute.\r\n- I make an average of {osu_average_month} osu! api calls per month, {osu_average_week} per week and {osu_average_day} per day.\r\n- My highest number of osu! api calls are {osu_highest_month} per month, {osu_highest_week} per week and {osu_highest_day} per day.\r\n- There are currently {osu_api_queue} requests waiting.",
    LIST_SERVERS: "Sempai is currently running on:",
    CLEARED_REMINDER: "Alright, I removed the reminder.",
    NO_REMINDER: "I couldn't find the reminder!",
    OSU_SERVER_LIMIT: "This server currently has a limit of {limit} osu! users.",
    INVALID_SERVER: "There is no server with that id!",
    OSU_SERVER_LIMIT_CHANGED: "Changed osu! server limit to {new_limit} for server {server_name}.",
    SERVER_BLACKLISTED: "Ok, I blacklisted '{server_name}'.",
    SERVER_WHITELISTED: "Ok, I whitelisted '{server_name}'.",
    SERVER_ALREADY_BLACKLISTED: "{server_name} is already blacklisted!",
    SERVER_NOT_BLACKLISTED: "{server_name} is not blacklisted!",
    INFORM_SERVER_BLACKLISTED: "I hate to be the bearer of bad news, but it turns out that I have to start ignoring this server. This server has just been blacklisted. :frowning:",
    INFORM_SERVER_WHITELISTED: "Good news everybody! This server has just been removed from my blacklist which means I'm open to any conversation you guys want to have with me on this server! :smiley:",
    SERVER_BLACKLIST: "This is my current server blacklist:{response}",
    BLACKLISTED_USER: "Ok, I blacklisted user <@{user}>.",
    WHITELISTED_USER: "Ok, I whitelisted user <@{user}>.",
    USER_BLACKLIST: "This is my current user blacklist:{response}"
};

const responses_tsundere = {
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

    OSU_FOLLOWING: [
        "These are the people I like! I mean, associate with. I-it's not as if I really l-like them, or anything. Don't get any weird ideas!",
        "These are my osu! friends!",
        "These are the people I ~~stalk~~ follow on osu!",
        "These are the people I stal--... I mean follow on osu!"
    ],

    OSU_FOLLOWING_MODE: [
        "These are the people I like on {mode}! I mean, associate with. I-it's not as if I really l-like them, or anything. Don't get any weird ideas!",
        "These are my osu! friends on {mode}!",
        "These are the people I ~~stalk~~ follow on osu! {mode}",
        "These are the people I stal--... I mean follow on osu! {mode}"
    ],
    OSU_NOT_FOLLOWING: [
        "Are you stupid? I wasn't even following {user}!",
        "Are you stupid? I wasn't even following {user} in the first place!"
    ],
    OSU_FOLLOWING_EMPTY: [
        "I'm not even following anyone!"
    ],
    OSU_NOT_FOLLOWING_MODE: [
        "Are you stupid? I wasn't even following {user} on {mode}!",
        "Are you stupid? I wasn't even following {user} on {mode} in the first place!"
    ],
    OSU_STOPPED: [
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway... But maybe I'll miss {user} a little. Just a little.",
        "Okay. I won't follow {user} anymore. I-it's not like I really liked that person or anything anyway...  :'( "
    ],
    OSU_STOPPED_MODE: [
        "Okay. I won't follow {user} on {mode} anymore. I-it's not like I really liked that person or anything anyway... But maybe I'll miss {user} a little. Just a little.",
        "Okay. I won't follow {user} on {mode} anymore. I-it's not like I really liked that person or anything anyway...  :'( "
    ],

    OSU_USER_NOT_FOUND: "Baka~! I can't find that user. Did you type the username correctly?",
    OSU_ALREADY_FOLLOWING: "Baka~! I'm already following {user}!",
    OSU_ALREADY_FOLLOWING_MODE: "Baka~! I'm already following {user} on {mode}!",
    OSU_ADDED_FOLLOWING: [
        "Ooh a new osu! friend? I-It's not like I wanted more friends!",
        "Ooh a new osu! friend? Yaa~y! Uhm, I mean... I-It's not like I wanted more friends or anything!",
        "Added {user} to my osu! ~~stalk~~ follow list!",
        "Hmpf! It's not like I wanted more friends! But I will add {user} this one time! You should feel glad!"
    ],
    OSU_ADDED_FOLLOWING_MODE: [
        "Ooh a new osu! friend for {mode}? I-It's not like I wanted more friends!",
        "Ooh a new osu! friend for {mode}? Yaa~y! Uhm, I mean... I-It's not like I wanted more friends or anything!",
        "Added {user} to my osu! {mode} ~~stalk~~ follow list!",
        "Hmpf! It's not like I wanted more friends! But I will add {user} to {mode} this one time! You should feel glad!"
    ],
    OSU_CHECK: [
        "Fine. I'll check {user} for you. But only because I have nothing else to do right now!",
        "Alright. I'll check {user}. D-don't get me wrong. It's not like I'm doing this for you or anything."
    ],
    OSU_CHECK_MODE: [
        "Fine. I'll check {user} on {mode} for you. But only because I have nothing else to do right now!",
        "Alright. I'll check {user} on {mode}. D-don't get me wrong. It's not like I'm doing this for you or anything."
    ],

    OSU_MAX_USER_LIMIT: [
        "It's not like I don't want more friends... But Sempai just can't handle any more right now. 50 is my maximum!",
        "I could add more friends, but I just don't feel like it right now! 50 is enough, don't you think? Any more and Sempai's head will overload!"
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
        "Not even a please? Sempai has feelings too, you know! I mean, I may be a bot... but bots can have feelings too! You seem to be clueless, so I'll help you this one time. But try asking nicely next time.\r\n"
    ],
    PLEASE_HELP_TOP: [
        "Eheh. :3 Okay, here is the list of my commands:\r\n",
        ":3 You're going to make Sempai blush. Here is the list of my commands you asked for!:\r\n",
        "You asked me nicely! If I was keeping track, you would gain one Sempai relationship point! T-t-that doesn't mean I like you now! Don't get any weird ideas. Anyway, here is the list of my commands you asked for!:\r\n",
        "Only because you asked nicely. D-don't get me wrong, I do this for everyone if they ask nicely!  Here is the list of my commands you asked for!:\r\n"
    ],

    SEMPAI_FUCKYOU: "I... It's not like I cared about you anyway <@{user}>! B..baka... :(",

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
        "Error! Error! ~Kyaaaaaaaa~... I...I don't know what happened! Stop looking at me! I-it's not like I'm doing this on purpose or anything. Sempai is just really confused right now! :[. Please consider contacting my developers on github: https://github.com/thememesquad/sempaibot/",
        "Error! Error! Sempai is confused! Sempai hit herself in confusion. Ow! Please consider contacting my developers on github here: https://github.com/thememesquad/sempaibot/"
    ]
};

const responses = {
    current: responses_normal,
    currentMode: false,

    get: function(name) {
        let tmp = responses.current[name];
        if (tmp === undefined && responses.currentMode) {
            tmp = responses_normal[name];

            if (tmp !== undefined)
                console.log("Response '" + name + "' has no tsundere version.");
        }

        if (tmp === undefined) {
            console.log("unknown response: " + name);
            return responses.get("ERROR");
        }

        if (Array.isArray(tmp)) {
            let idx = Math.floor(Math.random() * tmp.length);
            return tmp[idx];
        }

        return tmp;
    },

    setMode: function(mode) {
        responses.currentMode = mode;
        if (responses.currentMode) {
            responses.current = responses_tsundere;
        } else {
            responses.current = responses_normal;
        }

        db.ConfigKeyValue.findOneAndUpdate({ key: "mode" }, { value: { value: responses.currentMode } }, {}).then(doc => {
            if (doc === null) {
                let dbkey = db.ConfigKeyValue.create({ key: "mode", value: { value: responses.currentMode } });
                dbkey.save();
            }
        }).catch(err => {
            console.log(err);
        });
    }
};

module.exports = responses;