"use strict";

var config = require("../config.js");
var connect = require("camo").connect;
var Document = require("camo").Document;

class ConfigKeyValue extends Document
{
    constructor()
    {
        super();

        this.key = String;
        this.value = Object;
    }
}

var data = {
    db: null,
    ConfigKeyValue: ConfigKeyValue,
    load: function(bot){
        return new Promise(function(resolve, reject){
            if(typeof config.use_mongodb === "undefined" || config.use_mongodb)
            {
                var db_name = config.db_database || "";
                connect("mongodb://" + config.db_username + ":" + config.db_password + "@" + config.db_host + ":" + config.db_port + "/" + db_name).then(function(db) {
                    bot.log("Using MongoDB as DB system.");
                    data.db = db;

                    resolve("mongodb");
                }).catch(function(){
                    connect("nedb://data").then(function(db){
                        bot.log("Using NeDB as DB system.");
                        data.db = db;

                        resolve("nedb");
                    }).catch(function(err){
                        reject(err);
                    });
                });
            }
            else
            {
                connect("nedb://data").then(function(db){
                    bot.log("Using NeDB as DB system.");
                    data.db = db;

                    resolve("nedb");
                }).catch(function(err){
                    reject(err);
                });
            }
        });
    }
};

module.exports = data;
