import type { Handler, MenuItemParams, MenuItemParamsBase } from "../models/menu-item-params.models.js";
import type {
	HandlerInput,
	HandlerResult,
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
			...column.lookup,
			handler: transformHandler(column.lookup.handler),
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
				src: compileFunction<(context: HandlerInput) => string>(handler.src),
			};

		case "function-data":
			return {
				kind: "function-data",
				src: compileFunction<(context: HandlerInput) => HandlerResult>(handler.src),
			};
	}
}

function compileFunction<T>(source: string): T {
	return new Function(`return (${source})`)() as T;
}
