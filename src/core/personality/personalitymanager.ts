import * as Personalities from "../../personalities/personalities";
import { MessageID } from "./messageid";
import { PersonalityBase } from "./personalitybase";

export class PersonalityManager {
    private static _instance: PersonalityManager = new PersonalityManager();
    private _mode: PersonalityBase;
    private _defaultMode: PersonalityBase;

    constructor() {
        this._defaultMode = new Personalities.DefaultPersonality();
        this._mode = this._defaultMode;
    }

    public get(id: MessageID, args: { [key: string]: any } = null): string {
        const result = this._mode.get(id, args);

        if (result === null && this._mode.id() !== "default")
            return this._defaultMode.get(id, args);

        return result;
    }

    static get instance(): PersonalityManager {
        return PersonalityManager._instance;
    }
}
