import { ModuleBase } from "../../module/modulebase";
import { ICommand } from "../commandinterface";
import { CommandOptions } from "../commandoptions";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";

export function Command(format: string | Array<string | { [key: string]: any }>, options: CommandOptions = CommandOptions.None) {
    return (target: ModuleBase, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command: ICommand = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                execute: descriptor.value,
                formats: new CommandProcessor(null),
            };
        }

        command.formats.addFormat(format);

        if (options & CommandOptions.HideInHelp)
            command.hideInHelp = true;
        else
            command.hideInHelp = false;

        if (options & CommandOptions.Global)
            command.global = true;
        else
            command.global = false;

        target.setCommandInternal(propertyKey, command);
    };
}
