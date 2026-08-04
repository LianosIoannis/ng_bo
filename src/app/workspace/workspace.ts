import { Component, computed, inject, input, signal } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faFilter, faPenToSquare, faPlus, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { GridOptions } from "ag-grid-community";
import { Agtable } from "../libraries/agtable/agtable";
import { Form } from "../libraries/form/form";
import type { FormInputOption, FormResult } from "../models/form.models";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row, RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";
import { HandlerRunner } from "../services/handler-runner";
import { createCriteriaFormOptions, createInsertFormOptions, createUpdateFormOptions } from "../utils/form-options";
import { createGridOptions } from "../utils/grid-options";

type FormDrawerMode = "insert" | "criteria" | "update";

@Component({
	selector: "app-workspace",
	imports: [Agtable, FaIconComponent, Form],
	templateUrl: "./workspace.html",
	host: {
		class: "block h-full min-h-0",
		"(keydown.escape)": "closeFormDrawer()",
	},
})
export class Workspace {
	handlerRunner = inject(HandlerRunner);

	menuItem = input.required<MenuItemModel>();

	insertIcon = faPlus;
	deleteIcon = faTrash;
	editIcon = faPenToSquare;
	refreshIcon = faRotateRight;
	filterIcon = faFilter;

	formDrawerMode = signal<FormDrawerMode | null>(null);
	formOptions = signal<FormInputOption[]>([]);
	formOptionsLoading = signal(false);
	formOptionsError = signal<string>("");

	metaData = {
		insert: {
			title: "Insert row",
			submit: "Insert",
			formOptions: (params: RuntimeMenuItemParams) => createInsertFormOptions(params, this.handlerRunner.run),
		},
		criteria: {
			title: "Retrieval criteria",
			submit: "Retrieve",
			formOptions: (params: RuntimeMenuItemParams) => createCriteriaFormOptions(params, this.handlerRunner.run),
		},
		update: {
			title: "Update row",
			submit: "Update",
			formOptions: (params: RuntimeMenuItemParams) => createUpdateFormOptions(params, this.handlerRunner.run),
		},
	};

	formTitle = computed(() => this.metaData[this.formDrawerMode() ?? "criteria"].title);
	formSubmitLabel = computed(() => this.metaData[this.formDrawerMode() ?? "criteria"].submit);

	gridOptions = computed<GridOptions<Row>>(() => {
		const params = this.menuItem().params;
		return params ? createGridOptions(params, []) : { columnDefs: [], rowData: [] };
	});

	async openFormDrawer(mode: FormDrawerMode): Promise<void> {
		const params = this.menuItem().params;

		this.formDrawerMode.set(mode);
		this.formOptions.set([]);
		this.formOptionsError.set("");
		this.formOptionsLoading.set(true);

		if (!params) {
			this.formOptionsLoading.set(false);
			this.formOptionsError.set("This menu item does not contain form metadata.");
			return;
		}

		try {
			this.formOptions.set(await this.metaData[mode].formOptions(params));
		} catch (error) {
			this.formOptionsError.set(error instanceof Error ? error.message : String(error));
		} finally {
			this.formOptionsLoading.set(false);
		}
	}

	closeFormDrawer(): void {
		this.formDrawerMode.set(null);
		this.formOptionsLoading.set(false);
		this.formOptionsError.set("");
	}

	submitForm(result: FormResult): void {
		console.log(result);
	}
}
