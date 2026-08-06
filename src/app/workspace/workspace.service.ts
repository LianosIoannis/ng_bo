import { computed, inject, Service, signal } from "@angular/core";
import type { FormResult } from "../models/form.models";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row } from "../models/menu-item-params.runtime.models";
import { HandlerRunner } from "../services/handler-runner";
import { createMutationHandlerInput, createRetrieveHandlerInput } from "../utils/form-result";

export type WorkspaceFlow = "retrieve" | "filter" | "insert" | "update" | "delete";
export type WorkspaceDrawer = "criteria" | "insert" | "update";

@Service({ autoProvided: false })
export class WorkspaceService {
	handlerRunner = inject(HandlerRunner);

	readonly menuItem = signal<MenuItemModel | null>(null);
	readonly rows = signal<Row[]>([]);
	readonly selectedRow = signal<Row | null>(null);
	readonly retrieveLoading = signal(false);
	readonly insertLoading = signal(false);
	readonly updateLoading = signal(false);
	readonly deleteLoading = signal(false);

	readonly retrieveCriteria = signal<FormResult | null>(null);
	readonly insertData = signal<FormResult | null>(null);
	readonly updateData = signal<FormResult | null>(null);

	readonly retrieveError = signal<string | null>(null);
	readonly insertError = signal<string | null>(null);
	readonly updateError = signal<string | null>(null);
	readonly deleteError = signal<string | null>(null);

	readonly activeFlow = signal<WorkspaceFlow | null>(null);
	private retrieveGeneration = 0;
	private operationGeneration = 0;

	readonly retrieveCriteriaExist = computed(
		() =>
			this.menuItem()?.params?.columns.some((column) => column.retrieve.enabled && column.retrieve.criteria.enabled) ??
			false,
	);

	readonly requiredRetrieveCriteriaExist = computed(
		() =>
			this.menuItem()?.params?.columns.some(
				(column) => column.retrieve.enabled && column.retrieve.criteria.enabled && column.retrieve.criteria.required,
			) ?? false,
	);

	readonly insertDataOptionsExist = computed(
		() => this.menuItem()?.params?.columns.some((column) => column.insert.enabled) ?? false,
	);

	readonly updateDataOptionsExist = computed(
		() => this.menuItem()?.params?.columns.some((column) => column.update.enabled) ?? false,
	);

	readonly savedRetrieveCriteriaExist = computed(() => this.retrieveCriteria() !== null);
	readonly insertDataExist = computed(() => this.insertData() !== null);
	readonly updateDataExist = computed(() => this.updateData() !== null);
	readonly mutationLoading = computed(() => this.insertLoading() || this.updateLoading() || this.deleteLoading());

	readonly possibilities = computed(() => {
		const params = this.menuItem()?.params;
		const rowSelected = this.selectedRow() !== null;
		const busy = this.retrieveLoading() || this.mutationLoading();

		return {
			retrieve: Boolean(params) && !busy,
			filter: Boolean(params) && this.retrieveCriteriaExist() && !busy,
			insert: Boolean(params?.permissions.insert) && this.insertDataOptionsExist() && !busy,
			update: Boolean(params?.permissions.update) && this.updateDataOptionsExist() && rowSelected && !busy,
			delete: Boolean(params?.permissions.delete) && rowSelected && !busy,
		};
	});

	readonly drawer = computed<WorkspaceDrawer | null>(() => {
		switch (this.activeFlow()) {
			case "retrieve":
				return this.requiredRetrieveCriteriaExist() && !this.savedRetrieveCriteriaExist() ? "criteria" : null;
			case "filter":
				return this.possibilities().filter ? "criteria" : null;
			case "insert":
				return this.possibilities().insert && (!this.insertDataExist() || this.insertError()) ? "insert" : null;
			case "update":
				return this.possibilities().update && (!this.updateDataExist() || this.updateError()) ? "update" : null;
			default:
				return null;
		}
	});

	readonly deleteConfirmation = computed(() => this.activeFlow() === "delete" && this.selectedRow() !== null);

	initialize(menuItem: MenuItemModel): void {
		this.retrieveGeneration++;
		this.operationGeneration++;
		this.menuItem.set(menuItem);
		this.rows.set([]);
		this.selectedRow.set(null);
		this.retrieveLoading.set(false);
		this.insertLoading.set(false);
		this.updateLoading.set(false);
		this.deleteLoading.set(false);
		this.retrieveCriteria.set(null);
		this.insertData.set(null);
		this.updateData.set(null);
		this.retrieveError.set(null);
		this.insertError.set(null);
		this.updateError.set(null);
		this.deleteError.set(null);
		this.activeFlow.set("retrieve");

		void this.retrieve();
	}

