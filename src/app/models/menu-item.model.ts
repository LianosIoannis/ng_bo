export type MenuItemModel = {
	id: string;
	text: string;
	icon: string;
	iconColor: string;
	order?: number;
	isFolder: boolean;
	items: MenuItemModel[];
};
