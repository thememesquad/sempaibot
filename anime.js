var http = require("http");
var https = require("https");
var parseString = require('xml2js').parseString;
var cloudscraper = require('cloudscraper');
var g = require('ger');
var esm = new g.MemESM();
var ger = new g.GER(esm);
var lodash = require("lodash");
var parseTorrent = require('parse-torrent');
const util = require('util');
const EventEmitter = require('events');
ger.initialize_namespace("anime");

var magnetLink = function(url, callback){
    cloudscraper.request({method: "GET", url: url, encoding: null}, function(error, response, body){
        try{
            var torrent = parseTorrent(body);
            callback(null, 'magnet:?xt=urn:btih:' + torrent.infoHash);
        }catch(e)
        {
            callback(e);
        }
    });
};

function Recommend()
{
    this.users = [];
    this.anime = {};
}

Recommend.prototype.addUser = function(user){
    this.users.push(user);
};

Recommend.prototype.removeUser = function(user){
    this.users.splice(this.users.indexOf(user));
};

Recommend.prototype.save = function(){
    //todo
};

Recommend.prototype.load = function(data){
    //todo
};

Recommend.prototype.update = function(callback){
    var _this = this;
    
    this.anime = {};
    var update = function(id){
        if(id >= _this.users.length)
            return (callback !== undefined) ? callback() : null;
        
        var options = {
            host: 'myanimelist.net',
            port: 80,
            path: "/malappinfo.php?status=all&type=anime&u=" + _this.users[id]
        };
        
        http.get(options, function(res){
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            
            res.on('end', function () {
                parseString(data, function(err, result){
                    for(var i = 0;i<result.myanimelist.anime.length;i++)
                    {
                        var anime = result.myanimelist.anime[i];
                        if(anime.my_score[0] == 0 || anime.series_type[0] != 1)
                            continue;
                        
                        if(_this.anime[anime.series_animedb_id[0]] === undefined)
                        {
                            _this.anime[anime.series_animedb_id[0]] = {
                                name: anime.series_title[0],
                                scores: {}
                            };
                        }
                        
                        var date = new Date(parseInt(anime.my_last_updated[0]) * 1000);
                        date.setFullYear(date.getFullYear() + 3);
                        
                        if(parseInt(anime.my_score[0]) >= 7)
                        {
                            ger.events([{
                                namespace: "anime",
                                person: id,
                                action: anime.my_score[0],
                                thing: parseInt(anime.series_animedb_id[0]),
                                expires_at: date.toString()
                            }]);
                        }
                        
                        _this.anime[anime.series_animedb_id[0]].scores[id] = anime.my_score[0];
                    }
                    
                    update(id + 1);
                });
            });
        });
    };
    
    if(this.users.length == 0)
        return (callback !== undefined) ? callback() : null;
    
    update(0);
};

Recommend.prototype.recommend = function(user){
    var id = this.users.indexOf(user);
    if(id == -1)
        return;
    
    ger.recommendations_for_person("anime", id, {
        actions: {
            "1": -6,
            "2": -5,
            "3": -4,
            "4": -3,
            "5": -2,
            "6": -1,
            "7": 1,
            "8": 2,
            "9": 3,
            "10": 4
        }
    }).then(function(recommendations){
        console.log(user + ":");
        for(var i = 0;i<recommendations.recommendations.length;i++)
        {
            var recommendation = recommendations.recommendations[i];
            
            if(this.anime[recommendation.thing].scores[id] === undefined)
                console.log(this.anime[recommendation.thing].name);
        }
        console.log("confidence: " + recommendations.confidence);
        console.log("");
    }.bind(this));
};

function Anime()
{
    this.regex = [
        /\[(.*)\] (.*) - (.*) (\[([^\]]+)\])\.?(.*)?/,
        /\[(.*)\] (.*) - (.*) (\(([^\)]+)\))\.?(.*)?/
    ];
    this.alternateNames = {};
    this.alternateFilled = false;
    this.lastResults = [];
    this.tracking = {};
    
    //http://thexem.de/map/allNames?origin=tvdb
}

Anime.prototype.search = function(anime, callback){
    var _this = this;
    
    var retrieve = function(){
        http.get("http://skyhook.sonarr.tv/v1/tvdb/search/en/?term=" + anime, function(res){
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            
            res.on('end', function () {
                var parsed = JSON.parse(data);
                var shows = [];
                for(var i = 0;i<parsed.length;i++)
                {
                    var titles = [parsed[i].title];
                    if(_this.alternateNames[parsed[i].tvdbId] !== undefined)
                    {
                        titles = titles.concat(_this.alternateNames[parsed[i].tvdbId]);
                    }
                    
                    parsed[i].titles = titles;
                    parsed[i].id = parsed[i].tvdbId;
                    
                    shows.push({
                        titles: titles,
                        description: parsed[i].overview,
                        firstAired: parsed[i].firstAired,
                        network: parsed[i].network,
                        status: parsed[i].status,
                        id: parsed[i].tvdbId
                    });
                }
                
                _this.lastResults = parsed;
                callback(shows);
            });
        });
    };
    
    if(!this.alternateFilled)
    {
        this.updateAlternateNames(retrieve);
    }else{
        retrieve();
    }
};

Anime.prototype.getName = function(id){
    if(id < 0 || id >= this.lastResults.length)
        return null; //invalid id
    
    return this.lastResults[id].titles[0];
};

