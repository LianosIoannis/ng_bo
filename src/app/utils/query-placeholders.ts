import type { HandlerInput } from "../models/menu-item-params.runtime.models";

export function replaceQueryPlaceholders(query: string, values: HandlerInput): string {
	let result = query;

	for (const [column, value] of Object.entries(values)) {
		const replacement = serializeValue(value);

		if (replacement !== undefined) {
			result = result.replaceAll(`@{${column}}`, replacement);
		}
	}

	return result;
}

function serializeValue(value: unknown): string | undefined {
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return undefined;
		}

		const serializedValues = value.map(serializeArrayValue);

		return serializedValues.every((item) => item !== undefined) ? serializedValues.join(",") : undefined;
	}

	return serializeScalarValue(value);
}

function serializeArrayValue(value: unknown): string | undefined {
	if (value === null) {
		return "NULL";
	}

	const serializedValue = serializeScalarValue(value);

	return serializedValue === undefined ? undefined : `'${serializedValue}'`;
}

function serializeScalarValue(value: unknown): string | undefined {
	switch (typeof value) {
		case "string":
			return value.replaceAll("'", "''");
		case "number":
			return String(value);
		case "boolean":
			return value ? "1" : "0";
		case "object":
			return value === null ? "NULL" : undefined;
		default:
			return undefined;
	}
}
