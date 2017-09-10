const timestamps = [
    60000, //1min
    600000, //10min
    3600000, //1h
    10800000, //3h
    86400000, //24h
    604800000, //7days
    2592000000, //30days
];

/*class CounterDB extends Document {
    constructor() {
        super();

        this.name = String;
        this.deltaTime = Number;
        this.currentTime = Number;

        this.current = Number;
        this.average = Number;
        this.highest = Number;
        this.lowest = Number;
    }
}*/

class Counter {
    _name: string;
    _delta: number;
    _currentTime: number;
    
    _current: number;
    _average: number;
    _highest: number;
    _lowest: number;

    constructor(name: string, delta: number, start: number, document) {
        this._name = name;
        this._currentTime = start;
        this._delta = delta;

        this._current = 0;
        this._average = 0;
        this._highest = Number.MIN_VALUE;
        this._lowest = Number.MAX_VALUE;

        /*this.document = document || CounterDB.create({
            name: this._name,
            deltaTime: this._delta,
            currentTime: this._currentTime,

            current: this._current,
            average: this._average,
            highest: this._highest,
            lowest: this._lowest
        });*/
    }

    update(num: number) {
        this.refresh();

        this._current += num;
        this._highest = Math.max(this._highest, this._current);
        this._lowest = Math.min(this._lowest, this._current);

        //this.document.highest = this._highest;
        //this.document.lowest = this._lowest;
        //this.document.current = this._current;
    }

    refresh() {
        let current = Date.now();
        while (current - this._currentTime >= this._delta) {
            this._highest = Math.max(this._highest, this._current);
            this._lowest = Math.min(this._lowest, this._current);
            this._average = (this._average + this._current) / 2.0;
            this._current = 0;

            this._currentTime += this._delta;
        }

        /*this.document.highest = this._highest;
        this.document.lowest = this._lowest;
        this.document.average = this._average;
        this.document.current = this._current;
        this.document.currentTime = this._currentTime;*/
    }

    get current(): number {
        return this._current;
    }

    get average(): number {
        return this._average;
    }

    get lowest(): number {
        return this._lowest;
    }

    get highest(): number {
        return this._highest;
    }
}

export class StatsManager {
    static load(): Promise<void> {
        return Promise.resolve();
        /*return CounterDB.find({}).then(docs => {
            this.processDatabase(docs);

            setInterval(() => {
                this.save().catch(err => {
                    console.log("error saving stats: ", err);
                });
            }, 5 * 60 * 1000); //5min
        });*/
    }

    static save(): Promise<any[]> {
        let all = [];

        /*for (let key in this.stats)
            all.push(this.stats[key].document.save());*/

        return Promise.all(all);
    }

    static processDatabase(docs) {
        //for (let i = 0; i < docs.length; i++)
        //    this.stats[docs[i].name + "_" + docs[i].deltaTime] = new Counter(docs[i].name, docs[i].deltaTime, docs[i].currentTime, docs[i]);
    }

    static register(name, value): Counter {
        /*if (typeof this.stats[name + "_" + timestamps[0]] !== "undefined")
            return;

        for (let delta of timestamps) {
            var date = new Date();  //or use any other date
            var rounded = new Date(Math.round(date.getTime() / delta) * delta);

            this.stats[name + "_" + delta] = new Counter(name, delta, rounded.valueOf());
            this.stats[name + "_" + delta].update(value);
        }*/

        return null;
    }

    static update(name, value): Counter {
        //if (typeof this.stats[name + "_" + timestamps[0]] === "undefined")
        //    return;

        //for (let delta of timestamps)
        //    this.stats[name + "_" + delta].update(value);
        return null;
    }

    static get(name, delta): Counter {
        /*if (typeof this.stats[name + "_" + delta] === "undefined")
            return null;

        this.stats[name + "_" + delta].refresh();
        return this.stats[name + "_" + delta];*/
        return null;
    }
}