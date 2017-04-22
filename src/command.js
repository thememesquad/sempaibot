const users = require("./users.js");
const util = require("./util.js");

class CommandProcessor {
    constructor(bot) {
        this.formats = [];
        this.regex = /\S+/g;
        this.variableRegex = /^\{(.*)\}/;
        this.typeRegex = /^(.*)!(.*)/;
        this.bot = bot;
    }

    add_format(format) {
        if(Array.isArray(format)) {
            return this.formats.push({
                format: format[0].toLowerCase().match(this.regex),
                variables: format.length > 1 ? format[1] : {}
            });
        }

        this.formats.push({
            format: format.toLowerCase().match(this.regex),
            variables: {}
        });
    }

    format(type, msg) {
        switch(type) {
            case "n":
                return parseFloat(msg);

            case "i":
                return parseInt(msg);

            case "id":
                return util.parse_id(msg);

            case "cid":
                {
                    let id = util.parse_id(msg);
                    if(id.type !== "channel")
                        return null;
                    
                    return id.id;
                }

            case "uid":
                {
                    let id = util.parse_id(msg);
                    if(id.type !== "user")
                        return null;
                    
                    return id.id;
                }
            
            default:
                console.log("unknown type: ", type);
        }

        return msg;
    }

    process(message) {
        let splitted = message.toLowerCase().match(this.regex);
        if(splitted === null)
            splitted = [splitted];
        
        let matches = [];

        for(let entry of this.formats) {
            let match = true;
            let args = {};

            for(let i = 0;i<splitted.length;i++) {
                if(i >= entry.format.length)
                    break;
                
                let tmp = entry.format[i].match(this.variableRegex);
                if(tmp !== null) {
                    let tmp2 = tmp[1].match(this.typeRegex);
                    if(tmp2 === null)
                        args[tmp[1]] = splitted[i];
                    else {
                        args[tmp2[2]] = this.format(tmp2[1], splitted[i]);
                        if(args[tmp2[2]] === null) {
                            match = false;
                            break;
                        }
                    }
                } else {
                    if(splitted[i] !== entry.format[i]) {
                        match = false;
                        break;
                    }
                }
            }

            if(match)
                matches.push([entry.format, Object.assign({}, entry.variables, args)]);
        }

        if(matches.length === 0)
            return null;

        let best = matches.reduce((prev, curr) => Math.abs(curr[0].length - splitted.length) < Math.abs(prev[0].length - splitted.length) ? curr : prev);
        return best[1];
    }
}

module.exports = CommandProcessor;