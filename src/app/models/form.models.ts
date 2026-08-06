import type { CodeLanguage, Operator } from "./menu-item-params.models";
import type { RuntimeHandler } from "./menu-item-params.runtime.models";

export type SelectOptionValue = string | number;
export type SelectValueResult = SelectOptionValue | SelectOptionValue[] | null;

export type SelectOption = {
	readonly label: string;
	readonly value: SelectOptionValue;
};

export type FieldType = "string" | "number" | "boolean" | "date" | "datetime" | "time" | "code";
export type FieldTypeScalar = string | number | boolean | null;

export type FormParams = {
	operator: Operator;
	value: FieldTypeScalar | FieldTypeScalar[];
	valueTo: FieldTypeScalar | null;
};

export type FormModel = Record<string, FormParams>;

export type FormInputOption = {
	name: string;
	label: string;
	type: FieldType;
	language?: CodeLanguage;
	operators: Operator[];
	defaultOperator?: Operator;
	showOperator?: boolean;
	defaultValue?: FieldTypeScalar | FieldTypeScalar[];
	required?: boolean;
	readonly?: boolean;
	options?: SelectOption[];
	multiple?: boolean;
	lookupHandler?: RuntimeHandler;
};

export type FormResult = Record<string, FormParams>;
