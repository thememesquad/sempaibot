var responses = require("../responses.js");
var util = require("../util.js");
var gd = require('node-gd');
var fs = require('fs');
var appRoot = require('app-root-path');

function chunk(str, n) {
    var ret = [];
    var i;
    var len;

    for(i = 0, len = str.length; i < len; i += n) {
        var tmp = str.substr(i, n);
        if (tmp.substr(0,1) === " ") {
            tmp = tmp.substr(1);
        }
        console.log("String: " + tmp);
        var ind = tmp.indexOf(" ");
        if (ind !== -1) {
            console.log("Space found at location: " + ind);
            tmp = tmp.substr(0, ind);
            console.log("New string: " + tmp);
            console.log("prev i: " + i);
            i = i - (n - (ind - 1));
            console.log("final i: " + i);
        }
        ret.push(tmp);
        //ret.push(str.substr(i, n));
    }

    return ret;
};

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
                var fontsize = 18;
                var txtColor = img.colorAllocate(0, 0, 0);
                var fontPath = appRoot + '/assets/wildwordsbold.ttf';
                var name = m.author.username;
                namesize = name.length;
                var maxpos = Math.min(namesize, 7);
                var position = parseInt((maxpos * fontsize) / 2);
                if (namesize > 7) {
                    name = chunk(name, 7).join("\n");
                }
                
                img.stringFT(txtColor, fontPath, fontsize, 0, 105 - position, 355, name);
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
