import { IManager } from "./imanager";
import { injectable } from "inversify";

@injectable()
export class LogManager implements IManager
{
    async startup()
    {
        return true;
    }

    public log(...data: any[]): void
    {
        const dateTime = new Date().toISOString();
        const message = `[${dateTime}] ${data.join(" ")}`;

        console.log(message);
    }

    public error(message: string, error: Error, ...data: any[]): void
    {
        const dateTime = new Date().toISOString();
        const logMessage = `[${dateTime}] ${message} ${error.message} ${error.stack} ${data.join(" ")}`;

        console.log(logMessage);
    }
}