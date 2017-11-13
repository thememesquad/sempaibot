import { IResponse } from "./iresponse";

export interface IRequest {
    url: string;
    promise: Promise<IResponse>;

    resolve?: (result: IResponse) => void;
    reject?: (err: any) => void;
}
