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
        ret.push(str.substr(i, n));
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
                var name = "I love " + m.author.username;
                namesize = name.length;
                var maxpos = Math.min(namesize, 7);
                var position = parseInt((maxpos * fontsize) / 2);
                var tmpname = name.split(" ");
                if (namesize > 7) {
                    var i = 0;
                    while (i < tmpname.length) {
                        var tmp = tmpname[i] + " " + tmpname[i+1];
                        if (tmp.length <= 7) {
                            tmpname[i] = tmp;
                            tmpname.splice(i + 1, 1);
                        }
                        i += 1;
                    }
                    /*for(var i = 0; i < tmpname.length; i++) {
                        while(tmpname[i].length < 7) {
                            var tmp = tmpname[i] + " " + tmpname[i+1];
                            if (tmp.length < 7) {
                                tmpname[i] = tmpname[i] + " " + tmpname[i+1];
                                tmpname.splice(i+1, 1);
                            }
                        }
                        tmpname[i] = chunk(tmpname[i], 7).join("\n");
                    }*/
                }
                var vertpos;
                if (tmpname.length !== 1)
                    vertpos = ((tmpname.length - 1) * (fontsize + 5)) / 2;
                else {
                    vertpos = 0;
                }
                
                for(var i = 0; i < tmpname.length; i++) {
                    var pos = parseInt((tmpname[i].length * (fontsize)) / 2);
                    img.stringFT(txtColor, fontPath, fontsize, 0, 105 - pos, parseInt((402 - vertpos) + ((fontsize + 5) * i)), tmpname[i]);
                }
                
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
