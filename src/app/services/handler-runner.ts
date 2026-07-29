import { inject, Service } from "@angular/core";
import type { HandlerInput, HandlerResult, RuntimeHandler } from "../models/menu-item-params.runtime.models";
import { replaceQueryPlaceholders } from "../utils/query-placeholders";
import { QueryRunner } from "./query-runner";

@Service()
export class HandlerRunner {
	private queryRunner = inject(QueryRunner);

	async run(handler: RuntimeHandler, context: HandlerInput = {}): Promise<HandlerResult> {
		try {
			switch (handler.kind) {
				case "query":
					return await this.queryRunner.runQuery(replaceQueryPlaceholders(handler.src, context));
				case "function-query":
					return await this.queryRunner.runQuery(replaceQueryPlaceholders(await handler.src(context), context));
				case "function-data":
					return await handler.src(context);
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
