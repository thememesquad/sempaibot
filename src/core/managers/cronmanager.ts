import { IManager } from "./imanager";
import { injectable } from "inversify";

@injectable()
export class CronManager implements IManager
{
    async startup()
    {
        return true;
    }
}