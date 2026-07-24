import type { RuntimeMenuItemParams } from "./menu-item-params.runtime.models";

export type MenuItemKind = "FOLDER" | "ITEM";

export type MenuItemModel = {
	id: string;
	text: string;
	icon: string;
	iconColor: string;
	order?: number;
	params?: RuntimeMenuItemParams;
	kind: MenuItemKind;
	items: MenuItemModel[];
};
