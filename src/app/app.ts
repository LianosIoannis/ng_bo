import { Component, signal } from "@angular/core";
import { FormTest } from "./tests/form-test/form-test";

@Component({
	selector: "app-root",
	imports: [FormTest],
	templateUrl: "./app.html",
})
export class App {
	protected readonly title = signal("ng_bo");
}
