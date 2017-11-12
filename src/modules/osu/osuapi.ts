import { Config } from "../../../config";
import { IResponse, LoadBalancer } from "../../core/loadbalancer";
import { OsuMode } from "./osumode";

export class OsuAPI {
    private static _instance: OsuAPI;

    public static get instance() {
        return OsuAPI._instance;
    }

    private _loadBalancer: LoadBalancer;
    private _pending: Array<Promise<IResponse>>;

    constructor() {
        this._loadBalancer = new LoadBalancer(60);
        this._pending = [];
    }

    public async apiCall(method: string, params?: { [key: string]: any }, first?: boolean, num?: number) {
        num = (num === undefined) ? 0 : num;

        first = (first === undefined) ? true : first;
        let url = (method.startsWith("http:") ? method : Config.osu.apiurl ? Config.osu.apiurl + method : "http://osu.ppy.sh/api/" + method) + "?k=" + Config.osu.apikey;

        for (const key in params)
            url += "&" + key + "=" + params[key];

        const tmp = this._loadBalancer.create(url);
        this._pending.push(tmp);

        const obj = await tmp;
        // StatsManager.update("osu_api_calls", 1);

        const body = obj.body;

        try {
            let data = JSON.parse(body);
            if (first) {
                data = data[0];
            }

            return data;
        } catch (e) {
            if (num === 4)
                throw e;

            return await this.apiCall(method, params, first, num + 1);
        }
    }

    public getUser(username, mode) {
        mode = mode || OsuMode.Standard;

        return this.apiCall("get_user", {
            m: mode,
            u: username,
        });
    }

    public getBeatmaps(id) {
        return this.apiCall("http://osu.ppy.sh/api/get_beatmaps", {
            b: id,
        });
    }

    public getUserBest(id, mode, limit) {
        mode = mode || OsuMode.Standard;

        return this.apiCall("get_user_best", {
            limit,
            m: mode,
            type: "id",
            u: id,
        }, false);
    }
}
