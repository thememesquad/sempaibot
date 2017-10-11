import * as Personalities from "../../personalities";
import { MessageID } from "./messageid";
import { PersonalityBase } from "./personalitybase";

export class PersonalityManager {
    private static _instance: PersonalityManager = new PersonalityManager();
    private _mode: PersonalityBase;
    private _personalities: { [key: string]: PersonalityBase };
    private _defaultMode: PersonalityBase;

    constructor() {
        this._personalities = {};

        for (const key in Personalities) {
            const tmp: PersonalityBase = new Personalities[key]();
            this._personalities[tmp.id()] = tmp;
        }

        this._defaultMode = this._personalities.default;
        this._mode = this._defaultMode;
    }

    public get(id: MessageID, args: { [key: string]: any } = null): string {
        const result = this._mode.get(id, args);

        if (result === null && this._mode.id() !== "default")
            return this._defaultMode.get(id, args);

        return result;
    }

    public expand(id: string, expansion: PersonalityBase): void {
        if (this._personalities[id] === undefined)
            return;

        this._personalities[id].expand(expansion);
    }

    static get instance(): PersonalityManager {
        return PersonalityManager._instance;
    }
}
