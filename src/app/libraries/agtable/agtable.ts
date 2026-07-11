import { Component, inject, input } from "@angular/core";
import { AgGridAngular } from "ag-grid-angular";
import type { GridOptions } from "ag-grid-community";
import { AgGridRegistry } from "../../services/ag-table-registry";

@Component({
	selector: "agtable",
	imports: [AgGridAngular],
	templateUrl: "./agtable.html",
	host: {
		class: "block h-full min-h-0",
	},
})
export class Agtable<TData> {
  agGridRegistry = inject(AgGridRegistry);
	gridOptions = input.required<GridOptions<TData>>();

	constructor() {
		this.agGridRegistry.initializeModules();
	}
}
