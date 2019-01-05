import { IManager } from "./imanager";
import { injectable } from "inversify";
import { ITemplate } from "../itemplate";
import * as Templates from "../../templates";
import { TemplateMessageID } from "../itemplatemessageid";

@injectable()
export class TemplateManager implements IManager
{
    private _mode!: ITemplate;
    private _templates!: { [key: string]: ITemplate };
    private _defaultMode!: ITemplate;

    async startup()
    {
        this._templates = {};

        const templates = Templates as { [key: string]: any };
        for (const key in templates) {
            const tmp: ITemplate = new templates[key]();
            this._templates[tmp.id()] = tmp;
        }

        this._defaultMode = this._templates.default;
        this._mode = this._defaultMode;

        return true;
    }

    public get(id: TemplateMessageID | number, args: { [key: string]: any } = null): string
    {
        const result = this._mode.get(id, args);

        if (result === null && this._mode.id() !== "default") {
            return this._defaultMode.get(id, args);
        }

        return result;
    }

    public getExtended(namespace: string, id: TemplateMessageID | number, args: { [key: string]: any } = null): string
    {
        const result = this._mode.getExtended(namespace, id, args);

        if (result === null && this._mode.id() !== "default") {
            return this._defaultMode.get(id, args);
        }

        return result;
    }

    public extend(id: string, extension: ITemplate): void
    {
        if (this._templates[id] === undefined) {
            return;
        }

        this._templates[id].extend(extension);
    }
}