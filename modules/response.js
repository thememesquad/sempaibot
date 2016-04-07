var responses = require("../responses.js");
var util = require("../util.js");
var gd = require('node-gd');
var fs = require('fs');
var appRoot = require('app-root-path');

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
              console.log(__dirname);
              console.log(appRoot + '/assets/chitoge-love.png');
              if (!fs.existsSync(appRoot + '/assets/chitoge-love.png')) {
              // Do something
              console.log("Nope");
              return;
              }
              gd.openFile(appRoot + '/assets/chitoge-love.png', function(err, img) {
                if (err) {
                  console.log("Something went wrong opening file");
                  return;
                }
                if (typeof img === "null") {
                    console.log("Image is null");
                    return;
                }
                var fontsize = 24;
                var txtColor = img.colorAllocate(0, 0, 0);
                var fontPath = appRoot + '/assets/wildwordsbold.ttf';
                var namesize = m.author.username;
                namesize = namesize.length;
                while(namesize * fontsize > 160) {
                    fontsize -= 1;
                    namesize = (namesize * fontsize) / 2;
                }
                var position = (namesize * fontsize) / 2;
                img.stringFT(txtColor, fontPath, fontsize, 0, 100 - position, 425, m.author.username);
                img.saveFile(appRoot + '/saved/love.png', function(err) {
                    if (err) {
                      console.log("Something went wrong saving file");
                  return;
                    }
                    
                    Bot.discord.sendFile(m.channel, appRoot +  "/saved/love.png", "love.png", function(err, message) {
                        if (err) {
                            console.log("Something went wrong sending file");
                            return;
                        }
                    });
                }.bind(m));
            }.bind(m));
          }
      });
    }
}
