import { IManager } from "./imanager";
import { injectable } from "inversify";

@injectable()
export class ModuleManager implements IManager
{
    async startup()
    {
        return true;
    }
}