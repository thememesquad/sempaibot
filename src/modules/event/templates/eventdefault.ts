import { ITemplate } from "../../../core/itemplate";
import { EventMessageID } from "../eventmessageid";

const template: { [key: number]: any } = {};
template[EventMessageID.NewEventStarted] = [
    "Alright, starting new event called \"{name}\". Could you give me a description of this event?"
];


template[EventMessageID.ListEvents] = [
    "Here is a list of currently active events:"
];

export class EventDefaultTemplate extends ITemplate {
    public messages(): { [key: number]: any; } {
        return template;
    }

    public id(): string {
        return "event";
    }

    public displayName(): string {
        return "event";
    }
}
