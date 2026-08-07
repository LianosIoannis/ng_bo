import { type Binary, type ExpressionValue, Parser, type Value } from "node-sql-parser/build/transactsql";
import type { FormParams, FormResult } from "../models/form.models";
import type { Operator } from "../models/menu-item-params.models";
import { createRetrieveHandlerInput } from "./form-result";
import { replaceQueryPlaceholders } from "./query-placeholders";

const parser = new Parser();

export function createRetrieveQuery(query: string, criteria: FormResult | null): string {
	const handlerInput = createRetrieveHandlerInput(criteria);
	const placeholderNames = findPlaceholderNames(query);

	for (const name of placeholderNames) {
		if (!Object.hasOwn(handlerInput, name)) {
			throw new Error(`Retrieve query placeholder "@{${name}}" does not have a value.`);
		}
	}

	const replacedQuery = replaceQueryPlaceholders(query, handlerInput);
	const remainingCriteria = Object.entries(criteria ?? {}).filter(
		([name, params]) => hasValue(params.value) && !placeholderNames.has(name),
	);

	if (remainingCriteria.length === 0) {
		return replacedQuery;
	}

	const ast = parser.astify(replacedQuery);

	if (Array.isArray(ast)) {
		throw new Error("Automatic retrieve criteria support a single SELECT statement only.");
	}

	if (ast.type !== "select" || ast.set_op || ast._next) {
		throw new Error("Automatic retrieve criteria support a single SELECT statement only.");
	}

	const criteriaExpression = combineWithAnd(
		remainingCriteria.map(([column, params]) => createCriteriaExpression(column, params)),
	);

	ast.where = ast.where ? combineWithAnd([ast.where, criteriaExpression]) : criteriaExpression;

	return parser.sqlify(ast);
}

function findPlaceholderNames(query: string): Set<string> {
	const names = new Set<string>();
	let position = 0;

	while (position < query.length) {
		const start = query.indexOf("@{", position);

		if (start === -1) {
			break;
		}

		const end = query.indexOf("}", start + 2);

		if (end === -1) {
			break;
		}

		const name = query.slice(start + 2, end);

		if (name) {
			names.add(name);
		}

		position = end + 1;
	}

	return names;
}

function createCriteriaExpression(column: string, params: FormParams): Binary {
	const left = {
		type: "column_ref" as const,
		table: null,
		column,
	};

	switch (params.operator) {
		case "equals":
			return createBinaryExpression("=", left, createScalarExpression(params.value, params.operator));
		case "notEquals":
			return createBinaryExpression("<>", left, createScalarExpression(params.value, params.operator));
		case "contains":
			return createLikeExpression(left, `%${createLikeValue(params.value, params.operator)}%`);
		case "notContains":
			return createLikeExpression(left, `%${createLikeValue(params.value, params.operator)}%`, true);
		case "startsWith":
			return createLikeExpression(left, `${createLikeValue(params.value, params.operator)}%`);
		case "endsWith":
			return createLikeExpression(left, `%${createLikeValue(params.value, params.operator)}`);
		case "greaterThan":
			return createBinaryExpression(">", left, createScalarExpression(params.value, params.operator));
		case "lessThan":
			return createBinaryExpression("<", left, createScalarExpression(params.value, params.operator));
		case "greaterThanOrEqual":
			return createBinaryExpression(">=", left, createScalarExpression(params.value, params.operator));
		case "lessThanOrEqual":
			return createBinaryExpression("<=", left, createScalarExpression(params.value, params.operator));
		case "between":
			return createRangeExpression("BETWEEN", left, params);
		case "notBetween":
			return createRangeExpression("NOT BETWEEN", left, params);
		case "in":
			return createListExpression("IN", left, params.value);
		case "notIn":
			return createListExpression("NOT IN", left, params.value);
		default:
			return assertNever(params.operator);
	}
}

function createBinaryExpression(operator: string, left: ExpressionValue, right: ExpressionValue): Binary {
	return {
		type: "binary_expr",
		operator,
		left,
		right,
	};
}

function createLikeExpression(left: ExpressionValue, value: string, negate = false): Binary {
	return createBinaryExpression(negate ? "NOT LIKE" : "LIKE", left, createStringExpression(value));
}

function createRangeExpression(operator: "BETWEEN" | "NOT BETWEEN", left: ExpressionValue, params: FormParams): Binary {
	if (Array.isArray(params.value) || !hasValue(params.valueTo)) {
		throw new Error(`Retrieve operator "${params.operator}" requires two scalar values.`);
	}

	return createBinaryExpression(operator, left, {
		type: "expr_list",
		value: [createValueExpression(params.value), createValueExpression(params.valueTo)],
	});
}

function createListExpression(operator: "IN" | "NOT IN", left: ExpressionValue, value: FormParams["value"]): Binary {
	const values = Array.isArray(value) ? value : [value];

	return createBinaryExpression(operator, left, {
		type: "expr_list",
		value: values.map(createValueExpression),
	});
}

function createScalarExpression(value: FormParams["value"], operator: Operator): Value {
	if (Array.isArray(value)) {
		throw new Error(`Retrieve operator "${operator}" requires a scalar value.`);
	}

	return createValueExpression(value);
}

function createLikeValue(value: FormParams["value"], operator: Operator): string {
	if (Array.isArray(value) || value === null) {
		throw new Error(`Retrieve operator "${operator}" requires a scalar value.`);
	}

	return String(value);
}

function createValueExpression(value: FormParams["valueTo"]): Value {
	switch (typeof value) {
		case "string":
			return createStringExpression(value);
		case "number":
			return { type: "number", value };
		case "boolean":
			return { type: "number", value: value ? 1 : 0 };
		case "object":
			return { type: "null", value: null };
	}
}

function createStringExpression(value: string): Value {
	return {
		type: "single_quote_string",
		value: value.replaceAll("'", "''"),
	};
}

function combineWithAnd(expressions: ExpressionValue[]): Binary {
	const [first, ...remaining] = expressions;

	if (!first) {
		throw new Error("At least one retrieve criterion is required.");
	}

	return remaining.reduce((left, right) => createBinaryExpression("AND", left, right), first) as Binary;
}

function hasValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function assertNever(value: never): never {
	throw new Error(`Unsupported retrieve operator: ${String(value)}.`);
}
