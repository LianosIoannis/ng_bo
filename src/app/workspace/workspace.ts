import { Component, computed, effect, inject, input, untracked } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faFilter, faPenToSquare, faPlus, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { GridOptions } from "ag-grid-community";
import { Agtable } from "../libraries/agtable/agtable";
import { ConfirmationDialog } from "../libraries/confirmation-dialog/confirmation-dialog";
import { Form } from "../libraries/form/form";
import type { FormInputOption, FormResult } from "../models/form.models";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row, RuntimeMenuItemParams } from "../models/menu-item-params.runtime.models";
import { createCriteriaFormOptions, createInsertFormOptions, createUpdateFormOptions } from "../utils/form-options";
import { createGridOptions } from "../utils/grid-options";
import { WorkspaceService } from "./workspace.service";

type FormDrawerMode = "insert" | "criteria" | "update";

@Component({
	selector: "app-workspace",
	imports: [Agtable, ConfirmationDialog, FaIconComponent, Form],
	providers: [WorkspaceService],
	templateUrl: "./workspace.html",
	host: {
		class: "block h-full min-h-0",
		"(keydown.escape)": "closeFormDrawer()",
	},
})
export class Workspace {
	workspace = inject(WorkspaceService);

	menuItem = input.required<MenuItemModel>();

	insertIcon = faPlus;
	deleteIcon = faTrash;
	editIcon = faPenToSquare;
	refreshIcon = faRotateRight;
	filterIcon = faFilter;

	initializeEffect = effect(() => {
		const menuItem = this.menuItem();
		untracked(() => this.workspace.initialize(menuItem));
	});

	metaData = {
		insert: {
			title: "Insert row",
			submit: "Insert",
			formOptions: (params: RuntimeMenuItemParams) => createInsertFormOptions(params, this.workspace.insertData()),
		},
		criteria: {
			title: "Retrieval criteria",
			submit: "Retrieve",
			formOptions: (params: RuntimeMenuItemParams) =>
				createCriteriaFormOptions(params, this.workspace.retrieveCriteria()),
		},
		update: {
			title: "Update row",
			submit: "Update",
			formOptions: (params: RuntimeMenuItemParams) =>
				createUpdateFormOptions(params, this.workspace.selectedRow(), this.workspace.updateData()),
		},
	};

	formDrawerMode = this.workspace.drawer;

	formOptions = computed<FormInputOption[]>(() => {
		const mode = this.formDrawerMode();
		const params = this.menuItem().params;

		return mode && params ? this.metaData[mode].formOptions(params) : [];
	});

	formTitle = computed(() => this.metaData[this.formDrawerMode() ?? "criteria"].title);
	formSubmitLabel = computed(() => this.metaData[this.formDrawerMode() ?? "criteria"].submit);
	interactionBlocked = computed(
		() => this.formDrawerMode() !== null || this.workspace.deleteConfirmation() || this.workspace.mutationLoading(),
	);
	workspaceError = computed(
		() =>
			this.workspace.insertError() ??
			this.workspace.updateError() ??
			this.workspace.deleteError() ??
			this.workspace.retrieveError(),
	);
	deleteMessage = computed(() => `Delete the selected row from ${this.menuItem().params?.tableName ?? "this table"}?`);

	gridOptions = computed<GridOptions<Row>>(() => {
		const params = this.menuItem().params;
		return params
			? {
					...createGridOptions(params, this.workspace.rows()),
					loading: this.workspace.retrieveLoading() || this.workspace.insertLoading() || this.workspace.updateLoading(),
				}
			: { columnDefs: [], rowData: [] };
	});

	openFormDrawer(mode: FormDrawerMode): void {
		switch (mode) {
			case "criteria":
				this.workspace.startFilter();
				break;
			case "insert":
				this.workspace.startInsert();
				break;
			case "update":
				this.workspace.startUpdate();
				break;
		}
	}

	closeFormDrawer(): void {
		this.workspace.cancelFlow();
	}

	submitForm(result: FormResult): void {
		switch (this.formDrawerMode()) {
			case "criteria":
				void this.workspace.submitRetrieveCriteria(result);
				break;
			case "insert":
				void this.workspace.submitInsert(result);
				break;
			case "update":
				void this.workspace.submitUpdate(result);
				break;
		}
	}

	refresh(): void {
		this.workspace.refresh();
	}

	deleteRow(): void {
		this.workspace.startDelete();
	}

	confirmDelete(): void {
		void this.workspace.deleteSelected();
	}

	selectRow(row: Row | null): void {
		this.workspace.selectRow(row);
	}
}
