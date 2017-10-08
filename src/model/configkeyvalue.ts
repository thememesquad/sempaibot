import { watch } from "melanke-watchjs";
import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ConfigKeyValueModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "varchar", length: 255 })
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
    public _loadValue() {
        const loaded = this._valueUnserialized !== null;
        this._valueUnserialized = JSON.parse(this._value);

        if (!loaded) {
            watch(this._valueUnserialized, () => {
                this._value = JSON.stringify(this._valueUnserialized);
            });
        }
    }
}
