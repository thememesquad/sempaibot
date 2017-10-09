import { Snowflake } from "discord.js";
import { IdType } from "./idtype";

export interface IIdInterface {
    type: IdType;
    id: Snowflake;
    alias: boolean;
}
