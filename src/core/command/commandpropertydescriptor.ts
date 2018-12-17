import { IMessage } from "../imessage";

export interface ICommandPropertyDescriptor {
    value?: (message: IMessage, args: { [key: string]: any }) => void;
}
