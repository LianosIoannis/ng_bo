import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import type { MenuDataModel } from "../models/menu.model";

@Service()
export class MenuLoader {
	private readonly http = inject(HttpClient);
	private readonly menuCode = "admin";
	private readonly apiUrl = "http://localhost:3000/api/menus";

	loadMenu() {
		return this.http.get<MenuDataModel | null>(`${this.apiUrl}/${this.menuCode}/json`);
	}
}
