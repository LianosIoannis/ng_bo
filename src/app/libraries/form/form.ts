import { Component, Injector, inject, input, type OnInit, output, signal } from "@angular/core";
import { disabled, type Field, type FieldTree, FormField, FormRoot, form, required } from "@angular/forms/signals";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { FormInputOption, FormModel, FormResult, SelectOption, SelectValueResult } from "../../models/form.models";
import type { Operator } from "../../models/menu-item-params.models";
import { FormCheckbox } from "./form-checkbox/form-checkbox";
import { FormEditor } from "./form-editor/form-editor";
import { FormInput } from "./form-input/form-input";
import { FormSelect } from "./form-select/form-select";

@Component({
	selector: "app-form",
	imports: [FormRoot, FormField, FormSelect, FormInput, FormCheckbox, FormEditor, FaIconComponent],
	templateUrl: "./form.html",
	host: {
		class: "block h-full min-h-0",
	},
})
export class Form implements OnInit {
	injector = inject(Injector);

	inputOptions = input.required<FormInputOption[]>();
	formTitle = input("Form");
	submitLabel = input("Submit");
	formResult = output<FormResult>();
	cancelled = output<void>();

	submitIcon = faCheck;
	cancelIcon = faXmark;

	operatorOptionsMap = new Map<string, SelectOption[]>();

	formModel = signal<FormModel>({});

	optionsForm!: FieldTree<FormModel>;

	ngOnInit(): void {
		const inputOptions = this.inputOptions();
		const model: FormModel = {};

		for (const option of inputOptions) {
			model[option.name] = {
				operator: option.defaultOperator ?? option.operators[0] ?? "equals",
				value: option.defaultValue ?? (option.multiple ? [] : null),
				valueTo: null,
			};

			this.operatorOptionsMap.set(
				option.name,
				option.operators.map((operator) => ({
					label: operator,
					value: operator,
				})),
			);
		}

		this.formModel.set(model);

		this.optionsForm = form(
			this.formModel,
			(path) => {
				for (const option of inputOptions) {
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
			},
			{ injector: this.injector },
		);
	}

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
		return this.operatorOptionsMap.get(option.name) ?? [];
	}

	submitForm(): void {
		this.optionsForm().markAsTouched();

		if (!this.optionsForm().valid()) {
			return;
		}

		this.formResult.emit(this.formModel());
	}

	cancelForm(): void {
		this.cancelled.emit();
	}
}
