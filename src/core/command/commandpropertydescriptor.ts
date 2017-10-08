import { IMessageInterface } from "../module/messageinterface";

export interface ICommandPropertyDescriptor {
    value?: (message: IMessageInterface, args: { [key: string]: any }) => void;
}