Anime.prototype.track = function(id){
    if(id < 0 || id >= this.lastResults.length)
        return -1; //invalid id
    
    if(this.tracking[this.lastResults[id].id] !== undefined)
        return 0; //already tracking
    
    this.tracking[this.lastResults[id].id] = this.lastResults[id];
    this.tracking[this.lastResults[id].id].lastUpdated = -1;
    this.tracking[this.lastResults[id].id].magnets = {};
    this.updateAnime(this.lastResults[id].id);
    
    return 1; //started tracking
};

/*
  { title: [ '[LNS] Shirobako - 01-24 [BD 720p]' ],
    category: [ 'English-translated Anime' ],
    link: [ 'https://www.nyaa.eu/?page=download&tid=788021' ],
    guid: [ 'https://www.nyaa.eu/?page=view&tid=788021' ],
    description: [ '20 seeder(s), 24 leecher(s), 694 download(s) - 8.42 GiB - Trusted' ],
    pubDate: [ 'Wed, 24 Feb 2016 09:57:45 +0000' ] }
    
      { title: [ '[SquareSubs] Medarot Ep 39v1' ],
    category: [ 'English-translated Anime' ],
    link: [ 'https://www.nyaa.eu/?page=download&tid=788022' ],
    guid: [ 'https://www.nyaa.eu/?page=view&tid=788022' ],
    description: [ '7 seeder(s), 0 leecher(s), 266 download(s) - 152.3 MiB' ],
    pubDate: [ 'Wed, 24 Feb 2016 09:59:39 +0000' ] }
*/

function parseDescription(description)
{
    var regex = /(.*) seeder\(s\), (.*) leecher\(s\), (.*) download\(s\) - ([^-]+)(?:- (.*))?/;
    var parsed = regex.exec(description);
    var trusted = parsed[5] !== undefined && parsed[5] == "Trusted";
    var remake = parsed[5] !== undefined && parsed[5] == "Remake";
    
    var ret = {
        seeders: parsed[1],
        leechers: parsed[2],
        downloads: parsed[3],
        size: parsed[4],
        trusted: trusted,
        remake: remake
    };
    
    return ret;
}

Anime.prototype.onNewMagnetLink = function(id, ep){
    var magnetData = this.tracking[id].magnets[ep][this.tracking[id].magnets[ep].length - 1];
    var endTime = new Date(new Date().getTime() - (12 * 60 * 60 * 1000));
    
    if(this.tracking[id].magnets[ep].length == 1)
    {
        for(var i = 0;i<this.tracking[id].episodes.length;i++)
        {
            var episode = this.tracking[id].episodes[i];
            if(episode.absoluteEpisodeNumber == ep)
            {
                var date = new Date(episode.airDateUtc);
                var delta = date.getTime() - endTime.getTime();
                if(delta < 0)
                    return; //for a non-recent episode
                
                this.emit("newDownload", this.tracking[id].titles[0], magnetData);
            }
        }
    }
};

Anime.prototype.match = function(title, description, date, link){
    var _this = this;
    
    link = decodeURI(link);
    for(var i = 0;i<this.regex.length;i++)
    {
        var m = this.regex[i].exec(title);
        if(m == null)
            continue;
        
        var name = m[2].trim();
        var quality = m[5].trim();
        var ep = m[3].trim();
        var group = m[1].trim();
        
        for(var key in this.tracking)
        {
            if(this.tracking[key].titles.indexOf(name) != -1)
            {
                if(this.tracking[key].magnets[ep] === undefined)
                    this.tracking[key].magnets[ep] = [];
                
                magnetLink(link, function(err, magnetLink){
                    _this.tracking[key].magnets[ep].push({
                        file: title,
                        group: group,
                        quality: quality,
                        data: parseDescription(description),
                        date: date,
                        magnet: magnetLink
                    });
                    
                    _this.onNewMagnetLink(key, ep);
                });
                
                break;
            }
        }
        
        break;
    }
};

Anime.prototype.updateAlternateNames = function(callback){
    var _this = this;
    
    http.get("http://thexem.de/map/allNames?origin=tvdb", function(res){
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        
        res.on('end', function () {
            _this.alternateNames = JSON.parse(data).data;
            _this.alternateFilled = true;
            
            callback();
        });
    });
};

Anime.prototype.updateAnime = function(id){
    var _this = this;
    
    http.get("http://skyhook.sonarr.tv/v1/tvdb/shows/en/" + id, function(res){
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        
        res.on('end', function () {
            data = JSON.parse(data);
            _this.tracking[id] = lodash.merge(_this.tracking[id], data);
            _this.tracking[id].lastUpdated = Date.now();
        });
    });
};

Anime.prototype.update = function(){
    var _this = this;
    
    for(var key in this.tracking)
    {
        this.updateAnime(key);
    }
    
    cloudscraper.get("https://www.nyaa.eu/?page=rss&cats=1_37", function(error, response, body){
        parseString(body, function(err, result){
            var results = result.rss.channel[0].item;
            for(var i = 0;i<results.length;i++)
            {
                var item = results[i];
                var title = item.title[0];
                var link = item.link[0];
                var description = item.description[0];
                var date = item.pubDate[0];
                
                _this.match(title, description, date, link);
            }
        });
    });
};
util.inherits(Anime, EventEmitter);

module.exports = {
    Recommend: Recommend,
    Anime: Anime
};