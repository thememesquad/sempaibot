import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import { watch } from "melanke-watchjs";

@Entity()
export class ConfigKeyValueModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public key: string;

    @Column("text")
    private _value: string;
    private _valueUnserialized: { [key: string]: any } = null;

    get value(): { [key: string]: any } {
        if (this._valueUnserialized === null) {
            this._valueUnserialized = JSON.parse(this._value);

            watch(this._valueUnserialized, () => {
                this._value = JSON.stringify(this._valueUnserialized);
            });
        }

        return this._valueUnserialized;
    }

    set value(value: { [key: string]: any }) {
        this._valueUnserialized = value;
        this._value = JSON.stringify(this._valueUnserialized);
    }

    @AfterLoad()
    _loadValue() {
        let loaded = this._valueUnserialized !== null;
        this._valueUnserialized = JSON.parse(this._value);

        if (!loaded) {
            watch(this._valueUnserialized, () => {
                this._value = JSON.stringify(this._valueUnserialized);
            });
        }    
    }
}