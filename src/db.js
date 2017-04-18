"use strict";

const config = require("../config.js");
const connect = require("camo").connect;
const Document = require("camo").Document;

class ConfigKeyValue extends Document
{
    constructor()
    {
        super();

        this.key = String;
        this.value = Object;
    }
}

class Database
{
    constructor()
    {
        this.db = null;
        this.ConfigKeyValue = ConfigKeyValue;
    }

    load(bot)
    {
        return new Promise((resolve, reject) => {
            if(typeof config.use_mongodb === "undefined" || config.use_mongodb)
            {
                var db_name = config.db_database || "";
                connect("mongodb://" + config.db_username + ":" + config.db_password + "@" + config.db_host + ":" + config.db_port + "/" + db_name).then(db => {
                    bot.log("Using MongoDB as DB system.");
                    this.db = db;

                    resolve("mongodb");
                }).catch(() => {
                    connect("nedb://data").then(db => {
                        bot.log("Using NeDB as DB system.");
                        this.db = db;

                        resolve("nedb");
                    }).catch(err => {
                        reject(err);
                    });
                });
            }
            else
            {
                connect("nedb://data").then(db => {
                    bot.log("Using NeDB as DB system.");
                    this.db = db;

                    resolve("nedb");
                }).catch(err => {
                    reject(err);
                });
            }
        });
    }
}

module.exports = new Database();
