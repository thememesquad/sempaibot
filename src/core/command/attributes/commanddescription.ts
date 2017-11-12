import { ModuleBase } from "../../module/modulebase";
import { ICommand } from "../commandinterface";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";

export function CommandDescription(description: string) {
    return (target: ModuleBase, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command: ICommand = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                execute: descriptor.value,
                formats: new CommandProcessor(null),
            };
        }

        command.description = description;
        target.setCommandInternal(propertyKey, command);
    };
}
