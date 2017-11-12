import { IResponse } from "./responseinterface";

export interface IRequest {
    url: string;

    resolve: (result: IResponse) => void;
    reject: (err: any) => void;
}
