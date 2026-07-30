# Project Status and Next Steps

Last updated: 30 July 2026

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

`MenuLoader` loads the currently hardcoded `organization` menu from:

```text
GET http://localhost:3000/api/menus/organization/json
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
- A right-side form drawer shared by criteria, insert, and update operations.

Opening a supported form mode:

- Opens the form drawer.
- Clears any previous form options and errors.
- Loads the new options asynchronously.
- Uses `HandlerRunner` for lookup handlers.
- Displays loading, error, empty, and ready states.
- Uses operation-specific titles and submit labels.
- Allows cancellation and closing with Escape.

The inactive side of the workspace uses `inert` while the drawer is open. The closed drawer is also inert, avoiding the earlier focus and `aria-hidden` conflict.

The grid is still created from the selected item's metadata with empty row data. Form submission currently logs the structured `FormResult`; retrieval and mutations are not executed yet.

The application layout has been adjusted so the workspace, drawer, and grid can consume the available viewport height.

### Form option builders

Three asynchronous form option builders now exist:

```ts
createCriteriaFormOptions(
	params,
	runHandler,
	context,
): Promise<FormInputOption[]>

createInsertFormOptions(
	params,
	runHandler,
	context,
): Promise<FormInputOption[]>

createUpdateFormOptions(
	params,
	runHandler,
	context,
): Promise<FormInputOption[]>
```

The criteria builder:

- Includes columns enabled for retrieval criteria.
- Maps the column's name, label, type, required state, operators, and default operator.
- Runs enabled criteria lookup handlers.

The insert and update builders:

- Include columns enabled for the corresponding operation.
- Map the operation-specific required state.
- Use the corresponding insert or update lookup configuration.
- Hide the operator selector.
- Share a small internal operation mapping function.

All three builders:

- Run enabled lookup handlers concurrently.
- Convert lookup rows containing `value` and `label` into form select options.
- Reject the returned promise if a lookup fails.

Handler execution is currently supplied as a callback. This keeps the utility independent from Angular dependency injection and makes it reusable and testable.

The agreed lookup row contract is:

```ts
{
	value: string | number;
	label: string;
}
```

The label falls back to the string form of the value when needed.

### Shared form improvements

The generic Signal Forms component now supports the workspace drawer use case:

- Configurable form title.
- Configurable submit label.
- Submit and cancel actions with Font Awesome icons.
- A cancellation output.
- Optional operator visibility.
- Optional default values.
- Required and readonly behavior.
- Scrollable form content inside a fixed-height drawer.

Criteria forms show their operators. Insert and update forms hide operators while retaining the internal form shape needed by the shared component.

An enabled lookup that returns zero rows is a known edge case: the current template checks `option.options?.length`, so an empty lookup currently falls back to a normal input instead of rendering an empty select.

### Backend seed metadata

The backend organization seed has been expanded into a realistic metadata set for:

- Departments.
- Job titles.
- Employees.
- Projects.
- Employee/project assignments.
- Child relations.
- Query, function-query, and function-data handlers.
- Query-based and function-based lookup examples.

The seed helpers create the new operation-specific lookup shape and validate the resulting metadata. The backend metadata editor still uses the previous flat lookup structure and must be updated separately.

Some seeded insert and update queries currently place string and date placeholders without outer SQL quotes. This conflicts with the agreed placeholder contract and must be corrected before mutation handlers are executed.

### Current verification

As of this update:

- The Angular development build passes.
- The backend TypeScript no-emit check passes.
- The frontend working tree was clean after the latest form and workspace commit.
- The backend has an uncommitted Prisma initialization migration replacement that should be reviewed before it is committed or discarded.

## Current flow

The implemented menu and workspace flow is:

```text
Backend menu endpoint
  -> MenuLoader
  -> parameter transformer
  -> runtime menu tree
  -> selected menu item
  -> Workspace
  -> metadata-derived empty grid and workspace form drawer
  -> criteria, insert, or update form options
  -> lookup handlers through HandlerRunner
  -> rendered generic form
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

The form drawer is now connected to the handler infrastructure for lookup loading. The next integration boundary is converting a submitted `FormResult` into the correct handler context and executing the selected operation.

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
- Metadata queries must include outer SQL quotes where their placeholders represent strings, dates, date-times, or times.
- String apostrophes are escaped during substitution.
- SQL Server boolean and null representations are already defined.
- Missing placeholders and empty-array semantics remain open decisions.

### Data safety

- Do not reset or reseed an existing database without explicit approval.
- Existing metadata may still use the old lookup shape and will need either a migration or an approved safe reseed.
- Review the pending Prisma migration replacement before committing, applying, or removing it.
- Never place database credentials or other secrets in documentation or client code.

## Clear next steps

### 1. Align the seeded SQL with the placeholder contract

Before executing insert or update handlers, correct the seed examples so their SQL owns all required outer quoting.

For example, text and date placeholders need query-authored quotes:

```sql
VALUES ('@{department_name}', '@{location}', @{annual_budget})
```

This review should cover:

- Strings.
- Dates, date-times, and times.
- Nullable values, because quoting a placeholder that resolves to `NULL` would produce `'NULL'`.
- Arrays used in `IN` or `NOT IN` clauses.
- Function-query handlers that combine direct JavaScript values and placeholders.

