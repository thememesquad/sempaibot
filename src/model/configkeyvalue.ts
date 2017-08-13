import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";

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
        if (this._valueUnserialized === null)
            this._valueUnserialized = JSON.parse(this._value);

        return this._valueUnserialized;
    }

    set value(value: { [key: string]: any }) {
        this._valueUnserialized = value;
        this._value = JSON.stringify(this._valueUnserialized);
    }

    @AfterLoad()
    _loadValue() {
        console.log("AfterLoad");
        this._valueUnserialized = JSON.parse(this._value);
    }

    @BeforeInsert()
    _updateValueInsert() {
        console.log("BeforeInsert");
        this._value = JSON.stringify(this._valueUnserialized);
    }

    @BeforeUpdate()
    _updateValueUpdate() {
        console.log("BeforeUpdate");
        this._value = JSON.stringify(this._valueUnserialized);
    }
}