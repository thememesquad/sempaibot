import { MessageID, PersonalityBase } from "../../../core";

const personality: { [key: number]: string | string[] } = [];

export class OsuDefaultPersonalityExpansion extends PersonalityBase {
    public messages(): { [key: number]: string | string[]; } {
        return personality;
    }

    public id(): string {
        return "";
    }

    public displayName(): string {
        return "";
    }
}
