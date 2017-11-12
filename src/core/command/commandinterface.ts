import { IMessage } from "../module/messageinterface";
import { CommandProcessor } from "./commandprocessor";

export interface ICommand {
    key?: string;

    formats: CommandProcessor;
    execute: (message: IMessage, args: { [key: string]: any }) => void;

    permission?: string | string[];
    sample?: string | string[];
    description?: string;
    defaults?: { [key: string]: any };

    global?: boolean;
    private?: boolean;
    hideInHelp?: boolean;
}
