import { Snowflake } from "discord.js";
import { RoleType } from "../permission/roletype";

export enum IDType {
    Channel,
    User,
    Unknown,
}

interface IDInterface {
    type: IDType;
    id: Snowflake;
    alias: boolean;
}

export function StringFormat(str: string, args: { [key: string]: any }): string {
    if (args === null)
        return str;

    return str.replace(/{(.*?)}/g, (match, key) => {
        return typeof args[key] !== "undefined" ? args[key] : match;
    });
}

export function ParseID(id: string): IDInterface {
    const baseId = id;
    if (id.length < 4)
        return { type: IDType.Unknown, id: baseId, alias: false };

    let type = IDType.Unknown;
    let alias = false;

    id = id.substr(1, id.length - 2);
    switch (id.charAt(0)) {
        case "@":
            type = IDType.User;
            break;

        case "#":
            type = IDType.Channel;
            break;

        default:
            return { type: IDType.Unknown, id: baseId, alias: false };
    }

    id = id.substr(1);
    if (id.charAt(0) === "!") {
        alias = true;
        id = id.substr(1);
    }

    return { type, id, alias };
}

export function GenerateTable(baseMessage: string, columns: { [key: string]: string }, data: string[][], minimumLengths?: { [key: string]: number }): string[] {
    minimumLengths = minimumLengths || null;

    if (baseMessage === null || baseMessage === undefined)
        return [];

    if (data === null || data === undefined)
        return [];

    if (columns === null || columns === undefined) {
        columns = {};

        for (const dat of data) {
            for (const key in dat)
                columns[key] = key;
        }
    }

    const lengths = {};

    for (const key in columns) {
        if (minimumLengths !== null)
            lengths[key] = Math.max(columns[key].length, minimumLengths[key]);
        else
            lengths[key] = columns[key].length;
    }

    for (const dat of data) {
        for (const key in columns)
            lengths[key] = Math.max(dat[key].length, lengths[key]);
    }

    for (const key in columns)
        lengths[key] += 2;

    let message = "";
    const writeHeaders = () => {
        for (const key in columns) {
            let val = columns[key];
            while (val.length !== lengths[key])
                val += " ";

            message += val;
        }

        message = message.trim();
        message += "\r\n";
    };

    const writeItem = (index) => {
        let tmp = "";
        for (const key in columns) {
            let val = data[index][key];
            while (val.length !== lengths[key])
                val += " ";

            tmp += val;
        }

        tmp = tmp.replace(/\s+$/gm, "");
        tmp += "\r\n";

        message += tmp;
    };

    const messages = [];
    if (data.length === 0) {
        message = "```";
        writeHeaders();
        message += "No data available\r\n";
    } else {
        for (let i = 0; i < data.length; i++) {
            if (message.length === 0) {
                message = "```";
                writeHeaders();
            }

            writeItem(i);

            if (message.length >= 1800) {
                message += "```";
                messages.push(message);
                message = "";
            }
        }
    }

    if (message.length !== 0) {
        message += "```";
        messages.push(message);
    }

    messages[0] = baseMessage + " " + messages[0];
    return messages;
}

export function ParseRoleType(str: string): RoleType {
    switch (str.toLowerCase()) {
        case "superadmin":
            return RoleType.SuperAdmin;

        case "admin":
            return RoleType.Admin;

        case "moderator":
            return RoleType.Moderator;

        default:
            return RoleType.Normal;
    }
}
