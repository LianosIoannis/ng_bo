import { Component, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { catchError, of } from "rxjs";
import { Menu } from "./libraries/menu/menu";
import { MenuLoader } from "./services/menu-loader";

@Component({
	selector: "app-root",
	imports: [Menu, FaIconComponent],
	templateUrl: "./app.html",
	host: {
		"(keydown.escape)": "closeMenu()",
	},
})
export class App {
	menuLoader = inject(MenuLoader);

	menuIcon = faBars;
	menuOpen = signal(false);
	menuData = toSignal(this.menuLoader.loadMenu().pipe(catchError(() => of(null))), {
		initialValue: undefined,
	});

	menuDataEffect = effect(() => {
		console.dir(this.menuData());
	});

	openMenu() {
		this.menuOpen.set(true);
	}

	closeMenu() {
		if (!this.menuOpen()) {
			return;
		}

		this.menuOpen.set(false);
	}
}
