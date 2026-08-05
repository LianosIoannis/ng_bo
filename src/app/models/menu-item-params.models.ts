export type CodeLanguage = "javascript" | "typescript" | "sql" | "plaintext" | "json" | "css";

export type DataColumnType = "boolean" | "date" | "datetime" | "number" | "text" | "time";

export type ColumnType = DataColumnType | "code";

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
	| "notIn";

type HandlerKind = "query" | "function-query" | "function-data";

export type Handler = {
	kind: HandlerKind;
	src: string;
};

type LookupConfig = {
	enabled: boolean;
	multiple: boolean;
	handler: Handler;
};

type ColumnLookupParams = {
	criteria: LookupConfig;
	insert: LookupConfig;
	update: LookupConfig;
	grid: Omit<LookupConfig, "multiple">;
};

type ColumnParams = {
	name: string;
	label: string;
	type: ColumnType;
	language: CodeLanguage;

	primaryKey: boolean;

	visible: boolean;
	sortable: boolean;
	filterable: boolean;

	retrieve: {
		enabled: boolean;
		criteria: {
			enabled: boolean;
			required: boolean;
			operators: Operator[];
			defaultOperator: Operator;
		};
	};

	insert: {
		enabled: boolean;
		required: boolean;
	};

	update: {
		enabled: boolean;
		required: boolean;
	};

	lookup: ColumnLookupParams;
};

export type RelationColumnMap = {
	parentColumn: string;
	childColumn: string;
};

export type RelationParams = {
	name: string;
	columns: RelationColumnMap[];
};

type MenuItemParamsChild = {
	relation: RelationParams;
	params: MenuItemParamsBase;
};

export type MenuItemParams = {
	tableName: string;

	columns: ColumnParams[];

	handlers: {
		select: Handler;
		insert: Handler;
		update: Handler;
		delete: Handler;
	};

	permissions: {
		insert: boolean;
		update: boolean;
		delete: boolean;
	};

	children: MenuItemParamsChild[];
};

export type MenuItemParamsBase = Omit<MenuItemParams, "children">;
