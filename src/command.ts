import { ParseID } from "./util";
import { BotBase } from "./botbase";

interface RegexInterface {
    regex: RegExp;
    variables: { [key: string]: number };
}

function CreateRegex(format): RegexInterface {
    format = format.trim();
    format = format.replace(/</g, "(?:");
    format = format.replace(/>/g, ")?");

    let splitter = /^(.*?)\{(.*?)\}/;

    let whitespaceRegex = /\S+/g;
    let regex = "^";
    let num = 0;
    let vars = {};

    while (format.length > 0) {
        let split = format.match(splitter);
        if (split === null) {
            let tmp = format.match(whitespaceRegex);

            for (let i = 0; i < tmp.length; i++) {
                if (i === tmp.length - 1)
                    regex += `${tmp[i]}\\s*`;
                else
                    regex += `${tmp[i]}\\s*`;
            }

            break;
        }

        let tmp = split[1].match(whitespaceRegex);
        let variable = split[2];

        if (tmp !== null) {
            for (let i = 0; i < tmp.length; i++) {
                regex += `${tmp[i]}\\s*`;
            }
        }

        regex += "(.*?)\\s*";
        format = format.substr(split[0].length).trim();

        vars[variable] = ++num;
    }
    regex += "$";

    return {
        regex: new RegExp(regex, "i"),
        variables: vars
    };
}

interface CommandFormatInterface {
    format: RegexInterface;
    variables: { [key: string]: any };
}

export class CommandProcessor {
    private static _typeParsers: { [key: string]: (msg: string) => any };

    private _formats: Array<CommandFormatInterface>;
    private _regex: RegExp;
    private _variableRegex: RegExp;
    private _typeRegex: RegExp;
    private _bot: BotBase;

    constructor(bot: BotBase) {
        if (!CommandProcessor._typeParsers) {
            CommandProcessor._typeParsers = {};

            CommandProcessor.addCustomType("float", msg => { return parseFloat(msg); });
            CommandProcessor.addCustomType("int", msg => { return parseInt(msg); });
            CommandProcessor.addCustomType("id", msg => { return ParseID(msg); });
            CommandProcessor.addCustomType("channelid", msg => {
                let id = ParseID(msg);
                if (id.type !== "channel")
                    return null;

                return id.id;
            });
            CommandProcessor.addCustomType("userid", msg => {
                let id = ParseID(msg);
                if (id.type !== "user")
                    return null;

                return id.id;
            });
        }

        this._formats = [];
        this._regex = /\S+/gi;
        this._variableRegex = /^\{(.*)\}/i;
        this._typeRegex = /^(.*)!(.*)/i;
        this._bot = bot;
    }

    add_format(format) {
        if (Array.isArray(format)) {
            return this._formats.push({
                format: CreateRegex(format[0]),
                variables: format.length > 1 ? format[1] : {}
            });
        }

        this._formats.push({
            format: CreateRegex(format),
            variables: {}
        });
    }

    format(type, msg) {
        if (typeof CommandProcessor._typeParsers[type] !== "undefined")
            return CommandProcessor._typeParsers[type](msg);

        console.log("unknown type: ", type);

        return msg;
    }

    process(message) {
        let matches = [];

        for (let entry of this._formats) {
            let match = message.trim().match(entry.format.regex);

            if (match !== null) {
                let args = {};

                for (let key in entry.format.variables) {
                    let tmp = key.match(this._typeRegex);
                    if (tmp === null)
                        args[key] = match[entry.format.variables[key]];
                    else {
                        args[tmp[2]] = this.format(tmp[1], match[entry.format.variables[key]] || "");
                        if (args[tmp[2]] === null) {
                            match = false;
                            break;
                        }
                    }
                }

                matches.push([entry.format, Object.assign({}, entry.variables, args)]);
            }
        }

        if (matches.length === 0)
            return null;

        return matches[0][1];
    }

    static addCustomType(type: string, func: (msg: string) => any) {
        CommandProcessor._typeParsers[type] = func;
    }
}