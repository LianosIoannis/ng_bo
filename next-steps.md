# Project Status and Next Steps

Last updated: 7 August 2026

## Project overview

This workspace contains two related applications:

- `ng_bo`: the Angular metadata-driven back-office client.
- `bo_db`: the backend that stores menu metadata and executes queries.

They are separate repositories, but their metadata contracts must remain aligned. Development is intentionally incremental: prefer small, understandable changes and discuss broader architectural changes before implementing them.

## What has been implemented

### Application shell and menu

The Angular application has a compact header, a Font Awesome menu button, a left-side menu drawer, and a workspace below the header. Selecting a menu item stores it in a signal, closes the menu, and displays the workspace.

`MenuLoader` currently loads the hardcoded `organization` menu from the backend and recursively transforms serialized parameters into runtime parameters. Menu entries use the backend `kind: "FOLDER" | "ITEM"` contract; the earlier frontend-only `isFolder` concept is no longer used.

### Metadata contracts

The frontend and backend are aligned conceptually for columns, retrieval criteria, mutations, runtime handlers, child relations, and operation-specific lookups:

```ts
type ColumnLookupParams = {
	criteria: LookupConfig;
	insert: LookupConfig;
	update: LookupConfig;
	grid: Omit<LookupConfig, "multiple" | "dependsOn">;
};
```

Criteria, insert, and update lookups carry `dependsOn: string[]`. Grid lookups do not use `multiple` or `dependsOn`. The backend metadata editor, validation, seed helpers, models, and transformer now support this shape.

Column data type and code language are separate concerns:

```ts
type DataColumnType = "boolean" | "date" | "datetime" | "number" | "text" | "time";
type ColumnType = DataColumnType | "code";
type CodeLanguage = "javascript" | "typescript" | "sql" | "plaintext" | "json" | "css";
```

- Each column carries a `language` value.
- Code fields always use the `equals` operator.
- Language names are no longer part of `Operator`.
- The duplicate frontend `EditorLang` model was removed.
- The generic editor and form editor use `CodeLanguage` from the menu-item parameter model.

### Query and handler execution

`QueryRunner` sends SQL to `POST /api/query`. It uses `firstValueFrom`, returns `Promise<HandlerResult>`, and converts request failures into failed results.

`HandlerRunner` provides one generic execution path:

- `query`: replace placeholders and call `QueryRunner`.
- `function-query`: execute the function, replace placeholders in its result, and call `QueryRunner`.
- `function-data`: execute the function and return its result.

Its `run` method is an arrow function, so it can safely be passed as a callback without manual binding.

### Query placeholder substitution

Queries can contain placeholders such as `@{columnName}`. The replacement utility iterates through the supplied context with `replaceAll`. It substitutes values only; metadata owns SQL operators, surrounding quotes, and query structure.

Current rules are:

- String apostrophes are escaped.
- Numbers are inserted directly.
- Booleans become `1` or `0` for SQL Server.
- `null` becomes `NULL`.
- Arrays become comma-separated, individually quoted values.

For automatic static retrieval, a placeholder without a usable criterion produces a clear error. Generic placeholder behavior for `undefined`, empty arrays, and nullable values in other handler contexts still needs explicit decisions.

### Grid options

`createGridOptions(params, rowData, gridLookupMaps)` maps runtime metadata, rows, and loaded lookup maps into AG Grid options. It currently supports visibility, sorting, filtering, pagination, single-row selection, content-based sizing, and these formatters:

- Date: `DD/MM/YYYY`.
- Date-time: `DD/MM/YYYY HH:mm`.
- Time: `HH:mm`.
- Code: first 30 characters.

Date, date-time, and time columns use AG Grid's `dateTimeString` cell data type.

Enabled grid lookups preserve the raw row value while displaying its label through `valueFormatter`. Their `filterValueGetter` also returns the label, and filterable lookup columns explicitly use AG Grid's text filter. Missing lookup entries fall back to the raw value, while `null` and `undefined` display as empty strings. Lookup matching is type-sensitive, and duplicate lookup values use the last returned label.

The AG Grid wrapper binds `columnDefs` and `rowData` explicitly in addition to `gridOptions`. This ensures that changing the selected menu item, retrieved rows, or loaded lookup maps refreshes the displayed columns and values.

### Generic forms and option builders

