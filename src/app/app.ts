import { Component, inject, signal } from "@angular/core";
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
	private readonly menuLoader = inject(MenuLoader);

	protected readonly menuIcon = faBars;
	protected readonly menuOpen = signal(false);
	protected readonly menuData = toSignal(this.menuLoader.loadMenu().pipe(catchError(() => of(null))), {
		initialValue: undefined,
	});

	protected openMenu() {
		this.menuOpen.set(true);
	}

	protected closeMenu() {
		if (!this.menuOpen()) {
			return;
		}

		this.menuOpen.set(false);
	}
}
