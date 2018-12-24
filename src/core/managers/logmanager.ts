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
        const message = `[${dateTime}][info] ${data.join(" ")}`;

        console.log(message);
    }

    public warning(...data: any[]): void
    {
        const dateTime = new Date().toISOString();
        const message = `[${dateTime}][warn] ${data.join(" ")}`;

        console.log(message);
    }

    public error(message: string, error: Error, ...data: any[]): void
    {
        const dateTime = new Date().toISOString();
        const logMessage = `[${dateTime}][err ] ${message} ${error.message} ${error.stack} ${data.join(" ")}`;

        console.log(logMessage);
    }
}