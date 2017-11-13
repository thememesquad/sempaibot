export interface ICronInterface {
    numRepeatsLeft: number;
    interval: number;
    lastTime: number;

    callback: (time: number) => void;
}

export class Cron {
    private static _instance: Cron = new Cron();

    private _timers: ICronInterface[] = [];
    private _timer: NodeJS.Timer = null;

    public addTimer(period: number, callback: (time: number) => void): ICronInterface {
        const timer: ICronInterface = {
            callback,
            interval: period,
            lastTime: Date.now(),
            numRepeatsLeft: 1
        };

        this._timers.push(timer);
        return timer;
    }

    public addInterval(period: number, callback: (time: number) => void, numTimes: number = -1): ICronInterface {
        const timer: ICronInterface = {
            callback,
            interval: period,
            lastTime: Date.now(),
            numRepeatsLeft: numTimes
        };

        this._timers.push(timer);
        return timer;
    }

    public remove(timer: ICronInterface): boolean {
        const index = this._timers.indexOf(timer);
        if (index === -1)
            return false;

        this._timers.splice(index, 1);
        return true;
    }

    public start() {
        if (this._timer !== null)
            return;

        this._timer = setInterval(() => {
            const current = Date.now();

            for (const timer of this._timers) {
                if (timer.numRepeatsLeft === 0)
                    continue;

                const delta = current - timer.lastTime;
                if (delta >= timer.interval) {
                    timer.lastTime = current;
                    timer.numRepeatsLeft--;
                    timer.callback(current);
                }

                if (timer.numRepeatsLeft < -1)
                    timer.numRepeatsLeft = -1;
            }
        }, 10);
    }

    public stop() {
        if (this._timer === null)
            return;

        clearInterval(this._timer);
        this._timer = null;
    }

    public static get instance() {
        return Cron._instance;
    }
}
