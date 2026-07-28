import { Component, computed, input } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faPenToSquare, faPlus, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { GridOptions } from "ag-grid-community";
import { Agtable } from "../libraries/agtable/agtable";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row } from "../models/menu-item-params.runtime.models";
import { createGridOptions } from "../utils/grid-options";

@Component({
	selector: "app-workspace",
	imports: [Agtable, FaIconComponent],
	templateUrl: "./workspace.html",
	host: {
		class: "block h-full min-h-0",
	},
})
export class Workspace {
	menuItem = input.required<MenuItemModel>();

	insertIcon = faPlus;
	deleteIcon = faTrash;
	editIcon = faPenToSquare;
	refreshIcon = faRotateRight;

	gridOptions = computed<GridOptions<Row>>(() => {
		const params = this.menuItem().params;

		return params ? createGridOptions(params, []) : { columnDefs: [], rowData: [] };
	});
}
