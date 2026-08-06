import type { CodeLanguage, ColumnType, Operator, RelationParams } from "./menu-item-params.models.js";

export type Row = Record<string, string | number | boolean | null>;

export type MaybePromise<T> = T | Promise<T>;

export type HandlerResult =
	| {
			success: true;
			data: Row[];
	  }
	| {
			success: false;
			error: string;
	  };

export type HandlerInput = Record<string, unknown>;

export type RuntimeHandler =
	| {
			kind: "query";
			src: string;
	  }
	| {
			kind: "function-query";
			src: (context: HandlerInput) => MaybePromise<string>;
	  }
	| {
			kind: "function-data";
			src: (context: HandlerInput) => MaybePromise<HandlerResult>;
	  };

type RuntimeLookupConfig = {
	enabled: boolean;
	multiple: boolean;
	dependsOn: string[];
	handler: RuntimeHandler;
};

type RuntimeColumnLookupParams = {
	criteria: RuntimeLookupConfig;
	insert: RuntimeLookupConfig;
	update: RuntimeLookupConfig;
	grid: Omit<RuntimeLookupConfig, "multiple" | "dependsOn">;
};

export type RuntimeColumnParams = {
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

	lookup: RuntimeColumnLookupParams;
};

export type RuntimeMenuItemParamsBase = {
	tableName: string;

	columns: RuntimeColumnParams[];

	handlers: {
		select: RuntimeHandler;
		insert: RuntimeHandler;
		update: RuntimeHandler;
		delete: RuntimeHandler;
	};

	permissions: {
		insert: boolean;
		update: boolean;
		delete: boolean;
	};
};

type RuntimeMenuItemParamsChild = {
	relation: RelationParams;
	params: RuntimeMenuItemParamsBase;
};

export type RuntimeMenuItemParams = RuntimeMenuItemParamsBase & {
	children: RuntimeMenuItemParamsChild[];
};
