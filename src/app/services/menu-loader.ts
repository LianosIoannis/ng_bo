import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { map } from "rxjs";
import type { MenuDataModel } from "../models/menu.model";
import type { MenuItemModel } from "../models/menu-item.model";
import type { MenuItemParams } from "../models/menu-item-params.models";
import { transformMenuItemParams } from "../utils/menu-item-params.transformer";

type MenuItemResponse = Omit<MenuItemModel, "items" | "params"> & {
	params: MenuItemParams | null;
	items: MenuItemResponse[];
};

type MenuResponse = Omit<MenuDataModel, "menuItems"> & {
	menuItems: MenuItemResponse[];
};

@Service()
export class MenuLoader {
	private readonly http = inject(HttpClient);
	private readonly menuCode = "organization";
	private readonly apiUrl = "http://localhost:3000/api/menus";

	loadMenu() {
		return this.http.get<MenuResponse | null>(`${this.apiUrl}/${this.menuCode}/json`).pipe(
			map((menu) =>
				menu
					? {
							...menu,
							menuItems: menu.menuItems.map(transformMenuItem),
						}
					: null,
			),
		);
	}
}

function transformMenuItem(item: MenuItemResponse): MenuItemModel {
	const { items, params, ...menuItem } = item;

	return {
		...menuItem,
		...(params ? { params: transformMenuItemParams(params) } : {}),
		items: items.map(transformMenuItem),
	};
}
