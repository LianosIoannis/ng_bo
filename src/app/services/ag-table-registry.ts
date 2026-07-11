import { Service } from "@angular/core";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

@Service()
export class AgGridRegistry {
	private modulesRegistered = false;

	initializeModules() {
		if (this.modulesRegistered) {
			return;
		}

		ModuleRegistry.registerModules([AllCommunityModule]);

		this.modulesRegistered = true;
	}
}