The shared Signal Forms component supports criteria, insert, update, range operators, lookup selects, multiple values, required and readonly fields, default values, configurable actions, and metadata-selected code languages. Its form model, operator options, and validation schema are created once in `ngOnInit`; the workspace destroys the form when the drawer closes so a newly opened form receives a fresh schema.

The option builders are synchronous and pure:

```ts
createCriteriaFormOptions(params, formData)
createInsertFormOptions(params, formData)
createUpdateFormOptions(params, rowData, formData)
```

They:

- Include only columns enabled for the requested operation.
- Pass operation-specific lookup handlers and `dependsOn` metadata to the Form.
- Pass `column.language` to code editors.
- Force code criteria to `equals`.
- Hide operators and use `equals` internally for insert and update forms.
- Restore saved retrieval operators, values, and range endpoints when the criteria drawer is reopened.
- Populate update fields from the selected row and prefer saved submitted data when reopening a failed mutation.
- Normalize date defaults for native date inputs with `value.slice(0, 10)`.

The Form now owns lookup execution through `HandlerRunner`:

- It creates a context containing the current value of every form field.
- Lookups without dependencies run immediately.
- Lookups with dependencies run only when every declared dependency has a value.
- The union of dependency values is debounced for 250 ms with Angular 22's `debounced()` API.
- A single effect reruns the lookup loader after the dependency context settles.
- Lookup handlers run concurrently and failed handlers produce a form-level error.
- Returned `{ value, label }` rows preserve `string | number` values and fall back to `String(value)` when a label is missing.
- An enabled lookup returning no rows remains an empty select.
- Values that are no longer present in refreshed lookup options are removed.
- A generation counter prevents an older lookup batch from replacing newer results.

`debounced()` is an Angular 22 experimental API. It replaced the earlier RxJS `toObservable`/`toSignal` and `debounceTime` pipeline and should be reviewed when Angular promotes or changes the API.

`createRetrieveHandlerInput(criteria)` now converts saved retrieval criteria into handler context. Non-empty values are exposed as flat properties for existing placeholders and function destructuring, while the complete `FormResult` is also available under `context.criteria` for handlers that need operators or range endpoints.

### Automatic static retrieve queries

`createRetrieveQuery(query, criteria)` uses the TransactSQL build of `node-sql-parser` for static `query` retrieval handlers. `function-query` and `function-data` handlers retain full responsibility for their output.

The utility:

- Captures placeholder names before replacement.
- Replaces existing placeholders using the established value-substitution rules.
- Finds submitted, non-empty criteria that were not already handled by placeholders.
- Parses only when unused criteria need to be added.
- Adds unused criteria to the outermost `SELECT` `WHERE`, combining them with an existing condition through `AND`.
- Supports all current operators for `SELECT`, including comparisons, `LIKE`, ranges, and lists.
- Supports single `EXEC` statements by adding unused criteria as named parameters.
- Allows only `equals` and `in` for generated procedure parameters.
- Replaces an existing procedure parameter case-insensitively or appends it when missing.
- Serializes procedure array values as one comma-separated string using `join(",")`.
- Escapes apostrophes, quotes generated string and date literals, and converts booleans to `1` or `0`.
- Rejects unresolved placeholders, unsupported statements, multiple statements, unions, incomplete ranges, and incompatible value/operator shapes with clear retrieval errors.

Prepared static queries run through `HandlerRunner` with an empty execution context, preventing submitted text that resembles a placeholder from being replaced a second time.

### Workspace component

The workspace receives a required `MenuItemModel` and contains:

- A thin right-aligned toolbar.
- Insert, delete, edit, filter, and refresh Font Awesome buttons.
- AG Grid below the toolbar.
- A right-side drawer shared by criteria, insert, and update forms.
- Computed form options derived from the service-selected drawer mode.
- `inert`, Escape, backdrop, and cancel behavior.
- Real row data from the select handler, AG Grid's loading overlay, and a retrieval error banner.
- AG Grid selection stored in `WorkspaceService.selectedRow`, with toolbar availability derived from metadata, permissions, and selection.
- Update form defaults populated from the selected row.
- An accessible reusable confirmation dialog for deletion.

`Workspace` provides `WorkspaceService` at component level. Its menu-item effect initializes the service inside `untracked()`, so service state reads cannot accidentally become dependencies of that effect. Drawer visibility, toolbar availability, rows, selection, loading, confirmation, and errors are derived from service signals. Criteria, insert, and update submissions, Refresh, and confirmed Delete execute their handlers.

