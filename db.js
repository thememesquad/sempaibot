var Datastore = require("nedb");

var data = {
    osu: null,
    data: null,
    load: function(callback){
        data.osu = new Datastore({filename: "database/osu.db", autoload: true});
        data.data = new Datastore({filename: "database/data.db", autoload: true});
        callback();
    }
};

module.exports = data;