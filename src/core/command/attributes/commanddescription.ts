import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";
import { IModule } from "../../imodule";
import { createCommand } from "./command";

export function CommandDescription(description: string) {
    return (target: IModule, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command = target.getCommandInternal(propertyKey);

        if (!command) {
            command = createCommand(target, propertyKey, descriptor.value);
        }

        command.description = description;
        target.setCommandInternal(propertyKey, command);
    };
}
