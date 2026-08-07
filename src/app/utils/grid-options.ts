import type { ColDef, GridOptions, ValueFormatterParams, ValueGetterParams } from "ag-grid-community";
import { themeAlpine } from "ag-grid-community";
import dayjs from "dayjs";
import type { ColumnType } from "../models/menu-item-params.models";
import type { Row, RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";
import type { GridLookupMap, GridLookupMaps, GridLookupValue } from "./grid-lookups";

const emptyGridLookup: GridLookupMap = new Map();

export function createGridOptions(
	menuItemParams: RuntimeMenuItemParams,
	rowData: Row[],
	gridLookupMaps: GridLookupMaps = new Map(),
): GridOptions<Row> {
	return {
		columnDefs: menuItemParams.columns.map((column) => {
			const gridLookup = column.lookup.grid.enabled ? (gridLookupMaps.get(column.name) ?? emptyGridLookup) : null;

			return {
				field: column.name,
				headerName: column.label,
				hide: !column.visible,
				sortable: column.sortable,
				filter: gridLookup && column.filterable ? "agTextColumnFilter" : column.filterable,
				...getTypeOptions(column.type),
				...(gridLookup ? getGridLookupOptions(column.name, gridLookup) : {}),
			};
		}),
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

function getGridLookupOptions(columnName: string, lookup: GridLookupMap): ColDef<Row> {
	return {
		valueFormatter: ({ value }: ValueFormatterParams<Row>) => formatGridLookupValue(value, lookup),
		filterValueGetter: ({ data }: ValueGetterParams<Row>) => formatGridLookupValue(data?.[columnName], lookup),
	};
}

function formatGridLookupValue(value: unknown, lookup: GridLookupMap): string {
	if (value === null || value === undefined) {
		return "";
	}

	return isGridLookupValue(value) ? (lookup.get(value) ?? String(value)) : String(value);
}

function isGridLookupValue(value: unknown): value is GridLookupValue {
	return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
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
