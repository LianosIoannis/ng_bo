import { Component, signal } from "@angular/core";
import { Form } from "../../libraries/form/form";
import type { FormInputOption } from "../../models/form.models";

@Component({
	selector: "app-form-test",
	imports: [Form],
	templateUrl: "./form-test.html",
})
export class FormTest {
	protected readonly formOptions = signal<FormInputOption[]>([
		{
			name: "customerName",
			label: "Customer name",
			type: "string",
			operators: ["contains", "equals", "startsWith", "endsWith"],
			defaultOperator: "contains",
			defaultValue: "Acme",
			required: true,
		},
		{
			name: "orderTotal",
			label: "Order total",
			type: "number",
			operators: ["equals", "greaterThan", "lessThan", "between"],
			defaultOperator: "between",
			defaultValue: 100,
		},
		{
			name: "status",
			label: "Status",
			type: "string",
			operators: ["equals", "notEquals", "in", "notIn"],
			defaultOperator: "equals",
			defaultValue: "open",
			options: [
				{ label: "Open", value: "open" },
				{ label: "In review", value: "review" },
				{ label: "Closed", value: "closed" },
			],
		},
		{
			name: "regions",
			label: "Regions",
			type: "string",
			operators: ["in", "notIn"],
			defaultOperator: "in",
			defaultValue: ["emea", "na"],
			options: [
				{ label: "North America", value: "na" },
				{ label: "EMEA", value: "emea" },
				{ label: "APAC", value: "apac" },
			],
			multiple: true,
		},
		{
			name: "activeOnly",
			label: "Active only",
			type: "boolean",
			operators: ["equals", "notEquals"],
			defaultOperator: "equals",
			defaultValue: true,
		},
		{
			name: "filterScript",
			label: "Filter script",
			type: "code",
			operators: ["javascript", "typescript", "sql", "json"],
			defaultOperator: "javascript",
			defaultValue: "return row.total > 100;",
		},
		{
			name: "createdDate",
			label: "Created date",
			type: "date",
			operators: ["equals", "greaterThanOrEqual", "lessThanOrEqual"],
			defaultOperator: "greaterThanOrEqual",
			defaultValue: "2026-01-01",
			readonly: true,
		},
	]);
}
