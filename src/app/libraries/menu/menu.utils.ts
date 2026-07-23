import type { MenuItemModel } from "../../models/menu-item.model";

export function sortMenuItems(menuData: MenuItemModel[]): MenuItemModel[] {
	return menuData
		.map((menuItem, index) => ({ menuItem, index }))
		.sort((a, b) => {
			const orderDiff = (b.menuItem.order ?? Number.MIN_SAFE_INTEGER) - (a.menuItem.order ?? Number.MIN_SAFE_INTEGER);

			return orderDiff || a.index - b.index;
		})
		.map(({ menuItem }) => ({
			...menuItem,
			items: menuItem.kind === "FOLDER" ? sortMenuItems(menuItem.items) : menuItem.items,
		}));
}

export function menuDataFiltered(menuData: MenuItemModel[], filter: string) {
	const filterToLowerCase = filter.toLowerCase();

	return menuData.reduce((result: MenuItemModel[], currMenuItem: MenuItemModel) => {
		const filteredKids = currMenuItem.kind === "FOLDER" ? menuDataFiltered(currMenuItem.items, filter) : [];

		const itemIncludesFilter = (item: MenuItemModel): boolean => {
			return (
				filterToLowerCase === "" ||
				(item.kind === "ITEM" && item.text.toLowerCase().includes(filterToLowerCase)) ||
				(item.kind === "FOLDER" && item.items.some((item) => itemIncludesFilter(item))) ||
				false
			);
		};

		const matches = itemIncludesFilter(currMenuItem);

		if (matches || filteredKids.length) {
			result.push({
				...currMenuItem,
				...(currMenuItem.kind === "FOLDER" ? { items: filteredKids } : {}),
			});
		}

		return result;
	}, [] as MenuItemModel[]);
}