The nullable case needs a deliberate rule before applying a mechanical update. A query that must support both a quoted value and SQL `NULL` may need to be generated by a function-query handler instead of a simple static query.

### 2. Finish adopting the lookup contract in the backend

Before relying heavily on lookups, complete the backend authoring path:

- Update the backend parameters editor to support separate `criteria`, `insert`, `update`, and `grid` lookup configurations.
- Decide how existing stored metadata using the old lookup shape will be handled.
- Validate a complete exported menu containing each lookup variation.
- Confirm that the frontend transformer produces the expected runtime handlers from that response.
- Review and settle the pending Prisma initialization migration replacement.

This step prevents new metadata from being authored in an outdated format.

### 3. Define form-result-to-handler-context conversion

The shared form returns this structure for each column:

```ts
{
	operator,
	value,
	valueTo,
}
```

`HandlerRunner` currently expects a flat `HandlerInput`. Before executing forms, define small, explicit converters for:

- Criteria results, where operators and range values affect the query.
- Insert results, where handlers normally need the submitted value for each column.
- Update results, where submitted values must be combined with primary-key values from the selected row.

The criteria conversion needs agreed behavior for:

- Empty optional fields.
- `between` and `notBetween`.
- Multiple lookup values.
- `in` and `notIn`.
- Missing values.
- Empty arrays.
- Operator-specific SQL generation.

Avoid passing the complete `FormParams` object directly to placeholder replacement because placeholders currently serialize scalar values and arrays, not `{ operator, value, valueTo }` objects.

### 4. Execute the selected item's retrieval handler

When the criteria form is submitted:

- Convert the form result into the value context expected by placeholder substitution.
- Run the selected item's select handler through `HandlerRunner`.
- Reject or report unresolved placeholders before sending invalid SQL.
- Store successful rows in workspace state.
- Recreate or update the grid options with the returned rows.
- Show useful loading, error, empty, and success states.

The exact handling of ranges, multiple values, missing values, and empty arrays should be agreed before completing this step.

### 5. Implement grid lookups

Columns with an enabled `lookup.grid` handler need display formatting:

- Run each required grid lookup handler.
- Convert its rows into a value-to-label map.
- Add the map to the corresponding AG Grid value formatter.
- Preserve the raw value in row data.
- Define behavior for missing lookup values and failed grid lookups.

This should be added to the grid options utility without coupling that pure mapping function directly to Angular services.

### 6. Wire refresh, permissions, and selection behavior

After retrieval works:

- Make Refresh repeat the latest retrieval.
- Track the selected grid row.
- Enable Edit and Delete only when their metadata action is enabled and a valid row is selected.
- Enable Insert only when insertion is configured.
- Load update defaults from the selected row.
- Preserve accessible disabled states and labels.

The workspace should also reset or reload an open form drawer when the selected menu item changes. At present, selecting another item can leave form options from the previous item visible.

### 7. Resolve remaining form and drawer edge cases

Before relying on the drawer for mutations:

- Render an empty select when an enabled lookup returns no rows instead of falling back to a normal input.
- Move focus into the dialog when it opens.
- Restore focus to the opening button when it closes.
- Prevent stale asynchronous lookup results from replacing the options for a newer drawer request.
- Decide whether closing and reopening a form should preserve or reset entered values.
- Confirm that form submission cannot trigger native page navigation.

### 8. Implement mutations one operation at a time

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

### 9. Add children and dependent behavior later

Child handlers and `dependsOn`-style lookup dependencies should remain deferred until the main retrieve, insert, update, and delete flows are stable.

When implemented, dependency handling will need:

- An explicit source-field model.
- Lookup reloading rules.
- Cancellation or stale-result protection.
- Clear behavior when a parent value is cleared.

### 10. Add focused tests

The most valuable early tests are for the pure contract and transformation boundaries:

- Query placeholder substitution for every supported value type.
- Runtime handler dispatch and error normalization.
- Criteria, insert, and update form option mapping.
- Form-result-to-handler-context conversion.
- Lookup row conversion.
- Grid column and value formatting.
- Backend-to-frontend transformation of a representative menu item.

UI tests can then cover drawer focus, workspace loading states, form submission, and toolbar enablement.

### 11. Harden configuration and production behavior

Before production readiness:

- Move API URLs into environment configuration or a shared API configuration service.
- Resolve the current production bundle budget issue.
- Define authentication and authorization.
- Restrict backend query execution appropriately.
- Review the browser function-compilation trust model and Content Security Policy.
- Define user-safe error messages without exposing sensitive backend details.
- Decide behavior for malformed lookup rows, duplicate lookup values, unresolved placeholders, and empty arrays.

## Immediate recommended task

The smallest useful next step is to settle two contracts before wiring retrieval:

1. How `FormResult` becomes a flat handler context for criteria, insert, and update.
2. How query metadata handles quoting when a value may also be `NULL`.

After those decisions, implement a pure criteria-result converter and connect only the retrieval handler. Keep row loading, loading/error states, and grid updates within the workspace, while leaving insert, update, and delete execution for later focused changes.

In parallel or immediately afterward, update the backend metadata editor to the new lookup structure so newly authored metadata cannot revert to the old contract.
