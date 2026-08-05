import type { FormInputOption, SelectOption } from "../models/form.models";
import type {
	HandlerInput,
	HandlerResult,
	RuntimeColumnParams,
	RuntimeHandler,
	RuntimeMenuItemParams,
} from "../models/menu-item-params.runtime.models";

export type RunHandler = (handler: RuntimeHandler, context?: HandlerInput) => Promise<HandlerResult>;

export async function createCriteriaFormOptions(
	params: RuntimeMenuItemParams,
	runHandler: RunHandler,
	context: HandlerInput = {},
): Promise<FormInputOption[]> {
	const criteriaColumns = params.columns.filter(
		(column) => column.retrieve.enabled && column.retrieve.criteria.enabled,
	);

	return Promise.all(
		criteriaColumns.map(async (column): Promise<FormInputOption> => {
			const lookup = column.lookup.criteria;
			const isCode = column.type === "code";

			return {
				name: column.name,
				label: column.label,
				type: column.type === "text" ? "string" : column.type,
				language: column.language,
				operators: isCode ? ["equals"] : column.retrieve.criteria.operators,
				defaultOperator: isCode ? "equals" : column.retrieve.criteria.defaultOperator,
				required: column.retrieve.criteria.required,
				...(lookup.enabled
					? {
							options: await loadLookupOptions(column.name, lookup.handler, runHandler, context),
							multiple: lookup.multiple,
						}
					: {}),
			};
		}),
	);
}

export function createInsertFormOptions(
	params: RuntimeMenuItemParams,
	runHandler: RunHandler,
	context: HandlerInput = {},
): Promise<FormInputOption[]> {
	return createOperationFormOptions(params, "insert", runHandler, context);
}

export function createUpdateFormOptions(
	params: RuntimeMenuItemParams,
	runHandler: RunHandler,
	context: HandlerInput = {},
): Promise<FormInputOption[]> {
	return createOperationFormOptions(params, "update", runHandler, context);
}

async function createOperationFormOptions(
	params: RuntimeMenuItemParams,
	operation: "insert" | "update",
	runHandler: RunHandler,
	context: HandlerInput,
): Promise<FormInputOption[]> {
	const columns = params.columns.filter((column) => column[operation].enabled);

	return Promise.all(
		columns.map(async (column): Promise<FormInputOption> => {
			const lookup = column.lookup[operation];

			return {
				name: column.name,
				label: column.label,
				type: column.type === "text" ? "string" : column.type,
				language: column.language,
				operators: ["equals"],
				defaultOperator: "equals",
				showOperator: false,
				required: column[operation].required,
				...(lookup.enabled
					? {
							options: await loadLookupOptions(column.name, lookup.handler, runHandler, context),
							multiple: lookup.multiple,
						}
					: {}),
			};
		}),
	);
}

async function loadLookupOptions(
	columnName: string,
	handler: RuntimeColumnParams["lookup"]["criteria"]["handler"],
	runHandler: RunHandler,
	context: HandlerInput,
): Promise<SelectOption[]> {
	const result = await runHandler(handler, context);

	if (!result.success) {
		throw new Error(`Lookup failed for "${columnName}": ${result.error}`);
	}

	return result.data.map((row, _) => toSelectOption(row as { value: string | number; label: string }));
}

function toSelectOption(row: { value: string | number; label: string }): SelectOption {
	const value = row.value;
	const label = row.label ?? String(value);

	return { value, label };
}
