# Project Status and Next Steps

Last updated: 29 July 2026

## Project overview

This workspace contains two related but separate applications:

- `ng_bo`: the Angular metadata-driven back-office client.
- `bo_db`: the backend that stores menu metadata and executes queries.

They are separate repositories, but the metadata contracts used by the client and backend must remain aligned. The application is still being built incrementally, with an emphasis on keeping each step simple and understandable.

## What has been implemented

### Application shell

The Angular application now has the initial layout:

- A small main header.
- A button with a Font Awesome icon that opens the menu.
- A menu displayed as a drawer.
- A workspace area below the main header.
- Drawer focus and accessibility behavior has been kept simple; the earlier `aria-hidden` focus warning was removed with the unnecessary behavior that caused it.

The application uses signals for local state. Selecting a menu item stores the selected item, closes the drawer, and displays the workspace.

### Menu loading

`MenuLoader` loads the currently hardcoded `admin` menu from:

```text
GET http://localhost:3000/api/menus/admin/json
```

The loader recursively transforms the backend menu response into the runtime menu model expected by the client.

The menu model inconsistency was resolved in favor of the backend contract:

- Menu entries use `kind: "FOLDER" | "ITEM"`.
- The previous frontend-only `isFolder` field is no longer the source of truth.

Menu item parameters returned by the backend are transformed inside `MenuLoader`, so consumers receive `RuntimeMenuItemParams` with executable runtime handlers rather than the serialized handler definitions.

### Metadata models and transformer

The backend parameter models and transformer were brought into the frontend. The two applications now share the same conceptual metadata structure, including:

- Columns and their data types.
- Retrieve criteria configuration.
- Insert and update configuration.
- Select, insert, update, delete, and child handlers.
- Query, function-query, and function-data handlers.
- Operation-specific lookup configuration.

Lookups are now configured separately for each use:

```ts
type ColumnLookupParams = {
	criteria: LookupConfig;
	insert: LookupConfig;
	update: LookupConfig;
	grid: Omit<LookupConfig, "multiple">;
};
```

This allows the same column to use different lookup behavior when it is:

- Used as a retrieval criterion.
- Edited during insertion.
- Edited during an update.
- Displayed in the grid.

The backend models, validation schema, seed helpers, runtime model, and transformer have been updated for this structure. The backend metadata editor still needs to be updated because it currently assumes the previous flat lookup structure.

### Query runner

`QueryRunner` provides the client-side service for the backend query endpoint:

```text
POST http://localhost:3000/api/query
```

It:

- Sends the query string to the backend.
- Uses `firstValueFrom` so callers can run it immediately with `await`.
- Returns `Promise<HandlerResult>`.
- Normalizes request failures into a failed `HandlerResult`.

### Generic handler runner

`HandlerRunner` runs every supported runtime handler type, not only lookup handlers:

- A query handler replaces placeholders and sends the resulting query to `QueryRunner`.
- A function-query handler first runs its function, then replaces placeholders in the returned query and sends it to `QueryRunner`.
- A function-data handler returns the data produced by its function.

Errors are returned consistently as failed `HandlerResult` values.

### Query placeholder substitution

Queries and function-generated queries may contain placeholders in this form:

```text
@{columnName}
```

The replacement utility iterates through the supplied form values and uses `replaceAll`. It only substitutes values; the query author remains responsible for operators, SQL structure, and any outer quoting.

Current value rules are:

- Strings have embedded apostrophes escaped.
- Numbers are inserted directly.
- Booleans become `1` or `0` for SQL Server.
- `null` becomes `NULL`.
- Arrays become comma-separated, individually quoted values.

The behavior for missing values, `undefined`, and empty arrays has intentionally been left for a later decision. At present, their placeholders remain unresolved.

### Grid options utility

`createGridOptions(menuItemParams, rowData)` creates AG Grid options from `RuntimeMenuItemParams`.

It currently maps:

- Column name and label.
- Visibility.
- Sorting.
- Filtering.
- Supplied row data.

Formatting rules include:

- Date: `DD/MM/YYYY`.
- Date and time: `DD/MM/YYYY HH:mm`.
- Time: `HH:mm`.
- Code: the first 30 characters.

Date, date-time, and time columns use AG Grid's `dateTimeString` cell data type, with Day.js used for formatting.

