const ModuleBase = require("../modulebase.js"),
    restify = require("restify"),
    stats = require("../stats.js");

class APIModule extends ModuleBase {
    constructor() {
        super();

        this.name = "API";
        this.description = "This is the api module! Cannot be disabled.";
        this.always_on = true;
        this.default_on = true;
        this.hidden = true;

        this.server = restify.createServer({
            name: "sempaibot",
            version: "0.1.0"
        });

        this.server.use(restify.acceptParser(this.server.acceptable));
        this.server.use(restify.queryParser());
        this.server.use(restify.bodyParser());

        this.register_routes();

        this.server.listen(8080, () => {
            //api activated
        });
    }

    register_routes() {
        this.server.get("/stats/:name/:time", (req, res, next) => this.handle_stats_request(req, res, next));
    }

    handle_stats_request(req, res, next) {
        let counter = stats.get(req.params.name, parseInt(req.params.time));
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

    on_setup() {
    }

    on_shutdown() {
    }

    on_load() {
    }

    on_unload() {
    }
}

module.exports = new APIModule();
