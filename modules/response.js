var responses = require("../responses.js");
var util = require("../util.js");
var gd = require('node-gd');

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
            Bot.discord.reply(message, responses.get("SEMPAI_FUCKYOU").format({author: message.author.id}));
        }
      });
      Bot.addCommand({
          name: "RESPONSE_LOVE",
          command: /i love you/,
          sample: "sempai i love you",
          description: "Show sempai some love",
          action: function(m) {
              var img = gd.createSync(500, 449);
              gd.openFile('/assets/chitoge_love.png', function(err, img) {
                if (err) {
                  throw err;
                }
                var txtColor = img.colorAllocate(255, 255, 255);
                var fontPath = '/assets/wildwordsbold.ttf';
                img.stringFT(txtColor, fontPath, 24, 0, 35, 400, m.author.username);
                img.saveFile('/saved/' + m.author.username + ".png", function(err) {
                    if (err) {
                      throw err;
                    }
                    
                    Bot.discord.sendFile(m.channel, "/saved/" + m.author.username + ".png", "love.png", function(err, message) {
                        if (err) {
                            throw err;
                        }
                    });
                }.bind(m));
            }.bind(m));
          }
      });
    }
}