### Workspace service and retrieval

`WorkspaceService` is a component-scoped service:

```ts
@Service({ autoProvided: false })
```

It is not root-provided because each future tab/workspace must own an independent state instance. `Workspace` now provides and injects it.

It defines explicit signals for the menu item, rows, selected row, retrieve criteria, insert data, update data, grid lookup maps, operation-specific loading and errors, and active flow. Computed state determines:

- Whether criteria and required criteria exist.
- Whether insert and update fields exist.
- Whether saved criteria or operation data exists.
- Which operations are possible.
- Which drawer should be displayed.

`initialize(menuItem)` resets state and starts the retrieve flow. Retrieval:

- Waits when required criteria are missing, allowing the computed drawer to request them.
- Runs the menu item's select handler through `HandlerRunner` when retrieval can proceed.
- Stores successful rows and exposes them to AG Grid.
- Stores failures without removing rows already displayed by a previous successful retrieval.
- Reuses saved criteria for Refresh.
- Restores saved criteria, including operators and range endpoints, when Filter is reopened.
- Automatically applies unused criteria to supported static `SELECT` and `EXEC` handlers.
- Uses a generation counter so results from an older menu item or request cannot replace current rows.
- Exposes `retrieveLoading` for AG Grid's native loading overlay and disables Refresh while loading.

Grid lookup handlers run concurrently through `HandlerRunner` and are converted into per-column value-label maps outside the pure grid mapper. They load on workspace initialization, explicit Refresh, and successful mutations. A separate generation counter prevents stale lookup results from updating another menu item. Lookup loading participates in the grid loading overlay and toolbar availability. If any lookup handler fails, the batch stores a visible error, clears the maps, and leaves the grid usable with raw values.

Delete uses the selected row as handler context. It requires explicit confirmation, blocks dismissal while running, clears selection and retrieves fresh rows on success, and stores the delete error without refreshing on failure. Its operation generation prevents a response from an older workspace item from changing current state.

Insert and update now follow the agreed flows. Submitted form values are exposed as flat handler properties and as the complete `data` object. Update context also includes the selected row, with submitted values taking precedence. Failed mutations retain their submitted data and reopen the populated form; successful mutations clear saved data, clear update selection when applicable, and retrieve fresh rows. Insert and update have independent loading and error signals.

### Agreed operation flows

```text
Retrieve success -> update rows
Retrieve failure -> store error and stop

Insert success -> clear insert data -> retrieve
Insert failure -> store error -> reopen populated insert form

Update success -> clear update data and selection -> retrieve
Update failure -> store error -> reopen populated update form

Delete success -> clear selection -> retrieve
Delete failure -> store error and stop
```

Retrieve can start from menu selection, criteria submission, refresh, or a successful mutation. It should use saved criteria, request the criteria drawer when required criteria are missing, and otherwise run the select handler. Filter always opens the criteria drawer and reloads saved values when present.

The UI should derive visibility from computed service state. Event handlers should update state or start a flow rather than imperatively coordinating unrelated UI elements.

### UI details completed

- The layout allows AG Grid to fill the available height.
- Explicit grid inputs refresh columns when the menu item changes.
- The earlier drawer focus/`aria-hidden` warning was removed.
- Font Awesome icons replaced custom menu-button spans.
- The multiple-select placeholder is vertically centered in the customized 44px control.
- Required Signal Form fields are validated on submission after the form tree is initialized in `ngOnInit`.
- The form drawer uses a container-scoped `ngx-spinner` while lookup handlers run.
- The spinner is controlled through a named `NgxSpinnerService` effect because version 21.1.0 ignores an initially true `showSpinner` input.
- Effect cleanup hides the spinner when loading finishes or the Form is destroyed.
- Spinner overlay animation is disabled to avoid its built-in 300 ms appearance delay; the loader animation remains enabled.
- `ngx-spinner` uses Angular's native animation support, so `provideAnimations()` is not configured.

## Current verification

- The Angular production build passes.
- A focused grid-options check confirms that both cell formatting and filtering return the lookup label while the row retains its raw value and the column uses `agTextColumnFilter`.
- The Angular build still reports the initial-bundle budget warning and CommonJS warnings for Day.js and `node-sql-parser/build/transactsql`.

## Important project constraints

### Change scope

