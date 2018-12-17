import { stringFormat } from "../utils";
import { TemplateMessageID } from "./itemplatemessageid";

export abstract class ITemplate
{
    protected _extensions: ITemplate[];

    constructor()
    {
        this._extensions = [];
    }

    public abstract id(): string;
    public abstract displayName(): string;
    public abstract messages(): { [key: number]: string | string[] };

    public get(id: TemplateMessageID | number, args: { [key: string]: any; } | null): string | null
    {
        const template = this.messages();

        if (template[id] === undefined) {
            return null;
        }

        let str: string | string[] = template[id];

        if (Array.isArray(str)) {
            str = str[Math.floor(Math.random() * str.length)];
        }

        return stringFormat(str as string, args);
    }

    public getExtended(namespace: string, id: TemplateMessageID | number, args: { [key: string]: any; } | null): string | null
    {
        if (this.id() !== namespace) {
            for (const extension of this._extensions) {
                if (extension.id() !== namespace) {
                    continue;
                }

                return extension.get(id, args);
            }

            return null;
        }

        const template = this.messages();

        let str: string | string[] = template[id];

        if (Array.isArray(str)) {
            str = str[Math.floor(Math.random() * str.length)];
        }

        return stringFormat(str as string, args);
    }

    public extend(extension: ITemplate): void
    {
        this._extensions.push(extension);
    }
}