The initial shared grid behavior also includes pagination, single-row selection, content-based column sizing, and the selected AG Grid theme.

### Workspace component

The workspace is a focused standalone component that receives the selected `MenuItemModel` as a required input.

It contains:

- A thin toolbar.
- Insert, delete, edit, and refresh buttons with Font Awesome icons.
- An AG Grid area below the toolbar.

The grid is currently created from the selected item's metadata with empty row data. The buttons and data retrieval are not wired yet.

The application layout has been adjusted so the workspace and grid can consume the available viewport height.

### Criteria form options

The first form options utility has been created:

```ts
createCriteriaFormOptions(
	params,
	runHandler,
	context,
): Promise<FormInputOption[]>
```

It:

- Includes columns enabled for retrieval criteria.
- Maps the column's name, label, type, required state, operators, and default operator.
- Runs enabled criteria lookup handlers.
- Converts lookup rows containing `value` and `label` into form select options.
- Rejects the returned promise if a lookup fails.

Handler execution is currently supplied as a callback. This keeps the utility independent from Angular dependency injection and makes it reusable and testable.

The agreed lookup row contract is:

```ts
{
	value: string | number;
	label: string;
}
```

The label falls back to the string form of the value when needed.

## Current flow

The implemented menu and workspace flow is:

```text
Backend menu endpoint
  -> MenuLoader
  -> parameter transformer
  -> runtime menu tree
  -> selected menu item
  -> Workspace
  -> metadata-derived empty grid
```

The query infrastructure is also ready:

```text
Runtime handler
  -> HandlerRunner
  -> placeholder substitution when required
  -> QueryRunner
  -> backend query endpoint
  -> HandlerResult
```

The next integration step is to connect these two flows inside the workspace.

## Important project constraints

### Change scope

- Prefer minimal, careful, incremental changes.
- Keep implementations straightforward while the architecture is still taking shape.
- Discuss changes first when they introduce significant complexity.
- Ask for approval before broad refactors, new dependencies, schema changes, migrations, destructive data operations, or major architectural decisions.
- Preserve unrelated work already present in either repository.

### Angular and TypeScript

- Keep strict TypeScript types and avoid `any`.
- Use standalone Angular components; Angular 22 treats them as the default.
- Use signals for component state and `computed()` for derived state.
- Use `input()` and `output()` rather than decorator-based inputs and outputs.
- Use `inject()` rather than constructor injection.
- Keep templates simple and use native Angular control flow.
- Prefer Signal Forms for new form work.
- Keep components small and focused.

### Accessibility

- New UI must pass AXE checks and meet WCAG AA requirements.
- Preserve visible keyboard focus.
- Do not hide a focused element or one of its ancestors from assistive technology.
- Icon-only buttons need clear accessible labels.
- Loading, failure, empty, and disabled states must be understandable without relying only on color.

### Shared metadata contracts

The frontend and backend contain matching copies or representations of the metadata contract. A contract change may require coordinated updates to:

- Backend persisted models.
- Backend runtime models.
- Backend validation schemas.
- Backend transformer.
- Backend seed and example data.
- Backend metadata authoring UI.
- Frontend persisted models.
- Frontend runtime models.
- Frontend transformer.
- Frontend utilities and consumers.

Changes should be checked across both repositories before being considered complete.

### Trusted internal execution model

The current design assumes a trusted internal application:

- Metadata-defined functions are compiled in the browser.
- Query strings are constructed by the client.
- The backend executes the submitted query.

This is an explicit trust boundary, not a general public-application security model. Authorization, access control, metadata trust, and query execution restrictions must be addressed before the system is exposed beyond its intended trusted environment.

### Query ownership

- The client substitutes values only.
- Metadata query authors own operators, quoting context, and SQL structure.
- String apostrophes are escaped during substitution.
- SQL Server boolean and null representations are already defined.
- Missing placeholders and empty-array semantics remain open decisions.

### Data safety

- Do not reset or reseed an existing database without explicit approval.
- Existing metadata may still use the old lookup shape and will need either a migration or an approved safe reseed.
- Never place database credentials or other secrets in documentation or client code.

## Clear next steps

### 1. Finish adopting the lookup contract in the backend

Before relying heavily on lookups, complete the backend authoring path:

