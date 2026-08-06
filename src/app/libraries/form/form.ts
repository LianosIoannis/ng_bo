import { Component, Injector, inject, input, type OnInit, output, signal } from "@angular/core";
import { disabled, type Field, type FieldTree, FormField, FormRoot, form, required } from "@angular/forms/signals";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { FormInputOption, FormModel, FormResult, SelectOption, SelectOptionValue, SelectValueResult } from "../../models/form.models";
import type { Operator } from "../../models/menu-item-params.models";
import type { Row } from "../../models/menu-item-params.runtime.models";
import { HandlerRunner } from "../../services/handler-runner";
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
	handlerRunner = inject(HandlerRunner);

	inputOptions = input.required<FormInputOption[]>();
	formTitle = input("Form");
	submitLabel = input("Submit");
	formResult = output<FormResult>();
	cancelled = output<void>();

	submitIcon = faCheck;
	cancelIcon = faXmark;

	operatorOptionsMap = new Map<string, SelectOption[]>();
	lookupOptionsMap = signal<Record<string, SelectOption[]>>({});
	lookupOptionsLoading = signal(false);
	lookupOptionsError = signal("");

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

		this.loadLookupOptions(inputOptions);
	}

	async loadLookupOptions(inputOptions: FormInputOption[]): Promise<void> {
		const lookupOptions = inputOptions.filter((option) => option.lookupHandler);

		if (lookupOptions.length === 0) {
			return;
		}

		this.lookupOptionsLoading.set(true);
		this.lookupOptionsError.set("");

		try {
			const entries = await Promise.all(
				lookupOptions.map(async (option) => {
					if (!option.lookupHandler) {
						return [option.name, []] as const;
					}

					const result = await this.handlerRunner.run(option.lookupHandler);

					if (!result.success) {
						throw new Error(`Lookup failed for "${option.name}": ${result.error}`);
					}

					return [option.name, result.data.map(toSelectOption)] as const;
				}),
			);

			this.lookupOptionsMap.set(Object.fromEntries(entries));
		} catch (error) {
			this.lookupOptionsError.set(error instanceof Error ? error.message : String(error));
		} finally {
			this.lookupOptionsLoading.set(false);
		}
	}

	selectOptions(option: FormInputOption): SelectOption[] {
		return option.lookupHandler ? (this.lookupOptionsMap()[option.name] ?? []) : (option.options ?? []);
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

function toSelectOption(row: Row): SelectOption {
	const value = row["value"] as SelectOptionValue;
	const label = row["label"];

	return {
		value,
		label: label === null || label === undefined ? String(value) : String(label),
	};
}