	async retrieve(): Promise<void> {
		const menuItem = this.menuItem();
		const params = menuItem?.params;

		if (!params) {
			this.retrieveError.set("This menu item does not contain retrieval metadata.");
			this.activeFlow.set(null);
			return;
		}

		if (this.requiredRetrieveCriteriaExist() && !this.savedRetrieveCriteriaExist()) {
			this.activeFlow.set("retrieve");
			return;
		}

		const generation = ++this.retrieveGeneration;
		this.retrieveLoading.set(true);
		this.retrieveError.set(null);

		const result = await this.handlerRunner.run(
			params.handlers.select,
			createRetrieveHandlerInput(this.retrieveCriteria()),
		);

		if (generation !== this.retrieveGeneration || menuItem !== this.menuItem()) {
			return;
		}

		if (result.success) {
			this.rows.set(result.data);
		} else {
			this.retrieveError.set(result.error);
		}

		this.retrieveLoading.set(false);
		this.activeFlow.set(null);
	}

	async submitRetrieveCriteria(criteria: FormResult): Promise<void> {
		this.retrieveCriteria.set(criteria);
		this.activeFlow.set("retrieve");
		await this.retrieve();
	}

	startFilter(): void {
		this.activeFlow.set("filter");
	}

	selectRow(row: Row | null): void {
		this.selectedRow.set(row);
	}

	startInsert(): void {
		if (!this.possibilities().insert) {
			return;
		}

		this.insertData.set(null);
		this.insertError.set(null);
		this.activeFlow.set("insert");
	}

	startUpdate(): void {
		if (!this.possibilities().update) {
			return;
		}

		this.updateData.set(null);
		this.updateError.set(null);
		this.activeFlow.set("update");
	}

	async submitInsert(data: FormResult): Promise<void> {
		const menuItem = this.menuItem();
		const params = menuItem?.params;

		if (!params) {
			this.insertError.set("This menu item does not contain insert metadata.");
			return;
		}

		this.insertData.set(data);
		const generation = ++this.operationGeneration;
		this.insertLoading.set(true);
		this.insertError.set(null);

		const result = await this.handlerRunner.run(params.handlers.insert, createMutationHandlerInput(data));

		if (generation !== this.operationGeneration || menuItem !== this.menuItem()) {
			return;
		}

		this.insertLoading.set(false);

		if (!result.success) {
			this.insertError.set(result.error);
			return;
		}

		this.insertData.set(null);
		this.activeFlow.set("retrieve");
		await this.retrieve();
	}

	async submitUpdate(data: FormResult): Promise<void> {
		const menuItem = this.menuItem();
		const params = menuItem?.params;
		const selectedRow = this.selectedRow();

		if (!params || !selectedRow) {
			this.updateError.set("Select a row before updating.");
			return;
		}

		this.updateData.set(data);
		const generation = ++this.operationGeneration;
		this.updateLoading.set(true);
		this.updateError.set(null);

		const result = await this.handlerRunner.run(params.handlers.update, createMutationHandlerInput(data, selectedRow));

		if (generation !== this.operationGeneration || menuItem !== this.menuItem()) {
			return;
		}

		this.updateLoading.set(false);

		if (!result.success) {
			this.updateError.set(result.error);
			return;
		}

		this.updateData.set(null);
		this.selectedRow.set(null);
		this.activeFlow.set("retrieve");
		await this.retrieve();
	}

	startDelete(): void {
		if (!this.possibilities().delete) {
			return;
		}

		this.deleteError.set(null);
		this.activeFlow.set("delete");
	}

	async deleteSelected(): Promise<void> {
		const menuItem = this.menuItem();
		const params = menuItem?.params;
		const selectedRow = this.selectedRow();

		if (!params || !selectedRow) {
			this.deleteError.set("Select a row before deleting.");
			this.activeFlow.set(null);
			return;
		}

		const generation = ++this.operationGeneration;
		this.deleteLoading.set(true);
		this.deleteError.set(null);

		const result = await this.handlerRunner.run(params.handlers.delete, selectedRow);

		if (generation !== this.operationGeneration || menuItem !== this.menuItem()) {
			return;
		}

		this.deleteLoading.set(false);

		if (!result.success) {
			this.deleteError.set(result.error);
			this.activeFlow.set(null);
			return;
		}

		this.selectedRow.set(null);
		this.activeFlow.set("retrieve");
		await this.retrieve();
	}

	refresh(): void {
		this.activeFlow.set("retrieve");
		void this.retrieve();
	}

	cancelFlow(): void {
		if (!this.mutationLoading()) {
			this.activeFlow.set(null);
		}
	}
}
