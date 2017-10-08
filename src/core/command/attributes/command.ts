import { ModuleBase } from "../../module/modulebase";
import { ICommandInterface } from "../commandinterface";
import { CommandOptions } from "../commandoptions";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";

export function Command(format: string | Array<string | { [key: string]: any }>, options: CommandOptions = CommandOptions.None) {
    return (target: ModuleBase, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command: ICommandInterface = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                execute: descriptor.value,
                formats: new CommandProcessor(null),
            };
        }

        command.formats.addFormat(format);

        if (options & CommandOptions.HideInHelp)
            command.hideInHelp = true;

        if (options & CommandOptions.Global)
            command.global = true;

        target.setCommandInternal(propertyKey, command);
    };
}
