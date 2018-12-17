import { ModuleOptions } from "../moduleoptions";
import { AccessManager } from "../managers";

export function Module(name: string, description: string, options: ModuleOptions = ModuleOptions.None) {
    return <T extends { new(...args: any[]): {} }>(constructor: T) => {
        const alwaysOn = options & ModuleOptions.AlwaysOn ? true : false;
        const defaultOn = options & ModuleOptions.DefaultOn ? true : false;
        const hidden = options & ModuleOptions.Hidden ? true : false;

        return class extends constructor {
            public _name = name;
            public _description = description;
            public _alwaysOn = alwaysOn;
            public _defaultOn = defaultOn;
            public _hidden = hidden;
        };
    };
}
