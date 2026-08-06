import { Component, input, output } from "@angular/core";

@Component({
	selector: "app-confirmation-dialog",
	templateUrl: "./confirmation-dialog.html",
	host: {
		class: "absolute inset-0 z-30 grid place-items-center p-4",
		"(keydown.escape)": "$event.stopPropagation(); cancel()",
	},
})
export class ConfirmationDialog {
	title = input.required<string>();
	message = input.required<string>();
	confirmLabel = input("Confirm");
	loading = input(false);

	confirmed = output<void>();
	cancelled = output<void>();

	cancel(): void {
		if (!this.loading()) {
			this.cancelled.emit();
		}
	}
}
