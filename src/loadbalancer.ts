import * as request from "request";

interface ResponseInterface {
    response: string;
    body: any;
}

interface RequestInterface {
    url: string;

    resolve: (result: ResponseInterface) => void;
    reject: (err: any) => void;
}

export class LoadBalancer {
    private _limit: number;
    private _requests: Array<RequestInterface>;
    private _pendingRequests: Array<RequestInterface>;
    private _namedRequests: { [key: string]: Promise<ResponseInterface> };
    private _oldMinutes: number;
    private _current: number;
    private _balancer: number;

    constructor(max_per_minute: number) {
        this._limit = max_per_minute;
        this._requests = [];
        this._pendingRequests = [];
        this._namedRequests = {};
        this._oldMinutes = (new Date()).getMinutes();
        this._current = 0;

        this._balancer = null;
    }

    balance(): void {
        if (this._requests.length === 0) {
            clearInterval(this._balancer);
            this._balancer = null;

            return;
        }

        let time = (new Date()).getMinutes();
        if (time !== this._oldMinutes) {
            this._current = 0;
        }

        if (this._current >= this._limit)
            return;

        let req: RequestInterface = this._requests[0];
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
                req.resolve({ response: response, body: body });
        });

        this._pendingRequests.push(req);
    }

    create(url): Promise<ResponseInterface> {
        if (this._namedRequests[url] !== undefined)
            return this._namedRequests[url];

        this._namedRequests[url] = new Promise((resolve, reject) => {
            this._requests.push({
                resolve: resolve,
                reject: reject,
                url: url
            });

            if (this._balancer === null)
                this._balancer = setInterval(this.balance.bind(this), 1);
        });

        return this._namedRequests[url];
    }

    cancel(request): void {
        if (this._namedRequests[request.url] === undefined)
            return;

        delete this._namedRequests[request.url];

        for (let i = 0; i < this._requests.length; i++) {
            if (this._requests[i].url === request.url) {
                this._requests.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < this._pendingRequests.length; i++) {
            if (this._pendingRequests[i].url === request.url) {
                this._pendingRequests.splice(i, 1);
                break;
            }
        }
    }

    close(): void {
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