- Update the backend parameters editor to support separate `criteria`, `insert`, `update`, and `grid` lookup configurations.
- Decide how existing stored metadata using the old lookup shape will be handled.
- Validate a complete exported menu containing each lookup variation.
- Confirm that the frontend transformer produces the expected runtime handlers from that response.

This step prevents new metadata from being authored in an outdated format.

### 2. Add the criteria form to the workspace

For a selected item:

- Create criteria form options asynchronously with `createCriteriaFormOptions`.
- Supply a callback that delegates lookup handlers to `HandlerRunner`.
- Display a loading state while form options and lookups are being prepared.
- Display a clear error state if any required lookup fails.
- Render the generic form with the resulting options.
- Keep the form placement and initial interaction simple.

The form library's operator visibility should also be reviewed. Retrieval criteria require operators, while future insert and update forms generally will not.

### 3. Execute the selected item's retrieval handler

When the criteria form is submitted:

- Convert the form result into the value context expected by placeholder substitution.
- Run the selected item's select handler through `HandlerRunner`.
- Reject or report unresolved placeholders before sending invalid SQL.
- Store successful rows in workspace state.
- Recreate or update the grid options with the returned rows.
- Show useful loading, error, empty, and success states.

The exact handling of ranges, multiple values, missing values, and empty arrays should be agreed before completing this step.

### 4. Implement grid lookups

Columns with an enabled `lookup.grid` handler need display formatting:

- Run each required grid lookup handler.
- Convert its rows into a value-to-label map.
- Add the map to the corresponding AG Grid value formatter.
- Preserve the raw value in row data.
- Define behavior for missing lookup values and failed grid lookups.

This should be added to the grid options utility without coupling that pure mapping function directly to Angular services.

### 5. Wire the refresh and selection behavior

After retrieval works:

- Make Refresh repeat the latest retrieval.
- Track the selected grid row.
- Enable Edit and Delete only when their metadata action is enabled and a valid row is selected.
- Enable Insert only when insertion is configured.
- Preserve accessible disabled states and labels.

### 6. Add insert and update form option builders

Create separate builders rather than forcing all form modes through the criteria builder:

- `createInsertFormOptions(...)`
- `createUpdateFormOptions(...)`

Each builder should map only the fields enabled for that operation and use its corresponding lookup configuration. Update forms will also need initial values from the selected row.

Keeping these functions separate makes operation-specific requirements explicit while allowing small internal mapping helpers to be shared.

### 7. Implement mutations one operation at a time

Recommended order:

1. Insert.
2. Update.
3. Delete.

For each operation:

- Build and validate the appropriate form or confirmation state.
- Construct the handler context.
- Execute the metadata handler through `HandlerRunner`.
- Display backend failures clearly.
- Refresh the grid only after success.

Delete should include an accessible confirmation step.

### 8. Add children and dependent behavior later

Child handlers and `dependsOn`-style lookup dependencies should remain deferred until the main retrieve, insert, update, and delete flows are stable.

When implemented, dependency handling will need:

- An explicit source-field model.
- Lookup reloading rules.
- Cancellation or stale-result protection.
- Clear behavior when a parent value is cleared.

### 9. Add focused tests

The most valuable early tests are for the pure contract and transformation boundaries:

- Query placeholder substitution for every supported value type.
- Runtime handler dispatch and error normalization.
- Criteria form option mapping.
- Lookup row conversion.
- Grid column and value formatting.
- Backend-to-frontend transformation of a representative menu item.

UI tests can then cover drawer focus, workspace loading states, form submission, and toolbar enablement.

### 10. Harden configuration and production behavior

Before production readiness:

- Move API URLs into environment configuration or a shared API configuration service.
- Resolve the current production bundle budget issue.
- Define authentication and authorization.
- Restrict backend query execution appropriately.
- Review the browser function-compilation trust model and Content Security Policy.
- Define user-safe error messages without exposing sensitive backend details.
- Decide behavior for malformed lookup rows, duplicate lookup values, unresolved placeholders, and empty arrays.

## Immediate recommended task

The smallest useful next change is to update the backend metadata editor for the new lookup structure and verify one real menu response end to end.

After that, integrate `createCriteriaFormOptions` into the workspace with loading and error states, without executing the main select handler yet. This keeps the next change focused and proves that metadata-driven criteria and lookup options can be rendered correctly before query retrieval is added.

