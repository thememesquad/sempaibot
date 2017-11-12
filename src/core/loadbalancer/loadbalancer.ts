import * as request from "request";
import { IRequest } from "./requestinterface";
import { IResponse } from "./responseinterface";

export class LoadBalancer {
    private _limit: number;
    private _requests: IRequest[];
    private _pendingRequests: IRequest[];
    private _namedRequests: { [key: string]: Promise<IResponse> };
    private _oldMinutes: number;
    private _current: number;
    private _balancer: number;

    constructor(maxPerMinute: number) {
        this._limit = maxPerMinute;
        this._requests = [];
        this._pendingRequests = [];
        this._namedRequests = {};
        this._oldMinutes = (new Date()).getMinutes();
        this._current = 0;

        this._balancer = null;
    }

    public balance(): void {
        if (this._requests.length === 0) {
            clearInterval(this._balancer);
            this._balancer = null;

            return;
        }

        const time = (new Date()).getMinutes();
        if (time !== this._oldMinutes) {
            this._current = 0;
        }

        if (this._current >= this._limit)
            return;

        const req: IRequest = this._requests[0];
        this._requests.splice(0, 1);
        this._current++;
        this._oldMinutes = time;

        request(req.url, (error, response, body) => {
            if (req.url !== undefined) {
                delete this._namedRequests[req.url];
                this._namedRequests[req.url] = undefined;
            }

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

    public create(url): Promise<IResponse> {
        if (this._namedRequests[url] !== undefined)
            return this._namedRequests[url];

        this._namedRequests[url] = new Promise((resolve, reject) => {
            this._requests.push({
                reject,
                resolve,
                url,
            });

            if (this._balancer === null)
                this._balancer = setInterval(this.balance.bind(this), 1);
        });

        return this._namedRequests[url];
    }

    // tslint:disable-next-line:no-shadowed-variable
    public cancel(req: IRequest): void {
        if (this._namedRequests[req.url] === undefined)
            return;

        delete this._namedRequests[req.url];

        for (let i = 0; i < this._requests.length; i++) {
            if (this._requests[i].url === req.url) {
                this._requests.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < this._pendingRequests.length; i++) {
            if (this._pendingRequests[i].url === req.url) {
                this._pendingRequests.splice(i, 1);
                break;
            }
        }
    }

    public close(): void {
        while (this._requests.length > 0)
            this.cancel(this._requests[0]);

        while (this._pendingRequests.length > 0)
            this.cancel(this._pendingRequests[0]);

        if (this._balancer !== null)
            clearInterval(this._balancer);

        this._balancer = null;
    }

    get numRequests(): number {
        return this._requests.length + this._pendingRequests.length;
    }
}
