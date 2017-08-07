const connect = require("camo").connect;
const Document = require("camo").Document;

class ConfigKeyValue extends Document {
    constructor() {
        super();

        this.key = String;
        this.value = Object;
    }
}

module.exports = ConfigKeyValue;
