import { IIdInterface } from "./idinterface";
import { IdType } from "./idtype";

export function parseId(id: string): IIdInterface {
    const baseId = id;
    if (id.length < 4)
        return { type: IdType.Unknown, id: baseId, alias: false };

    let type = IdType.Unknown;
    let alias = false;

    id = id.substr(1, id.length - 2);
    switch (id.charAt(0)) {
        case "@":
            type = IdType.User;
            break;

        case "#":
            type = IdType.Channel;
            break;

        default:
            return { type: IdType.Unknown, id: baseId, alias: false };
    }

    id = id.substr(1);
    if (id.charAt(0) === "!") {
        alias = true;
        id = id.substr(1);
    }

    return { type, id, alias };
}
