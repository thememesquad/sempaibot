import { ModuleBase, MessageInterface, Module, ModuleOptions, Command, CommandDescription, CommandSample, CommandPermission, CommandOptions } from "../modulebase";
import * as restify from "restify";
import { StatsManager } from "../stats";

@Module("API", "This is the api module! Cannot be disabled.", ModuleOptions.AlwaysOn | ModuleOptions.DefaultOn | ModuleOptions.Hidden)
class APIModule extends ModuleBase {
    private _server: restify.Server;

    constructor() {
        super();

        this._server = restify.createServer({
            name: "sempaibot",
            version: "0.1.0"
        });

        this._server.use(restify.plugins.acceptParser(this._server.acceptable));
        this._server.use(restify.plugins.queryParser());
        this._server.use(restify.plugins.bodyParser());

        this.registerRoutes();

        this._server.listen(8080, () => {
            //api activated
        });
    }

    registerRoutes() {
        this._server.get("/stats/:name/:time", (req, res, next) => this.handleStatsRequest(req, res, next));
    }

    handleStatsRequest(req, res, next) {
        let counter = StatsManager.get(req.params.name, parseInt(req.params.time));
        if (counter === null)
            return res.send({
                current: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                found: false
            });

        res.send({
            current: counter.current,
            average: counter.average,
            highest: counter.highest,
            lowest: counter.lowest,
            found: true
        });

        return next();
    }
}

module.exports = new APIModule();
