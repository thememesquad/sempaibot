"use strict";

var config = require("../config");
var connect = require('camo').connect;
var Document = require('camo').Document;
var Q = require("q");

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
    load: function(){
        var defer = Q.defer();

		var db_name = config.db_database || "";
		connect("mongodb://" + config.db_username + ":" + config.db_password + "@" + config.db_host + ":" + config.db_port + "/" + db_name).then(function(db) {
            console.log("Using MongoDB as DB system.");
            data.db = db;

            defer.resolve("mongodb");
		}).catch(function(err){
            console.log(err);

            connect("nedb://data").then(function(db){
                console.log("Using NeDB as DB system.");
                data.db = db;

                defer.resolve("nedb");
            }).catch(function(err){
                defer.reject(err);
            })
		});

        return defer.promise;
    }
};

module.exports = data;
