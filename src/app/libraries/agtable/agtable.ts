import { Component, inject } from "@angular/core";
import { AgGridRegistry } from "../../services/ag-table-registry";

@Component({
	selector: "agtable",
	imports: [],
	templateUrl: "./agtable.html",
})
export class Agtable {
  agGridRegistry = inject(AgGridRegistry);

  
}
