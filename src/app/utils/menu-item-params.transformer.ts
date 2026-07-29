import type { Handler, MenuItemParams, MenuItemParamsBase } from "../models/menu-item-params.models.js";
import type {
	HandlerInput,
	HandlerResult,
	MaybePromise,
	RuntimeColumnParams,
	RuntimeHandler,
	RuntimeMenuItemParams,
	RuntimeMenuItemParamsBase,
} from "../models/menu-item-params.runtime.models.js";

export function transformMenuItemParams(params: MenuItemParams): RuntimeMenuItemParams {
	return {
		...transformParams(params),
		children: params.children.map((child) => ({
			relation: child.relation,
			params: transformParams(child.params),
		})),
	};
}

function transformParams(params: MenuItemParamsBase): RuntimeMenuItemParamsBase {
	return {
		...params,
		handlers: {
			select: transformHandler(params.handlers.select),
			insert: transformHandler(params.handlers.insert),
			update: transformHandler(params.handlers.update),
			delete: transformHandler(params.handlers.delete),
		},
		columns: params.columns.map(transformColumn),
	};
}

function transformColumn(column: MenuItemParams["columns"][number]): RuntimeColumnParams {
	return {
		...column,
		lookup: {
			criteria: {
				...column.lookup.criteria,
				handler: transformHandler(column.lookup.criteria.handler),
			},
			insert: {
				...column.lookup.insert,
				handler: transformHandler(column.lookup.insert.handler),
			},
			update: {
				...column.lookup.update,
				handler: transformHandler(column.lookup.update.handler),
			},
			grid: {
				...column.lookup.grid,
				handler: transformHandler(column.lookup.grid.handler),
			},
		},
	};
}

function transformHandler(handler: Handler): RuntimeHandler {
	switch (handler.kind) {
		case "query":
			return {
				kind: "query",
				src: handler.src,
			};

		case "function-query":
			return {
				kind: "function-query",
				src: compileFunction<(context: HandlerInput) => MaybePromise<string>>(handler.src),
			};

		case "function-data":
			return {
				kind: "function-data",
				src: compileFunction<(context: HandlerInput) => MaybePromise<HandlerResult>>(handler.src),
			};
	}
}

function compileFunction<T>(source: string): T {
	const compiled = new Function(`"use strict"; return (${source});`)() as unknown;

	return compiled as T;
}
