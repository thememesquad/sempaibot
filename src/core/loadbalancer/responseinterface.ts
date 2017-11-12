import * as request from "request";

export interface IResponse {
    response: request.RequestResponse;
    body: any;
}
