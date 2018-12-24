import { CommandOptions } from "../commandoptions";
import { CommandProcessor } from "../commandprocessor";
import { ICommandPropertyDescriptor } from "../commandpropertydescriptor";
import { IModule } from "../../imodule";
import { ICommand } from "../commandinterface";
import { IMessage } from "../../imessage";

//https://stackoverflow.com/a/31194949
function functionArguments(func: Function): string[] {
    return (func + '')
        .replace(/[/][/].*$/mg, '') // strip single-line comments
        .replace(/\s+/g, '') // strip white space
        .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
        .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
        .replace(/=[^,]+/g, '') // strip any ES6 defaults
        .split(',').filter(Boolean); // split & filter [""]
}

export function createCommand(target: IModule, propertyKey: string, func: (msg: IMessage, ...args: any[]) => void): ICommand
{
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    const paramNames = functionArguments((target as any)[propertyKey]);
    const mapping = paramTypes.reduce((obj: { [key: string]: any }, value: any, index: number) => ({ ...obj, [paramNames[index]]: value }), {});

    for (const key in paramNames) {
        mapping[paramNames[key]] = [+key, mapping[paramNames[key]]];
    }

    return {
        execute: func || null,
        mapping: mapping,
        formats: new CommandProcessor(null),
        permission: null
    };
}

export function Command(format: string | Array<string | { [key: string]: any }>, options: CommandOptions = CommandOptions.None) {
    return (target: IModule, propertyKey: string, descriptor: ICommandPropertyDescriptor) => {
        let command = target.getCommandInternal(propertyKey);

        if (!command) {
            command = createCommand(target, propertyKey, descriptor.value);
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
