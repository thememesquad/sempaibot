import { IRegex } from "./regexinterface";

export function CreateRegex(format: string): IRegex {
    format = format.trim();
    format = format.replace(/</g, "(?:");
    format = format.replace(/>/g, ")?");

    const splitter = /^(.*?)\{(.*?)\}/;

    const whitespaceRegex = /\S+/g;
    let regex = "^";
    let num = 0;
    const vars: { [key: string]: any } = {};

    while (format.length > 0) {
        let tmp: RegExpMatchArray;
        const split = format.match(splitter);

        if (split === null) {
            tmp = format.match(whitespaceRegex);

            if (tmp) {
                for (let i = 0; i < tmp.length; i++) {
                    if (i === tmp.length - 1)
                        regex += `${tmp[i]}\\s*`;
                    else
                        regex += `${tmp[i]}\\s*`;
                }
            }

            break;
        }

        tmp = split[1].match(whitespaceRegex);
        const variable = split[2];

        if (tmp !== null) {
            for (const t of tmp) {
                regex += `${t}\\s*`;
            }
        }

        regex += "(.*?)\\s*";
        format = format.substr(split[0].length).trim();

        vars[variable] = ++num;
    }

    regex += "$";

    return {
        regex: new RegExp(regex, "i"),
        variables: vars,
    };
}
