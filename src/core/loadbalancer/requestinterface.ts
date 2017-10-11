import { IResponseInterface } from "./responseinterface";

export interface IRequestInterface {
    url: string;

    resolve: (result: IResponseInterface) => void;
    reject: (err: any) => void;
}
