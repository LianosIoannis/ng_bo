import { Component, computed, input, model, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { FormValueControl } from "@angular/forms/signals";
import { NgMultiLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from "@ng-select/ng-select";
import type { SelectOption, SelectValueResult } from "../../../models/form.models";

@Component({
	selector: "form-select",
	imports: [FormsModule, NgSelectComponent, NgMultiLabelTemplateDirective, NgOptionTemplateDirective],
	templateUrl: "./form-select.html",
})
export class FormSelect implements FormValueControl<SelectValueResult> {
	readonly value = model.required<SelectValueResult>();
	readonly readonly = input(false);
	readonly name = input("");
	readonly required = input(false);
	readonly touch = output<void>();

	readonly options = input<SelectOption[]>([]);
	readonly placeholder = input("");
	readonly allowClear = input(true);
	readonly multiple = input(false);

	protected readonly selectedValues = computed(() => {
		const value = this.value();
		return Array.isArray(value) ? value : [];
	});

	protected selectedLabel(): string {
		const selectedOptions = this.options().filter((option) => this.isSelected(option));

		if (selectedOptions.length === 0) {
			return this.placeholder() || "Select options";
		}

		if (selectedOptions.length === 1) {
			return selectedOptions[0].label;
		}

		return `${selectedOptions.length} selected`;
	}

	protected isSelected(option: SelectOption): boolean {
		return this.selectedValues().includes(option.value);
	}

	protected updateValue(value: SelectValueResult): void {
		if (this.readonly()) {
			return;
		}

		if (this.multiple()) {
			this.value.set(Array.isArray(value) ? value : []);
			return;
		}

		if (value === null && !this.allowClear()) {
			return;
		}

		this.value.set(Array.isArray(value) ? null : value);
	}

	protected markTouched(): void {
		this.touch.emit();
	}
}
