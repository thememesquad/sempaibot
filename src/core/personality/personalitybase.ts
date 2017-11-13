import { stringFormat } from "../index";
import { MessageID } from "./messageid";

export abstract class PersonalityBase {
    protected _expansions: PersonalityBase[];

    constructor() {
        this._expansions = [];
    }

    public abstract id(): string;
    public abstract displayName(): string;
    public abstract messages(): { [key: number]: string | string[] };

    public get(id: MessageID | number, args: { [key: string]: any; }): string {
        const personality = this.messages();

        if (personality[id] === undefined)
            return null;

        let str: string | string[] = personality[id];

        if (Array.isArray(str))
            str = str[Math.floor(Math.random() * str.length)];

        return stringFormat(str as string, args);
    }

    public getExtended(namespace: string, id: MessageID | number, args: { [key: string]: any; }): string {
        if (this.id() !== namespace) {
            for (const expansion of this._expansions) {
                if (expansion.id() !== namespace)
                    continue;

                return expansion.get(id, args);
            }

            return null;
        }

        const personality = this.messages();

        let str: string | string[] = personality[id];

        if (Array.isArray(str))
            str = str[Math.floor(Math.random() * str.length)];

        return stringFormat(str as string, args);
    }

    public expand(expansion: PersonalityBase): void {
        this._expansions.push(expansion);
    }
}
