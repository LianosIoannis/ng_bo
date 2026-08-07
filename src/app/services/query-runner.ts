import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { HandlerResult } from "../models/menu-item-params.runtime.models";

@Service()
export class QueryRunner {
	private http = inject(HttpClient);
	private apiUrl = "http://localhost:3000/api/query";

	historyResults: HandlerResult[] = [];

	private run(queryString: string) {
		return this.http.post<HandlerResult>(this.apiUrl, { queryString });
	}

	async runQuery(queryString: string): Promise<HandlerResult> {
		try {
			const result = await firstValueFrom(this.run(queryString));
			this.historyResults.push(result);
			return result;
		} catch (error) {
			const result: HandlerResult = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			this.historyResults.push(result);
			return result;
		}
	}
}
