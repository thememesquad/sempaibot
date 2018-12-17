import { ICommand } from "../commandinterface";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";
import { IModule } from "../../imodule";
import { Bot } from "../../bot";

export function CommandSample(samples: string | string[]) {
    return (target: IModule, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command = target.getCommandInternal(propertyKey);

        if (!command) {
            command = {
                execute: descriptor.value || null,
                formats: new CommandProcessor(null),
            };
        }

        command.sample = samples;
        target.setCommandInternal(propertyKey, command);
    };
}
