import { Component, input, model, output } from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import type { EditorLang } from "../../../models/editor-lang.model";
import { Editor } from "../../editor/editor";

@Component({
	selector: "form-editor",
	imports: [Editor],
	templateUrl: "./form-editor.html",
})
export class FormEditor implements FormValueControl<string | null> {
	readonly value = model.required<string | null>();
	readonly readonly = input(false);
	readonly name = input("");
	readonly required = input(false);
	readonly touch = output<void>();

	readonly language = input<EditorLang>("plaintext");

	protected updateValue(value: string): void {
		this.value.set(value || null);
	}

	protected markTouched(): void {
		this.touch.emit();
	}
}
