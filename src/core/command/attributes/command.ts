import { ICommand } from "../commandinterface";
import { CommandOptions } from "../commandoptions";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";
import { IModule } from "../../imodule";
import { Bot } from "../../bot";

export function Command(format: string | Array<string | { [key: string]: any }>, options: CommandOptions = CommandOptions.None) {
    return (target: IModule, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command = target.getCommandInternal(propertyKey);

        if (!command) {
            command = {
                execute: descriptor.value || null,
                formats: new CommandProcessor(null),
            };
        }

        command.formats.addFormat(format);

        if (options & CommandOptions.HideInHelp) {
            command.hideInHelp = true;
        } else {
            command.hideInHelp = false;
        }

        if (options & CommandOptions.Global) {
            command.global = true;
        } else {
            command.global = false;
        }

        target.setCommandInternal(propertyKey, command);
    };
}
