var responses = require("../responses.js");
var util = require("../util.js");

module.exports = {
    moduleName: "Response",
    load: function(Bot) {
      Bot.addCommand({
        name: "RESPONSE_FUCKYOU",
        command: /fuck you/,
        sample: "sempai fuck you",
        description: "Scold sempai",
        action: function(message){
            //todo
            Bot.discord.reply(m, response.get("SEMPAI_FUCKYOU").format({author: m.author.id}));
        }
      });
    }
}
