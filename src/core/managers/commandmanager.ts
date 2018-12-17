import { IManager } from "./imanager";
import { injectable } from "inversify";

@injectable()
export class CommandManager implements IManager
{
    async startup()
    {
        return true;
    }
}