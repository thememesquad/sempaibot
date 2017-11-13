import * as request from "request";
import { IRequest } from "./irequest";
import { IResponse } from "./iresponse";

export class LoadBalancer {
    private _limit: number;
    private _requests: { [key: string]: IRequest };
    private _pendingRequests: IRequest[];
    private _oldMinutes: number;
    private _current: number;
    private _balancer: number;

    constructor(maxPerMinute: number) {
        this._limit = maxPerMinute;
        this._requests = {};
        this._pendingRequests = [];
        this._oldMinutes = (new Date()).getMinutes();
        this._current = 0;

        this._balancer = null;
    }

    public balance(): void {
        if (Object.keys(this._requests).length === 0) {
            clearInterval(this._balancer);
            this._balancer = null;

            return;
        }

        const time = (new Date()).getMinutes();
        if (time !== this._oldMinutes)
            this._current = 0;

        if (this._current >= this._limit)
            return;

        const key: string = Object.keys(this._requests)[0];
        const req: IRequest = this._requests[key];

        if (typeof req === "undefined") {
            delete this._requests[key];
            return this.balance();
        }

        this._current++;
        this._oldMinutes = time;

        request(req.url, (error, response, body) => {
            if (this._requests[key] === undefined)
                return;

            delete this._requests[key];
            this._requests[key] = undefined;

            this._pendingRequests.splice(this._pendingRequests.indexOf(req));

            if (error)
                req.reject(error);
            else
                req.resolve({
                    body,
                    response,
                });
        });

        this._pendingRequests.push(req);
    }

    public create(url): IRequest {
        if (this._requests[url] !== undefined)
            return this._requests[url];

        this._requests[url] = {
            promise: null,
            url
        };

        this._requests[url].promise = new Promise((resolve, reject) => {
            this._requests[url].resolve = resolve;
            this._requests[url].reject = reject;

            if (this._balancer === null)
                this._balancer = setInterval(this.balance.bind(this), 1);
        });

        return this._requests[url];
    }

    public cancel(req: IRequest): void {
        if (this._requests[req.url] === undefined)
            return;

        delete this._requests[req.url];

        for (let i = 0; i < this._pendingRequests.length; i++) {
            if (this._pendingRequests[i].url === req.url) {
                this._pendingRequests.splice(i, 1);
                break;
            }
        }
    }

    public close(): void {
        for (const key in this._requests)
            this.cancel(this._requests[key]);

        while (this._pendingRequests.length > 0)
            this.cancel(this._pendingRequests[0]);

        if (this._balancer !== null)
            clearInterval(this._balancer);

        this._balancer = null;
    }

    get numRequests(): number {
        return Object.keys(this._requests).length + this._pendingRequests.length;
    }
}
