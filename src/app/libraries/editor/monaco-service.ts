import { Service } from "@angular/core";

@Service()
export class MonacoService {
	private workersInitialized = false;

	initializeWorkers() {
		if (this.workersInitialized) {
			return;
		}

		window.MonacoEnvironment = {
			getWorker: (_: string, label: string) => {
				const workerMap: Record<string, () => Worker> = {
					json: () =>
						new Worker(
							new URL("../../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url),
							{
								type: "module",
							},
						),
					css: () =>
						new Worker(
							new URL("../../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url),
							{ type: "module" },
						),
					scss: () =>
						new Worker(
							new URL("../../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url),
							{ type: "module" },
						),
					less: () =>
						new Worker(
							new URL("../../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url),
							{ type: "module" },
						),
					html: () =>
						new Worker(
							new URL("../../../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js", import.meta.url),
							{
								type: "module",
							},
						),
					typescript: () =>
						new Worker(
							new URL(
								"../../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
								import.meta.url,
							),
							{
								type: "module",
							},
						),
					javascript: () =>
						new Worker(
							new URL(
								"../../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
								import.meta.url,
							),
							{
								type: "module",
							},
						),
				};

				return (
					workerMap[label]?.() ??
					new Worker(
						new URL("../../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
						{ type: "module" },
					)
				);
			},
		};

		this.workersInitialized = true;
	}
}
