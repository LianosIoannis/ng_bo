import { inject, Service } from "@angular/core";
import { FaIconLibrary } from "@fortawesome/angular-fontawesome";
import { fas } from "@fortawesome/free-solid-svg-icons";

@Service()
export class FaIconRegistry {
	private readonly iconLibrary = inject(FaIconLibrary);

	constructor() {
		this.iconLibrary.addIconPacks(fas);
	}
}
