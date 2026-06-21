import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import type { MenuItemModel } from "../../../models/menu-item.model";
import { FaIconRegistry } from "../../../services/fa-icon-registry";

@Component({
	selector: "menu-item",
	imports: [FaIconComponent],
	templateUrl: "./menu-item.html",
})
export class MenuItem {
	menuItem = input.required<MenuItemModel>();
	filtered = input.required<boolean>();
	onItemClicked = output<MenuItemModel>();

	faIconRegistry = inject(FaIconRegistry);

	menuClosed = signal<boolean>(false);
	menuClosedEffect = effect(() => {
		this.menuClosed.set(!this.filtered());
	});

	faIcon = computed(() => this.menuItem().icon || "cog");

	itemClicked() {
		if (this.menuItem().isFolder) {
			this.menuClosed.update((menuClosed) => !menuClosed);
		} else {
			this.onItemClicked.emit(this.menuItem());
		}
	}

	childClicked(childItem: MenuItemModel) {
		this.onItemClicked.emit(childItem);
	}
}
