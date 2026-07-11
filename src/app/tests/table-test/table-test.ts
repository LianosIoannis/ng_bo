import { Component } from "@angular/core";
import type { GridOptions, RowClickedEvent } from "ag-grid-community";
import { Agtable } from "../../libraries/agtable/agtable";

interface OrderRow {
	id: number;
	customer: string;
	status: "Open" | "In review" | "Closed";
	region: string;
	total: number;
}

@Component({
	selector: "app-table-test",
	imports: [Agtable],
	templateUrl: "./table-test.html",
})
export class TableTest {
	protected readonly gridOptions: GridOptions<OrderRow> = {
		columnDefs: [
			{ field: "id", headerName: "Order", maxWidth: 110 },
			{ field: "customer", flex: 1, minWidth: 160 },
			{ field: "status", minWidth: 130 },
			{ field: "region", minWidth: 120 },
			{
				field: "total",
				headerName: "Total",
				valueFormatter: ({ value }) =>
					new Intl.NumberFormat("en-US", {
						style: "currency",
						currency: "USD",
					}).format(value ?? 0),
			},
		],
		defaultColDef: {
			filter: true,
			resizable: true,
			sortable: true,
		},
		rowData: [
			{ id: 1001, customer: "Acme Industries", status: "Open", region: "EMEA", total: 1240.5 },
			{ id: 1002, customer: "Northwind", status: "In review", region: "NA", total: 895 },
			{ id: 1003, customer: "Globex", status: "Closed", region: "APAC", total: 2180.75 },
			{ id: 1004, customer: "Initech", status: "Open", region: "NA", total: 460 },
			{ id: 1005, customer: "Umbrella Corp", status: "In review", region: "EMEA", total: 3375.2 },
		],
		rowSelection: {
			mode: "singleRow",
			enableClickSelection: true,
			checkboxes: false,
		},
    suppressCellFocus: true,
		pagination: true,
		paginationPageSizeSelector: [10, 20, 50, 100],
		paginationPageSize: 10,
	};

  onRowClicked(row: RowClickedEvent<OrderRow>): void {
    console.log("Row clicked:", row.data);
  }
}
