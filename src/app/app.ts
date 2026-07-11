import { Component, signal } from "@angular/core";
import { FormTest } from "./tests/form-test/form-test";
import { TableTest } from "./tests/table-test/table-test";

@Component({
	selector: "app-root",
	imports: [FormTest, TableTest],
	templateUrl: "./app.html",
})
export class App {
	protected readonly title = signal("ng_bo");
}
