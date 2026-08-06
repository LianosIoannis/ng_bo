import type { FormInputOption } from "../models/form.models";
import type { RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";

export function createCriteriaFormOptions(params: RuntimeMenuItemParams): FormInputOption[] {
	const criteriaColumns = params.columns.filter(
		(column) => column.retrieve.enabled && column.retrieve.criteria.enabled,
	);

	return criteriaColumns.map((column): FormInputOption => {
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
						multiple: lookup.multiple,
						lookupHandler: lookup.handler,
					}
				: {}),
		};
	});
}

export function createInsertFormOptions(params: RuntimeMenuItemParams): FormInputOption[] {
	return createOperationFormOptions(params, "insert");
}

export function createUpdateFormOptions(params: RuntimeMenuItemParams): FormInputOption[] {
	return createOperationFormOptions(params, "update");
}

function createOperationFormOptions(
	params: RuntimeMenuItemParams,
	operation: "insert" | "update",
): FormInputOption[] {
	const columns = params.columns.filter((column) => column[operation].enabled);

	return columns.map((column): FormInputOption => {
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
						multiple: lookup.multiple,
						lookupHandler: lookup.handler,
					}
				: {}),
		};
	});
}
