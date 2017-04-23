const util = require("./util.js");

function create_regex(format) {
    format = format.toLowerCase().trim();
    format = format.replace(/</g, "(?:");
    format = format.replace(/>/g, ")?");

    let splitter = /^(.*?)\{(.*?)\}/;

    let whitespaceRegex = /\S+/g;
    let regex = "^";
    let num = 0;
    let vars = {};

    while(format.length > 0) {
        let split = format.match(splitter);
        if(split === null) {
            let tmp = format.match(whitespaceRegex);

            for(let i = 0;i<tmp.length;i++) {
                if(i === tmp.length - 1)
                    regex += `${tmp[i]}\\s*`;
                else
                    regex += `${tmp[i]}\\s*`;
            }

            break;
        }

        let tmp = split[1].match(whitespaceRegex);
        let variable = split[2];

        if(tmp !== null) {
            for(let i = 0;i<tmp.length;i++) {
                regex += `${tmp[i]}\\s*`;
            }
        }
    
        regex += "(.*?)\\s*";
        format = format.substr(split[0].length).trim();

        vars[variable] = ++num;
    }
    regex += "$";

    return {
        regex: new RegExp(regex),
        variables: vars
    };
}

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
                format: create_regex(format[0]),
                variables: format.length > 1 ? format[1] : {}
            });
        }

        this.formats.push({
            format: create_regex(format),
            variables: {}
        });
    }

    format(type, msg) {
        if(typeof CommandProcessor.type_parsers[type] !== "undefined")
            return CommandProcessor.type_parsers[type](msg);

        console.log("unknown type: ", type);

        return msg;
    }

    process(message) {
        let matches = [];

        for(let entry of this.formats) {
            let match = message.toLowerCase().trim().match(entry.format.regex);

            if(match !== null) {
                let args = {};

                for(let key in entry.format.variables) {
                    let tmp = key.match(this.typeRegex);
                    if(tmp === null)
                        args[key] = match[entry.format.variables[key]];
                    else {
                        args[tmp[2]] = this.format(tmp[1], match[entry.format.variables[key]] || "");
                        if(args[tmp[2]] === null) {
                            match = false;
                            break;
                        }
                    }
                }

                matches.push([entry.format, Object.assign({}, entry.variables, args)]);
            }
        }

        if(matches.length === 0)
            return null;

        return matches[0][1];
    }
}

CommandProcessor.type_parsers = {};
CommandProcessor.add_custom_type = (type, func) => {
    CommandProcessor.type_parsers[type] = func;
};

CommandProcessor.add_custom_type("float", msg => { return parseFloat(msg); });
CommandProcessor.add_custom_type("int", msg => { return parseInt(msg); });
CommandProcessor.add_custom_type("id", msg => { return util.parse_id(msg); });
CommandProcessor.add_custom_type("channelid", msg => {
    let id = util.parse_id(msg);
    if(id.type !== "channel")
        return null;
    
    return id.id;
});
CommandProcessor.add_custom_type("userid", msg => {
    let id = util.parse_id(msg);
    if(id.type !== "user")
        return null;
    
    return id.id;
});

module.exports = CommandProcessor;