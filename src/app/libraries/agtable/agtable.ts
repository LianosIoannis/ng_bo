import { Component, inject, input, output } from "@angular/core";
import { AgGridAngular } from "ag-grid-angular";
import type { GridOptions, RowClickedEvent, SelectionChangedEvent } from "ag-grid-community";
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
	selectionChanged = output<TData | null>();

	onRowClicked(row: RowClickedEvent<TData>): void {
		this.rowClicked.emit(row);
	}

	onSelectionChanged(event: SelectionChangedEvent<TData>): void {
		this.selectionChanged.emit(event.api.getSelectedRows()[0] ?? null);
	}

	constructor() {
		this.agGridRegistry.initializeModules();
	}
}
