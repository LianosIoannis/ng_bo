import { Component, input, model, output } from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";

@Component({
	selector: "form-checkbox",
	imports: [],
	templateUrl: "./form-checkbox.html",
})
export class FormCheckbox implements FormValueControl<boolean | null> {
	readonly value = model.required<boolean | null>();
	readonly readonly = input(false);
	readonly name = input("");
	readonly required = input(false);
	readonly touch = output<void>();

	readonly label = input("");

	protected updateValue(event: Event): void {
		const inputElement = event.target;

		if (!(inputElement instanceof HTMLInputElement) || this.readonly()) {
			return;
		}

		this.value.set(inputElement.checked);
	}

	protected markTouched(): void {
		this.touch.emit();
	}
}
