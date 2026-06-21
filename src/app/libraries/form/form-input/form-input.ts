import { Component, input, model, output } from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";

@Component({
	selector: "form-input",
	templateUrl: "./form-input.html",
})
export class FormInput implements FormValueControl<string | number | null> {
	readonly value = model.required<string | number | null>();
	readonly readonly = input(false);
	readonly name = input("");
	readonly required = input(false);
	readonly touch = output<void>();

	readonly type = input<"date" | "datetime-local" | "time">("date");


	protected updateValue(event: Event): void {
		const inputElement = event.target;

		if (!(inputElement instanceof HTMLInputElement)) {
			return;
		}

		this.value.set(inputElement.value || null);
	}

	protected markTouched(): void {
		this.touch.emit();
	}
}
