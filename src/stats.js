"use strict";

const Document = require("camo").Document;
const EmbeddedDocument = require("camo").EmbeddedDocument;

class StatsHistoryDB extends EmbeddedDocument
{
    constructor()
    {
        super();
        
        this.date = Date;
        this.value = Number;
    }
}

class StatsSubDB extends EmbeddedDocument
{
    constructor()
    {
        super();
        
        this.name = String;
        this.value = Number;
        
        this.alltime = Number;
        this.avg_month = Number;
        this.avg_week = Number;
        this.avg_day = Number;
        
        this.high_month = Number;
        this.high_week = Number;
        this.high_day = Number;
        
        this.current_month = Number;
        this.current_week = Number;
        this.current_day = Number;
        
        this.last_update = Date;
        this.history = [StatsHistoryDB];
        this.generate_vdata = Boolean;
    }
}

class StatsDB extends Document
{
    constructor()
    {
        super();

        this.stats = [StatsSubDB];
    }
}

Date.prototype.getWeek = function() {
    let date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    let week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

Date.prototype.getWeekYear = function() {
    let date = new Date(this.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
};

class StatsManager
{
    constructor()
    {
        this.stats = {};
        this.db_doc = null;
    }
    
    load()
    {
        return new Promise((resolve, reject) => {
            StatsDB.findOne({}).then(doc => {
                if(doc !== null)
                    this.parse_db(doc);
                
                setInterval(() => {
                    this.save().catch(err => {
                        console.log("error saving stats: ", err);
                    });
                }, 5 * 60 * 1000); //5min
                
                if(doc === null)
                {
                    this.save().then(() => {
                        resolve();
                    }).catch(err => {
                        reject(err);
                    });
                }
                else
                {
                    resolve();
                }
            }).catch(err => {
                reject(err);
            });
        });
    }
    
    save()
    {
        return new Promise((resolve, reject) => {
            this.update_db();
            this.db_doc.save().then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    }
    
    parse_db(doc)
    {
        this.db_doc = doc;
        for(let i = 0;i<this.db_doc.stats.length;i++)
        {
            let tmp = this.db_doc.stats[i];
            let history = [];
            
            for(let j = 0;j<tmp.history.length;j++)
            {
                history.push({
                    time: tmp.history[j].date,
                    value: tmp.history[j].value
                });
            }
            
            this.stats[tmp.name] = {
                value: tmp.value,
                
                alltime: tmp.alltime,
                average_monthly: tmp.avg_month,
                average_weekly: tmp.avg_week,
                average_daily: tmp.avg_day,
                
                highest_monthly: tmp.high_month,
                highest_weekly: tmp.high_week,
                highest_daily: tmp.high_day,
                
                current_monthly: tmp.current_month,
                current_weekly: tmp.current_week,
                current_daily: tmp.current_day,
                
                last_update: tmp.last_update,
                history: history,
                
                generate_vdata: tmp.generate_vdata
            };
        }
    }
    
    update_db()
    {
        let stats = [];
        
        for(let key in this.stats)
        {
            let stat = this.stats[key];
            let history = [];
            
            for(let i = 0;i<stat.history.length;i++)
            {
                history.push(StatsHistoryDB.create({
                    date: stat.history[i].time,
                    value: stat.history[i].value
                }));
            }
            
            stats.push(StatsSubDB.create({
                name: key,
                value: stat.value,
                
                alltime: stat.alltime,
                avg_month: stat.average_monthly,
                avg_week: stat.average_weekly,
                avg_day: stat.average_daily,
                
                high_month: stat.highest_monthly,
                high_week: stat.highest_weekly,
                high_day: stat.highest_daily,
                
                current_month: stat.current_monthly,
                current_week: stat.current_weekly,
                current_day: stat.current_daily,
                
                last_update: stat.last_update,
                history: history,
                
                generate_vdata: stat.generate_vdata
            }));
        }
        
        if(this.db_doc === null)
            this.db_doc = StatsDB.create({
                stats: stats
            });
        else
            this.db_doc.stats = stats;
    }
    
    register(name, value, generate_vdata)
    {
        generate_vdata = generate_vdata || false;
        
        if(this.stats[name] !== undefined)
        {
            this.update(name, value);
            return;
        }
        
        this.stats[name] = {
            value: value,
            
            alltime: null,
            average_monthly: null,
            average_weekly: null,
            average_daily: null,
            
            highest_monthly: null,
            highest_weekly: null,
            highest_daily: null,
            
            current_monthly: null,
            current_weekly: null,
            current_daily: null,
            
            last_update: new Date(),
            history: [],
            
            generate_vdata: generate_vdata
        };
        
        if(generate_vdata)
        {
            this.stats[name].alltime = value;
            this.stats[name].current_monthly = value;
            this.stats[name].current_weekly = value;
            this.stats[name].current_daily = value;
        }
        
        this.stats[name].history.push({
            time: this.stats[name].last_update,
            value: value
        });
    }
    
    update(name, value)
    {
        if(this.stats[name] === undefined)
            return;
        
        let prev = this.stats[name].last_update;
        this.stats[name].value = value;
        this.stats[name].last_update = new Date();
        
        this.stats[name].history.push({
            time: this.stats[name].last_update,
            value: value
        });
        
        //Now minus 1 month (30days * 24h * 60m * 60s * 1000ms)
        let start = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        let idx = -1;
        for(let i = 0;i<this.stats[name].history.length;i++)
        {
            if(this.stats[name].history[i].time < start)
                idx = i;
            else
                break;
        }
        
        if(idx !== -1)
        {
            this.stats[name].history.splice(0, idx);
        }
        
        this.update_vstats(name, prev);
    }
    
    update_vstats(name, prev)
    {
        if(this.stats[name] === undefined || !this.stats[name].generate_vdata)
            return;
        
        let stat = this.stats[name];
        
        
        if(prev.getDate() !== stat.last_update.getDate())
        {
            stat.average_daily = stat.average_daily ? (stat.average_daily + stat.current_daily) / 2.0 : stat.current_daily;
            stat.highest_daily = stat.highest_daily ? Math.max(stat.highest_daily, stat.current_daily) : stat.current_daily;
            stat.current_daily = 0;
        }
        
        if(prev.getWeek() !== stat.last_update.getWeek())
        {
            stat.average_weekly = stat.average_weekly ? (stat.average_weekly + stat.current_weekly) / 2.0 : stat.current_weekly;
            stat.highest_weekly = stat.highest_weekly ? Math.max(stat.highest_weekly, stat.current_weekly) : stat.current_weekly;
            stat.current_weekly = 0;
        }
        
        if(prev.getMonth() !== stat.last_update.getMonth())
        {
            stat.average_monthly = stat.average_monthly ? (stat.average_monthly + stat.current_monthly) / 2.0 : stat.current_monthly;
            stat.highest_monthly = stat.highest_monthly ? Math.max(stat.highest_monthly, stat.current_monthly) : stat.current_monthly;
            stat.current_monthly = 0;
        }
        
        stat.alltime += stat.value;
        stat.current_daily += stat.value;
        stat.current_weekly += stat.value;
        stat.current_monthly += stat.value;
        
        this.stats[name] = stat;
    }
    
    get_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].value;
    }
    
    get_unit(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].unit;
    }
    
    get_average_month_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].average_monthly || this.stats[name].current_monthly;
    }
    
    get_average_week_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].average_weekly || this.stats[name].current_weekly;
    }
    
    get_average_day_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].average_daily || this.stats[name].current_daily;
    }
    
    get_highest_month_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].highest_monthly || this.stats[name].current_monthly;
    }
    
    get_highest_week_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].highest_weekly || this.stats[name].current_weekly;
    }
    
    get_highest_day_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].highest_daily || this.stats[name].current_daily;
    }
    
    get_month_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].current_monthly;
    }
    
    get_week_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].current_weekly;
    }
    
    get_day_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].current_daily;
    }
    
    get_alltime_value(name)
    {
        if(this.stats[name] === undefined)
            return null;
        
        return this.stats[name].alltime;
    }
}

module.exports = new StatsManager();