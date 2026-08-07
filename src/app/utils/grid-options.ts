import type { ColDef, GridOptions, ValueFormatterParams } from "ag-grid-community";
import { themeAlpine } from "ag-grid-community";
import dayjs from "dayjs";
import type { ColumnType } from "../models/menu-item-params.models";
import type { Row, RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";

export function createGridOptions(menuItemParams: RuntimeMenuItemParams, rowData: Row[]): GridOptions<Row> {
	return {
		columnDefs: menuItemParams.columns.map((column) => ({
			field: column.name,
			headerName: column.label,
			hide: !column.visible,
			sortable: column.sortable,
			filter: column.filterable,
			...getTypeOptions(column.type),
		})),
		rowData,
		theme: themeAlpine,
		suppressCellFocus: true,
		pagination: true,
		paginationPageSize: 50,
		paginationPageSizeSelector: [50, 100, 250, 1000],
		autoSizeStrategy: { type: "fitCellContents" },
		rowSelection: {
			mode: "singleRow",
			enableClickSelection: true,
			checkboxes: false,
		},
	};
}

function getTypeOptions(type: ColumnType): ColDef<Row> {
	switch (type) {
		case "date":
			return { cellDataType: "dateString", valueFormatter: createDateTimeOptions("DD/MM/YYYY") };
		case "datetime":
			return { cellDataType: "dateTimeString", valueFormatter: createDateTimeOptions("DD/MM/YYYY HH:mm") };
		case "time":
			return {
				cellDataType: "text",
				valueFormatter: createDateTimeOptions("HH:mm"),
				filterValueGetter: (params) => {
					const value = params.data?.[params.colDef.field as string] as string;
					const parsed = dayjs(value);
					return parsed.isValid() ? parsed.format("HH:mm") : value;
				},
			};
		case "code":
			return {
				valueFormatter: ({ value }: ValueFormatterParams<Row>) => String(value ?? "").slice(0, 30),
			};
		default:
			return {};
	}
}

function createDateTimeOptions(format: string) {
	return ({ value }: ValueFormatterParams<Row>) => {
		if (value === null || value === undefined || value === "") {
			return "";
		}

		const parsedValue = dayjs(value);

		return parsedValue.isValid() ? parsedValue.format(format) : String(value);
	};
}
