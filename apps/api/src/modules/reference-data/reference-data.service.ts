import type { ReferenceDataResponse } from "@salary-manager/contracts";
import type { Database } from "@salary-manager/domain";
import { readReferenceData } from "./reference-data.queries";

const levelOrder = new Intl.Collator("en", { numeric: true });

export function createReferenceDataService(db: Database) {
	return {
		get: async (): Promise<ReferenceDataResponse> => {
			const data = await db.transaction(readReferenceData, {
				isolationLevel: "repeatable read",
				accessMode: "read only",
			});
			return { ...data, levels: data.levels.sort(levelOrder.compare) };
		},
	};
}

export type ReferenceDataService = ReturnType<
	typeof createReferenceDataService
>;
