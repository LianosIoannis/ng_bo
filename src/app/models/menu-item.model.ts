export type MenuItemKind = "FOLDER" | "ITEM";

export type MenuItemModel = {
	id: string;
	text: string;
	icon: string;
	iconColor: string;
	order?: number;
	kind: MenuItemKind;
	items: MenuItemModel[];
};
