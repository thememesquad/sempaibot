import * as request from "request";

export interface IResponseInterface {
    response: request.RequestResponse;
    body: any;
}
