import type { FormResult } from "../models/form.models";
import type { HandlerInput, Row } from "../models/menu-item-params.runtime.models";

export function createRetrieveHandlerInput(criteria: FormResult | null): HandlerInput {
	if (!criteria) {
		return { criteria: {} };
	}

	const values = Object.entries(criteria)
		.filter(([, params]) => hasValue(params.value))
		.map(([name, params]) => [name, params.value]);

	return {
		...Object.fromEntries(values),
		criteria,
	};
}

export function createMutationHandlerInput(data: FormResult, selectedRow: Row | null = null): HandlerInput {
	const values = Object.entries(data).map(([name, params]) => [name, params.value]);

	return {
		...(selectedRow ?? {}),
		...Object.fromEntries(values),
		data,
	};
}

function hasValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}
