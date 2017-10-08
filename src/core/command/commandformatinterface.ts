import { IRegexInterface } from "./regexinterface";

export interface ICommandFormatInterface {
    format: IRegexInterface;
    variables: { [key: string]: any };
}
