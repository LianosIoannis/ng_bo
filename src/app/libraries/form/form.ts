import { Component, computed, input, linkedSignal } from "@angular/core";
import { disabled, type Field, FormField, form, required } from "@angular/forms/signals";
import type { EditorLang } from "../../models/editor-lang.model";
import type { FormInputOption, FormModel, Operator, SelectValueResult } from "../../models/form.models";
import { FormCheckbox } from "./form-checkbox/form-checkbox";
import { FormEditor } from "./form-editor/form-editor";
import { FormInput } from "./form-input/form-input";
import { FormSelect } from "./form-select/form-select";

@Component({
	selector: "app-form",
	imports: [FormField, FormSelect, FormInput, FormCheckbox, FormEditor],
	templateUrl: "./form.html",
})
export class Form {
	inputOptions = input<FormInputOption[]>([]);
	submitLabel = input<string>("Submit");

	operatorOptionsMap = computed(() => {
		return this.inputOptions().map((option) => ({
			name: option.name,
			operators: option.operators.map((operator) => ({
				label: operator as string,
				value: operator,
			})),
		}));
	});

	formModel = linkedSignal(() => {
		const model: FormModel = {};

		for (const option of this.inputOptions()) {
			model[option.name] = {
				operator: option.defaultOperator ?? option.operators?.[0] ?? ("equals" as Operator),
				value: option.defaultValue ?? (option.multiple ? [] : null),
				valueTo: null,
			};
		}

		return model;
	});

	optionsForm = form(this.formModel, (path) => {
		for (const option of this.inputOptions()) {
			const field = path[option.name];

			if (option.required) {
				required(field.value);
			}

			if (option.readonly) {
				disabled(field.value);
				disabled(field.operator);
				disabled(field.valueTo);
			}
		}
	});

	isRangeOperator(operator: Operator): boolean {
		return operator === "between" || operator === "notBetween";
	}

	inputField(option: FormInputOption) {
		return this.optionsForm[option.name].value;
	}

	inputValueField(option: FormInputOption) {
		return this.inputField(option) as Field<string | number | null>;
	}

	inputValueToField(option: FormInputOption) {
		return this.optionsForm[option.name].valueTo as Field<string | number | null>;
	}

	booleanValueField(option: FormInputOption) {
		return this.inputField(option) as Field<boolean | null>;
	}

	codeValueField(option: FormInputOption) {
		return this.inputField(option) as Field<string | null>;
	}

	selectValueField(option: FormInputOption) {
		return this.inputField(option) as Field<SelectValueResult>;
	}

	selectedLanguage(option: FormInputOption) {
		return this.optionsForm[option.name].operator().value() as EditorLang;
	}

	inputType(option: FormInputOption): "text" | "number" | "date" | "datetime-local" | "time" {
		switch (option.type) {
			case "number":
				return "number";
			case "date":
				return "date";
			case "datetime":
				return "datetime-local";
			case "time":
				return "time";
			default:
				return "text";
		}
	}

	operatorOptions(option: FormInputOption) {
		return this.operatorOptionsMap().find((item) => item.name === option.name)?.operators ?? [];
	}

	submitForm() {}
}
