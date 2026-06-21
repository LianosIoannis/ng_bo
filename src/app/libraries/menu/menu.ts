import { Component, computed, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import type { MenuDataModel } from "../../models/menu.model";
import type { MenuItemModel } from "../../models/menu-item.model";
import { menuDataFiltered, sortMenuItems } from "./menu.utils";
import { MenuItem } from "./menu-item/menu-item";

@Component({
	selector: "menu",
	imports: [MenuItem, FormsModule, FontAwesomeModule],
	templateUrl: "./menu.html",
	host: {
		class: "block h-full min-h-0 w-full",
	},
})
export class Menu {
	menuData = input<MenuDataModel>({} as MenuDataModel);

	filter = signal("");

	onItemClicked = output<MenuItemModel>();
	onCloseClicked = output();
	onLogoutClicked = output();
	onProfileClicked = output();

	itemClicked(menuItem: MenuItemModel) {
		this.onItemClicked.emit(menuItem);
	}

	closeClicked() {
		this.onCloseClicked.emit();
	}

	logoutClicked() {
		this.onLogoutClicked.emit();
	}

	profileClicked() {
		this.onProfileClicked.emit();
	}

	menuDataSorted = computed(() => sortMenuItems(this.menuData().menuItems));

	filteredItems = computed(() => menuDataFiltered(this.menuDataSorted(), this.filter()));
}
