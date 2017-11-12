import { IMessage } from "../module/messageinterface";

export interface ICommandPropertyDescriptor {
    value?: (message: IMessage, args: { [key: string]: any }) => void;
}