- Make minimal, careful, incremental changes.
- Keep implementation straightforward while the architecture develops.
- Discuss complexity before introducing it.
- Ask approval before broad refactors, dependencies, schema changes, migrations, destructive operations, or major architecture changes.
- Preserve unrelated user work.

### Angular, TypeScript, and accessibility

- Use strict TypeScript and avoid `any`.
- Use standalone components, signals, `computed()`, `input()`, `output()`, and `inject()`.
- Prefer Signal Forms and native template control flow.
- Keep components and services focused.
- Keep workspace state component-scoped so future tabs can have independent instances.
- Meet WCAG AA and pass AXE checks.
- Preserve visible focus and never hide a focused element from assistive technology.
- Give icon-only buttons accessible names.
- Drawer focus entry and restoration still need implementation.

### Shared metadata contract

A contract change may require coordinated updates across backend models, validation, transformer, seeds, metadata editor, frontend models, transformer, utilities, forms, grid, and consumers. Inspect both repositories for impact, but edit only the repository explicitly in scope.

### Trusted execution and query ownership

The current design assumes a trusted internal application: metadata functions execute in the browser, the client constructs queries, and the backend executes submitted SQL.

- Placeholder substitution changes values only; metadata owns its operators, SQL structure, and outer quoting.
- For automatically generated static retrieve criteria, the client builds predicates or procedure parameters and the AST serializer owns their SQL syntax and quoting.
- Authorization, metadata trust, and query restrictions are required before broader exposure.
- Empty arrays, unresolved placeholders, missing values, and nullable quoted placeholders need decisions.
- Never reset or reseed a database without explicit approval.
- Never place secrets in client code or documentation.

## Clear next steps

### 1. Verify retrieval criteria end to end

- Exercise automatic criteria against representative real static `SELECT` and `EXEC` handlers.
- Verify placeholder-backed and automatically generated criteria together in the same query.
- Verify existing procedure-parameter replacement, appended parameters, array joining, dates, booleans, and apostrophes.
- Confirm that unsupported operators for procedures and unresolved placeholders produce useful UI errors.
- Decide whether `%` and `_` entered in `contains`, `startsWith`, or `endsWith` should remain SQL wildcards or be escaped as literal characters.
- Keep unions, multiple statements, and other unsupported shapes out of automatic criteria generation unless deliberately designed later.

### 2. Verify mutation metadata end to end

- Exercise insert and update against real metadata and backend handlers.
- Confirm backend-owned SQL quoting for text and date values.
- Verify failed handlers reopen populated forms and successful handlers refresh the grid.
- Decide whether mutation success feedback is needed beyond the refreshed table.

### 3. Verify and refine grid lookups

- Exercise multiple real grid lookup handlers, including numeric and string values.
- Confirm displayed labels and text filtering against real backend results.
- Verify raw values remain available for selection, update, and delete handlers.
- Confirm failed lookup batches show raw values and a useful workspace error.
- Decide whether grid sorting should continue using raw values or sort by displayed labels.
- Decide whether partial lookup success should be retained if one column's lookup fails.

### 4. Resolve remaining form and drawer edge cases

- Move focus into the drawer and restore it on close.
- Decide whether reopened forms preserve values.
- Ensure submission cannot trigger native navigation.
- Decide whether lookup errors should remain form-level or become field-specific.
- Validate unknown, self-referencing, and circular `dependsOn` metadata.
- Verify chained lookup dependencies and multiple-value dependencies with real metadata.
- Decide whether all lookups should reload when any dependency changes or only affected lookups if forms become large.
- Revisit Angular's experimental `debounced()` API on framework upgrades.

### 5. Add focused tests

Prioritize placeholder replacement, automatic `SELECT` predicates, `EXEC` parameter generation, operator/value validation, handler dispatch, form-option mapping, code-language mapping, the code `equals` invariant, context conversion, grid lookup conversion, label formatting and filtering, lookup failure fallback, stale lookup protection, menu-item column changes, and workspace retrieve-flow decisions.

### 6. Production hardening later

- Move API URLs into environment configuration.
- Resolve bundle, Day.js, and `node-sql-parser` warnings.
- Define authentication and authorization.
- Restrict query execution.
- Review browser function compilation and CSP.
- Review parser/configuration error presentation and unsupported-statement behavior.

## Immediate recommended task

Exercise grid lookup display and filtering with real backend metadata, then fix only contract mismatches revealed by those runs.
