import type { FormInputOption, FormResult } from "../models/form.models";
import type { ColumnType } from "../models/menu-item-params.models";
import type { Row, RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";

export function createCriteriaFormOptions(
	params: RuntimeMenuItemParams,
	formData: FormResult | null = null,
): FormInputOption[] {
	const criteriaColumns = params.columns.filter(
		(column) => column.retrieve.enabled && column.retrieve.criteria.enabled,
	);

	return criteriaColumns.map((column): FormInputOption => {
		const lookup = column.lookup.criteria;
		const isCode = column.type === "code";
		const submittedParams = formData?.[column.name];

		return {
			name: column.name,
			label: column.label,
			type: column.type === "text" ? "string" : column.type,
			language: column.language,
			operators: isCode ? ["equals"] : column.retrieve.criteria.operators,
			defaultOperator: isCode ? "equals" : (submittedParams?.operator ?? column.retrieve.criteria.defaultOperator),
			defaultValue: normalizeDefaultValue(column.type, submittedParams?.value),
			defaultValueTo: normalizeDefaultValue(column.type, submittedParams?.valueTo),
			required: column.retrieve.criteria.required,
			...(lookup.enabled
				? {
						multiple: lookup.multiple,
						lookupHandler: lookup.handler,
						lookupDependsOn: lookup.dependsOn,
					}
				: {}),
		};
	});
}

export function createInsertFormOptions(
	params: RuntimeMenuItemParams,
	formData: FormResult | null = null,
): FormInputOption[] {
	return createOperationFormOptions(params, "insert", null, formData);
}

export function createUpdateFormOptions(
	params: RuntimeMenuItemParams,
	rowData: Row | null,
	formData: FormResult | null = null,
): FormInputOption[] {
	return createOperationFormOptions(params, "update", rowData, formData);
}

function createOperationFormOptions(
	params: RuntimeMenuItemParams,
	operation: "insert" | "update",
	rowData: Row | null = null,
	formData: FormResult | null = null,
): FormInputOption[] {
	const columns = params.columns.filter((column) => column[operation].enabled);

	return columns.map((column): FormInputOption => {
		const lookup = column.lookup[operation];
		const submittedParams = formData?.[column.name];
		const defaultValue = submittedParams ? submittedParams.value : rowData?.[column.name];

		return {
			name: column.name,
			label: column.label,
			type: column.type === "text" ? "string" : column.type,
			language: column.language,
			operators: ["equals"],
			defaultOperator: "equals",
			showOperator: false,
			required: column[operation].required,
			defaultValue: normalizeDefaultValue(column.type, defaultValue),
			...(lookup.enabled
				? {
						multiple: lookup.multiple,
						lookupHandler: lookup.handler,
						lookupDependsOn: lookup.dependsOn,
					}
				: {}),
		};
	});
}

function normalizeDefaultValue(
	type: ColumnType,
	value: FormInputOption["defaultValueTo"],
): FormInputOption["defaultValueTo"];
function normalizeDefaultValue(
	type: ColumnType,
	value: FormInputOption["defaultValue"],
): FormInputOption["defaultValue"];
function normalizeDefaultValue(
	type: ColumnType,
	value: FormInputOption["defaultValue"],
): FormInputOption["defaultValue"] {
	return type === "date" && typeof value === "string" ? value.slice(0, 10) : value;
}
