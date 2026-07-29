import type { FormInputOption, SelectOption } from "../models/form.models";
import type {
	HandlerInput,
	HandlerResult,
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

			return {
				name: column.name,
				label: column.label,
				type: column.type === "text" ? "string" : column.type,
				operators: column.retrieve.criteria.operators,
				defaultOperator: column.retrieve.criteria.defaultOperator,
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

async function loadLookupOptions(
	columnName: string,
	handler: RuntimeHandler,
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
