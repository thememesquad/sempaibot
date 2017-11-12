import { IRegex } from "./regexinterface";

export interface ICommandFormat {
    format: IRegex;
    variables: { [key: string]: any };
}
