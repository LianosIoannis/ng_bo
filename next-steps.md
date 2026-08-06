# Project Status and Next Steps

Last updated: 6 August 2026

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
	grid: Omit<LookupConfig, "multiple">;
};
```

The backend metadata editor, validation, seed helpers, models, and transformer now support this shape.

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

Missing values, `undefined`, empty arrays, and nullable values inside query-authored quotes still need explicit decisions.

### Grid options

`createGridOptions(params, rowData)` maps runtime metadata and rows into AG Grid options. It currently supports visibility, sorting, filtering, pagination, single-row selection, content-based sizing, and these formatters:

- Date: `DD/MM/YYYY`.
- Date-time: `DD/MM/YYYY HH:mm`.
- Time: `HH:mm`.
- Code: first 30 characters.

Date, date-time, and time columns use AG Grid's `dateTimeString` cell data type.

The AG Grid wrapper binds `columnDefs` and `rowData` explicitly in addition to `gridOptions`. This ensures that changing the selected menu item refreshes the displayed columns and rows. Grid lookup formatting is not implemented yet.

### Generic forms and option builders

The shared Signal Forms component supports criteria, insert, update, range operators, lookup selects, multiple values, required and readonly fields, default values, configurable actions, and metadata-selected code languages.

The asynchronous builders are:

```ts
createCriteriaFormOptions(params, runHandler, context)
createInsertFormOptions(params, runHandler, context)
createUpdateFormOptions(params, runHandler, context)
```

They:

- Include only columns enabled for the requested operation.
- Use operation-specific lookup handlers.
- Execute enabled lookups concurrently through the supplied callback.
- Reject if a lookup fails.
- Convert `{ value, label }` rows into select options.
- Preserve `string | number` lookup values.
- Fall back to `String(value)` when a label is missing.
- Pass `column.language` to code editors.
- Force code criteria to `equals`.
- Hide operators and use `equals` internally for insert and update forms.

An enabled lookup returning no rows remains an edge case: the current template falls back to a normal input because it checks `option.options?.length`.

### Workspace component

The workspace receives a required `MenuItemModel` and contains:

- A thin right-aligned toolbar.
- Insert, delete, edit, filter, and refresh Font Awesome buttons.
- AG Grid below the toolbar.
- A right-side drawer shared by criteria, insert, and update forms.
- Async form-option loading with loading, error, empty, and ready states.
- `inert`, Escape, backdrop, and cancel behavior.

The component still owns temporary drawer state directly. Form submission logs `FormResult`; data handlers are not connected yet, and grid rows remain empty.

### Workspace service skeleton

`WorkspaceService` exists as a component-scoped service:

```ts
@Service({ autoProvided: false })
```

It is not root-provided because each future tab/workspace must own an independent state instance.

It defines explicit signals for the menu item, rows, selected row, retrieve criteria, insert data, update data, operation-specific errors, and active flow. Computed state determines:

- Whether criteria and required criteria exist.
- Whether insert and update fields exist.
- Whether saved criteria or operation data exists.
- Which operations are possible.
- Which drawer should be displayed.

`initialize(menuItem)` resets state and starts the retrieve flow. The service is not yet provided by or connected to `Workspace`.

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

## Current verification

- The Angular production build passes.
- The backend TypeScript check passes.
- Both repositories were clean when this document was updated.
- The Angular build still reports the existing initial-bundle budget warning and Day.js CommonJS warning.

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

- The client substitutes values only.
- Metadata owns operators, SQL structure, and outer quoting.
- Authorization, metadata trust, and query restrictions are required before broader exposure.
- Empty arrays, unresolved placeholders, missing values, and nullable quoted placeholders need decisions.
- Never reset or reseed a database without explicit approval.
- Never place secrets in client code or documentation.

## Clear next steps

### 1. Connect `WorkspaceService` to `Workspace`

- Provide it at workspace-component level.
- Initialize it when the `menuItem` input changes.
- Replace only state that already has a direct service equivalent.
- Derive the visible drawer from `WorkspaceService.drawer`.
- Keep async form-option loading in the component initially.

This should be a wiring step, not a broad rewrite of `Workspace`, `Form`, or form models.

### 2. Define pure form-result context converters

`FormResult` stores `{ operator, value, valueTo }` for each column. Before executing handlers, define small converters for retrieve criteria, insert values, and update values combined with selected-row primary keys.

Do not pass complete `FormParams` objects directly to placeholder replacement. Decide criteria behavior for optional empty values, range operators, `in`/`notIn`, multiple lookup values, missing values, and empty arrays.

### 3. Implement retrieval only

- Start retrieval when the menu item initializes.
- Let computed state request required criteria.
- Save submitted criteria.
- Execute the select handler through `HandlerRunner`.
- Store successful rows or the retrieval error.
- Feed service rows into `createGridOptions`.
- Make Refresh reuse saved criteria.
- Make Filter reopen saved criteria.
- Add loading, error, and empty states.

Keep insert, update, and delete execution out of this step.

### 4. Wire selection and permissions

- Store AG Grid selection in `selectedRow`.
- Drive toolbar enabled states from `possibilities`.
- Enable actions only when metadata, permissions, and selection allow them.
- Load update defaults from the selected row.
- Correct Refresh so it starts retrieval rather than opening criteria.

### 5. Implement mutations separately

Recommended order:

1. Insert.
2. Update.
3. Delete with an accessible confirmation.

Follow the agreed success and failure transitions exactly and verify each operation before starting the next.

### 6. Implement grid lookups

Run enabled grid lookups outside the pure grid mapper, convert them to value-label maps, preserve raw row values, and use the maps in value formatters. Define missing-value and lookup-failure behavior.

### 7. Resolve remaining form and drawer edge cases

- Render an empty select when an enabled lookup returns no rows.
- Move focus into the drawer and restore it on close.
- Prevent stale lookup promises from replacing newer options.
- Decide whether reopened forms preserve values.
- Ensure submission cannot trigger native navigation.

### 8. Add focused tests

Prioritize placeholder replacement, handler dispatch, form-option mapping, code-language mapping, the code `equals` invariant, context conversion, lookup conversion, grid formatting, menu-item column changes, and workspace retrieve-flow decisions.

### 9. Production hardening later

- Move API URLs into environment configuration.
- Resolve bundle and Day.js warnings.
- Define authentication and authorization.
- Restrict query execution.
- Review browser function compilation and CSP.
- Define safe error reporting and unresolved-placeholder behavior.

## Immediate recommended task

Connect `WorkspaceService` to `Workspace` without executing handlers yet. Initialize it from the menu-item input and derive the visible drawer from its computed state. This establishes the declarative foundation for implementing retrieval in the following small step.
