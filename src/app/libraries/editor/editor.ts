import {
	type AfterViewInit,
	Component,
	type ElementRef,
	effect,
	inject,
	input,
	model,
	type OnDestroy,
	output,
	viewChild,
} from "@angular/core";
import * as monaco from "monaco-editor";
import { format } from "sql-formatter";
import type { EditorLang } from "../../models/editor-lang.model";
import { MonacoService } from "./monaco-service";

@Component({
	selector: "editor",
	imports: [],
	templateUrl: "./editor.html",
	host: {
		class: "block h-full w-full",
	},
})
export class Editor implements AfterViewInit, OnDestroy {
	private monacoWorkerService = inject(MonacoService);

	private editorRef = viewChild.required<ElementRef<HTMLDivElement>>("editorRef");
	private editor?: monaco.editor.IStandaloneCodeEditor;
	private editorChangeSubscription?: monaco.IDisposable;
	private editorBlurSubscription?: monaco.IDisposable;

	value = model<string>("");
	language = input<EditorLang>("plaintext");
	readonly = input(false);
	blur = output<void>();

	private langEffect = effect(() => {
		const editor = this.editor;
		const language = this.language();

		if (!editor) {
			return;
		}

		const model = editor.getModel();

		if (model) {
			monaco.editor.setModelLanguage(model, language);
		}
	});

	private valueEffect = effect(() => {
		const editor = this.editor;
		const value = this.value();

		if (!editor) {
			return;
		}

		if (value !== editor.getValue()) {
			editor.setValue(value);
		}
	});

	private readonlyEffect = effect(() => {
		const editor = this.editor;
		const readonly = this.readonly();

		if (!editor) {
			return;
		}

		editor.updateOptions({ readOnly: readonly });
	});

	private formatCode = async () => {
		const editor = this.editor;

		if (!editor) {
			return;
		}

		const language = this.language();

		if (language === "sql") {
			const formatted = format(editor.getValue(), { language: "tsql" });
			editor.setValue(formatted);
			return;
		}

		await editor.getAction("editor.action.formatDocument")?.run();
	};

	ngAfterViewInit() {
		this.monacoWorkerService.initializeWorkers();

		this.editor = monaco.editor.create(this.editorRef().nativeElement, {
			value: this.value(),
			language: this.language(),
			theme: "vs-dark",
			automaticLayout: true,
			minimap: { enabled: false },
			ariaLabel: "Code editor",
			readOnly: this.readonly(),
		});

		this.editor.addAction({
			id: "format-code",
			label: "Format Code",
			keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
			run: this.formatCode,
		});

		this.editorChangeSubscription = this.editor.onDidChangeModelContent(() => {
			if (!this.editor) {
				return;
			}
			this.value.set(this.editor.getValue());
		});

		this.editorBlurSubscription = this.editor.onDidBlurEditorWidget(() => {
			this.blur.emit();
		});
	}

	ngOnDestroy() {
		this.langEffect.destroy();
		this.valueEffect.destroy();
		this.readonlyEffect.destroy();
		this.editorChangeSubscription?.dispose();
		this.editorBlurSubscription?.dispose();
		this.editor?.getModel()?.dispose();
		this.editor?.dispose();
	}
}
