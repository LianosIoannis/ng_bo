import { computed, Service, signal } from "@angular/core";
import type { FormResult } from "../models/form.models";
import type { MenuItemModel } from "../models/menu-item.model";
import type { Row } from "../models/menu-item-params.runtime.models";

export type WorkspaceFlow = "retrieve" | "filter" | "insert" | "update" | "delete";
export type WorkspaceDrawer = "criteria" | "insert" | "update";

@Service({ autoProvided: false })
export class WorkspaceService {
	readonly menuItem = signal<MenuItemModel | null>(null);
	readonly rows = signal<Row[]>([]);
	readonly selectedRow = signal<Row | null>(null);

	readonly retrieveCriteria = signal<FormResult | null>(null);
	readonly insertData = signal<FormResult | null>(null);
	readonly updateData = signal<FormResult | null>(null);

	readonly retrieveError = signal<string | null>(null);
	readonly insertError = signal<string | null>(null);
	readonly updateError = signal<string | null>(null);
	readonly deleteError = signal<string | null>(null);

	readonly activeFlow = signal<WorkspaceFlow | null>(null);

	readonly retrieveCriteriaExist = computed(() =>
		this.menuItem()?.params?.columns.some(
			(column) => column.retrieve.enabled && column.retrieve.criteria.enabled,
		) ?? false,
	);

	readonly requiredRetrieveCriteriaExist = computed(() =>
		this.menuItem()?.params?.columns.some(
			(column) =>
				column.retrieve.enabled &&
				column.retrieve.criteria.enabled &&
				column.retrieve.criteria.required,
		) ?? false,
	);

	readonly insertDataOptionsExist = computed(() =>
		this.menuItem()?.params?.columns.some((column) => column.insert.enabled) ?? false,
	);

	readonly updateDataOptionsExist = computed(() =>
		this.menuItem()?.params?.columns.some((column) => column.update.enabled) ?? false,
	);

	readonly savedRetrieveCriteriaExist = computed(() => this.retrieveCriteria() !== null);
	readonly insertDataExist = computed(() => this.insertData() !== null);
	readonly updateDataExist = computed(() => this.updateData() !== null);

	readonly possibilities = computed(() => {
		const params = this.menuItem()?.params;
		const rowSelected = this.selectedRow() !== null;

		return {
			retrieve: Boolean(params),
			filter: Boolean(params) && this.retrieveCriteriaExist(),
			insert: Boolean(params?.permissions.insert) && this.insertDataOptionsExist(),
			update: Boolean(params?.permissions.update) && this.updateDataOptionsExist() && rowSelected,
			delete: Boolean(params?.permissions.delete) && rowSelected,
		};
	});

	readonly drawer = computed<WorkspaceDrawer | null>(() => {
		switch (this.activeFlow()) {
			case "retrieve":
				return this.requiredRetrieveCriteriaExist() && !this.savedRetrieveCriteriaExist()
					? "criteria"
					: null;
			case "filter":
				return this.possibilities().filter ? "criteria" : null;
			case "insert":
				return this.possibilities().insert && (!this.insertDataExist() || this.insertError())
					? "insert"
					: null;
			case "update":
				return this.possibilities().update && (!this.updateDataExist() || this.updateError())
					? "update"
					: null;
			default:
				return null;
		}
	});

	initialize(menuItem: MenuItemModel): void {
		this.menuItem.set(menuItem);
		this.rows.set([]);
		this.selectedRow.set(null);
		this.retrieveCriteria.set(null);
		this.insertData.set(null);
		this.updateData.set(null);
		this.retrieveError.set(null);
		this.insertError.set(null);
		this.updateError.set(null);
		this.deleteError.set(null);
		this.activeFlow.set("retrieve");
	}
}
