import { Snowflake } from "discord.js";
import { IdType } from "./idtype";

export interface IId {
    type: IdType;
    id: Snowflake;
    alias: boolean;
}
