import { BotBase } from "../botbase";
import { IdType } from "../utils/idtype";
import { parseId } from "../utils/parseid";
import { parseRoleType } from "../utils/parseroletype";
import { ICommandFormat } from "./commandformatinterface";
import { CreateRegex } from "./createregex";

export class CommandProcessor {
    public static addCustomType(type: string, func: (msg: string) => any): void {
        CommandProcessor._typeParsers[type] = func;
    }

    private static _typeParsers: { [key: string]: (msg: string) => any };

    private _formats: ICommandFormat[];
    private _regex: RegExp;
    private _variableRegex: RegExp;
    private _typeRegex: RegExp;
    private _bot: BotBase;

    constructor(bot: BotBase) {
        if (!CommandProcessor._typeParsers) {
            CommandProcessor._typeParsers = {};

            CommandProcessor.addCustomType("float", (msg) => parseFloat(msg));
            CommandProcessor.addCustomType("int", (msg) => parseInt(msg, 10));
            CommandProcessor.addCustomType("id", (msg) => parseId(msg));
            CommandProcessor.addCustomType("channelid", (msg) => {
                const id = parseId(msg);
                if (id.type !== IdType.Channel)
                    return null;

                return id.id;
            });
            CommandProcessor.addCustomType("userid", (msg) => {
                const id = parseId(msg);
                if (id.type !== IdType.User)
                    return null;

                return id.id;
            });
            CommandProcessor.addCustomType("roletype", (msg) => {
                return parseRoleType(msg);
            });
        }

        this._formats = [];
        this._regex = /\S+/gi;
        this._variableRegex = /^\{(.*)\}/i;
        this._typeRegex = /^(.*)!(.*)/i;
        this._bot = bot;
    }

    public addFormat(format: Array<string | { [key: string]: any}> | string): void {
        if (Array.isArray(format)) {
            this._formats.push({
                format: CreateRegex(format[0] as string),
                variables: format.length > 1 ? format[1] as { [key: string]: any } : {},
            });

            return;
        }

        this._formats.push({
            format: CreateRegex(format),
            variables: {},
        });
    }

    public format(type: string, msg: string): string {
        if (typeof CommandProcessor._typeParsers[type] !== "undefined")
            return CommandProcessor._typeParsers[type](msg);

        console.log("unknown type: ", type);

        return msg;
    }

    public process(message: string): any {
        const matches: Array<Array<string | any>> = [];

        for (const entry of this._formats) {
            let match = message.trim().match(entry.format.regex);

            if (match !== null) {
                const args = {};

                for (const key in entry.format.variables) {
                    const tmp = key.match(this._typeRegex);
                    if (tmp === null)
                        args[key] = match[entry.format.variables[key]];
                    else {
                        args[tmp[2]] = this.format(tmp[1], match[entry.format.variables[key]] || "");
                        if (args[tmp[2]] === null) {
                            match = null;
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
}
