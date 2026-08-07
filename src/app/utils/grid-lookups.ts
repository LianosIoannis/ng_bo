import type { Row } from "../models/menu-item-params.runtime.models";

export type GridLookupValue = Exclude<Row[string], null>;
export type GridLookupMap = ReadonlyMap<GridLookupValue, string>;
export type GridLookupMaps = ReadonlyMap<string, GridLookupMap>;

export function createGridLookupMap(rows: Row[]): GridLookupMap {
	const lookup = new Map<GridLookupValue, string>();

	for (const row of rows) {
		const value = row["value"];

		if (value === null || value === undefined) {
			continue;
		}

		lookup.set(value, String(row["label"] ?? value));
	}

	return lookup;
}
