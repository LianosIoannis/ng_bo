export type Operator =
	| "equals"
	| "notEquals"
	| "contains"
	| "notContains"
	| "startsWith"
	| "endsWith"
	| "greaterThan"
	| "lessThan"
	| "greaterThanOrEqual"
	| "lessThanOrEqual"
	| "between"
	| "notBetween"
	| "in"
	| "notIn"
	| "javascript"
	| "typescript"
	| "sql"
	| "plaintext"
	| "json"
	| "css";

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
	operators: Operator[];
	defaultOperator?: Operator;
	showOperator?: boolean;
	defaultValue?: FieldTypeScalar | FieldTypeScalar[];
	required?: boolean;
	readonly?: boolean;
	options?: SelectOption[];
	multiple?: boolean;
};
