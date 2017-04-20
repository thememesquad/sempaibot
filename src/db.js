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

    connect_mongodb(bot) {
        let db_name = config.db_database || "";
        return connect(`mongodb://${config.db_username}:${config.db_password}@${config.db_host}:${config.db_port}/${db_name}`).then(db => {
            bot.log("Using MongoDB as DB system.");
            this.db = db;

            return "mongodb";
        });
    }

    connect_nedb(bot) {
        return connect("nedb://data").then(db => {
            bot.log("Using NeDB as DB system.");
            this.db = db;

            return "nedb";
        });
    }

    load(bot)
    {
        if(typeof config.use_mongodb === "undefined" || config.use_mongodb) {
            return this.connect_mongodb(bot).catch(() => {
                return this.connect_nedb(bot);
            });
        }

        return this.connect_nedb(bot);
    }
}

module.exports = new Database();
