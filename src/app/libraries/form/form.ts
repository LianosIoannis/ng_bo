import {
	Component,
	computed,
	debounced,
	effect,
	Injector,
	inject,
	input,
	type OnInit,
	output,
	signal,
	untracked,
} from "@angular/core";
import { disabled, type Field, type FieldTree, FormField, FormRoot, form, required } from "@angular/forms/signals";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { NgxSpinnerComponent, NgxSpinnerService } from "ngx-spinner";
import type {
	FormInputOption,
	FormModel,
	FormResult,
	SelectOption,
	SelectOptionValue,
	SelectValueResult,
} from "../../models/form.models";
import type { Operator } from "../../models/menu-item-params.models";
import type { HandlerInput, Row } from "../../models/menu-item-params.runtime.models";
import { HandlerRunner } from "../../services/handler-runner";
import { FormCheckbox } from "./form-checkbox/form-checkbox";
import { FormEditor } from "./form-editor/form-editor";
import { FormInput } from "./form-input/form-input";
import { FormSelect } from "./form-select/form-select";

@Component({
	selector: "app-form",
	imports: [FormRoot, FormField, FormSelect, FormInput, FormCheckbox, FormEditor, FaIconComponent, NgxSpinnerComponent],
	templateUrl: "./form.html",
	host: {
		class: "block h-full min-h-0",
	},
})
export class Form implements OnInit {
	injector = inject(Injector);
	handlerRunner = inject(HandlerRunner);
	spinnerService = inject(NgxSpinnerService);

	inputOptions = input.required<FormInputOption[]>();
	formTitle = input("Form");
	submitLabel = input("Submit");
	formResult = output<FormResult>();
	cancelled = output<void>();

	submitIcon = faCheck;
	cancelIcon = faXmark;
	spinnerName = "form-options";

	operatorOptionsMap = new Map<string, SelectOption[]>();
	lookupOptionsMap = signal<Record<string, SelectOption[]>>({});
	lookupOptionsLoading = signal(false);
	lookupOptionsError = signal("");

	formModel = signal<FormModel>({});

	optionsForm!: FieldTree<FormModel>;
	private lookupGeneration = 0;

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

		this.initializeLookupOptions(inputOptions);

		effect(
			(onCleanup) => {
				if (!this.lookupOptionsLoading()) {
					return;
				}

				void this.spinnerService.show(this.spinnerName);
				onCleanup(() => void this.spinnerService.hide(this.spinnerName));
			},
			{ injector: this.injector },
		);
	}

	private initializeLookupOptions(inputOptions: FormInputOption[]): void {
		const lookupOptions = inputOptions.filter((option) => option.lookupHandler);

		if (lookupOptions.length === 0) {
			return;
		}

		const dependencyNames = [...new Set(lookupOptions.flatMap((option) => option.lookupDependsOn ?? []))];

		if (dependencyNames.length === 0) {
			void this.loadLookupOptions(lookupOptions, this.createHandlerContext());
			return;
		}

		const dependencyContext = computed(() => {
			const model = this.formModel();

			return Object.fromEntries(dependencyNames.map((name) => [name, model[name]?.value ?? null]));
		});

		const debouncedDependencyContext = debounced(dependencyContext, 250, {
			injector: this.injector,
			equal: (previous, current) => JSON.stringify(previous) === JSON.stringify(current),
		});

		effect(
			() => {
				debouncedDependencyContext.value();

				untracked(() => {
					void this.loadLookupOptions(lookupOptions, this.createHandlerContext());
				});
			},
			{ injector: this.injector },
		);
	}

	private async loadLookupOptions(inputOptions: FormInputOption[], context: HandlerInput): Promise<void> {
		const generation = ++this.lookupGeneration;

		this.lookupOptionsLoading.set(true);
		this.lookupOptionsError.set("");

		try {
			const entries = await Promise.all(
				inputOptions.map(async (option) => {
					if (!option.lookupHandler || !this.lookupDependenciesReady(option, context)) {
						return [option.name, []] as const;
					}

					const result = await this.handlerRunner.run(option.lookupHandler, context);

					if (!result.success) {
						throw new Error(`Lookup failed for "${option.name}": ${result.error}`);
					}

					return [option.name, result.data.map(toSelectOption)] as const;
				}),
			);

			if (generation !== this.lookupGeneration) {
				return;
			}

			const optionsMap = Object.fromEntries(entries);
			this.lookupOptionsMap.set(optionsMap);
			this.removeInvalidLookupValues(inputOptions, optionsMap);
		} catch (error) {
			if (generation !== this.lookupGeneration) {
				return;
			}

			this.lookupOptionsError.set(error instanceof Error ? error.message : String(error));
		} finally {
			if (generation === this.lookupGeneration) {
				this.lookupOptionsLoading.set(false);
			}
		}
	}

	private createHandlerContext(): HandlerInput {
		return Object.fromEntries(Object.entries(this.formModel()).map(([name, params]) => [name, params.value]));
	}

	private lookupDependenciesReady(option: FormInputOption, context: HandlerInput): boolean {
		return (option.lookupDependsOn ?? []).every((name) => hasValue(context[name]));
	}

	private removeInvalidLookupValues(inputOptions: FormInputOption[], optionsMap: Record<string, SelectOption[]>): void {
		this.formModel.update((model) => {
			let updatedModel = model;

			for (const option of inputOptions) {
				const field = model[option.name];
				const validValues = new Set(optionsMap[option.name].map(({ value }) => value));
				const currentValue = field.value;
				const value = Array.isArray(currentValue)
					? currentValue.filter(
							(item): item is SelectOptionValue =>
								(typeof item === "string" || typeof item === "number") && validValues.has(item),
						)
					: (typeof currentValue === "string" || typeof currentValue === "number") && validValues.has(currentValue)
						? currentValue
						: null;

				if (sameValue(currentValue, value)) {
					continue;
				}

				updatedModel = {
					...updatedModel,
					[option.name]: {
						...field,
						value,
					},
				};
			}

			return updatedModel;
		});
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

function hasValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function sameValue(previous: FormModel[string]["value"], current: FormModel[string]["value"]): boolean {
	if (!Array.isArray(previous) || !Array.isArray(current)) {
		return previous === current;
	}

	return previous.length === current.length && previous.every((value, index) => value === current[index]);
}

function toSelectOption(row: Row): SelectOption {
	const value = row["value"] as SelectOptionValue;
	const label = row["label"];

	return {
		value,
		label: label === null || label === undefined ? String(value) : String(label),
	};
}
