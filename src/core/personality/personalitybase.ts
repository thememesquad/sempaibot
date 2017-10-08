import { MessageID } from "./messageid";

export abstract class PersonalityBase {
    public abstract id(): string;
    public abstract displayName(): string;
    public abstract get(id: MessageID, args: { [key: string]: any }): string;
}
