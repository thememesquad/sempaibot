import { CommandProcessor } from "./commandprocessor";
import { IMessage } from "../imessage";

export interface ICommand {
    key?: string;

    formats: CommandProcessor;
    execute: ((message: IMessage, args: { [key: string]: any }) => void) | null;

    permission?: string | string[];
    sample?: string | string[];
    description?: string;
    defaults?: { [key: string]: any };

    global?: boolean;
    private?: boolean;
    hideInHelp?: boolean;
}
