import { IMessageInterface } from "../module/messageinterface";
import { CommandProcessor } from "./commandprocessor";

export interface ICommandInterface {
    key?: string;

    formats: CommandProcessor;
    execute: (message: IMessageInterface, args: { [key: string]: any }) => void;

    permission?: string | string[];
    sample?: string | string[];
    description?: string;
    defaults?: { [key: string]: any };

    global?: boolean;
    private?: boolean;
    hideInHelp?: boolean;
}
