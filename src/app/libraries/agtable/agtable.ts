import { Component, inject, input, output } from "@angular/core";
import { AgGridAngular } from "ag-grid-angular";
import type { GridOptions, RowClickedEvent } from "ag-grid-community";
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

	rowClicked = output<RowClickedEvent<TData>>();

	onRowClicked(row: RowClickedEvent<TData>): void {
		this.rowClicked.emit(row);
	}

	constructor() {
		this.agGridRegistry.initializeModules();
	}
}
