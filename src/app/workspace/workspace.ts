import { Component, computed, inject, input, signal } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faPenToSquare, faPlus, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { GridOptions } from "ag-grid-community";
import { Agtable } from "../libraries/agtable/agtable";
import { Form } from "../libraries/form/form";
import type { FormInputOption, FormResult } from "../models/form.models";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row } from "../models/menu-item-params.runtime.models";
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
	private readonly handlerRunner = inject(HandlerRunner);

	menuItem = input.required<MenuItemModel>();

	insertIcon = faPlus;
	deleteIcon = faTrash;
	editIcon = faPenToSquare;
	refreshIcon = faRotateRight;

	formDrawerMode = signal<FormDrawerMode | null>(null);
	formOptions = signal<FormInputOption[]>([]);
	formOptionsLoading = signal(false);
	formOptionsError = signal<string | null>(null);

	formDrawerTitle = computed(() => {
		switch (this.formDrawerMode()) {
			case "insert":
				return "Insert row";
			case "criteria":
				return "Retrieval criteria";
			case "update":
				return "Update row";
			default:
				return "";
		}
	});

	formSubmitLabel = computed(() => {
		switch (this.formDrawerMode()) {
			case "insert":
				return "Insert";
			case "criteria":
				return "Retrieve";
			case "update":
				return "Update";
			default:
				return "Submit";
		}
	});

	gridOptions = computed<GridOptions<Row>>(() => {
		const params = this.menuItem().params;

		return params ? createGridOptions(params, []) : { columnDefs: [], rowData: [] };
	});

	async openFormDrawer(mode: FormDrawerMode): Promise<void> {
		const params = this.menuItem().params;

		this.formDrawerMode.set(mode);
		this.formOptions.set([]);
		this.formOptionsError.set(null);
		this.formOptionsLoading.set(true);

		if (!params) {
			this.formOptionsLoading.set(false);
			this.formOptionsError.set("This menu item does not contain form metadata.");
			return;
		}

		const runHandler = this.handlerRunner.run.bind(this.handlerRunner);

		try {
			this.formOptions.set(await this.loadFormOptions(mode, params, runHandler));
		} catch (error) {
			this.formOptionsError.set(error instanceof Error ? error.message : String(error));
		} finally {
			this.formOptionsLoading.set(false);
		}
	}

	closeFormDrawer(): void {
		this.formDrawerMode.set(null);
		this.formOptionsLoading.set(false);
		this.formOptionsError.set(null);
	}

	submitForm(result: FormResult): void {
		console.log(`${this.formDrawerTitle()} form result:`, result);
	}

	private loadFormOptions(
		mode: FormDrawerMode,
		params: NonNullable<MenuItemModel["params"]>,
		runHandler: HandlerRunner["run"],
	): Promise<FormInputOption[]> {
		switch (mode) {
			case "insert":
				return createInsertFormOptions(params, runHandler);
			case "criteria":
				return createCriteriaFormOptions(params, runHandler);
			case "update":
				return createUpdateFormOptions(params, runHandler);
		}
	}
}
