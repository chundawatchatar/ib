import { describe, expect, it } from "vitest";
import { generateEmployees } from "./seed.js";

const employees = generateEmployees();

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("seed generation", () => {
	it("generates 10,000 employees by default with unique IDs and codes", () => {
		expect(employees).toHaveLength(10_000);
		expect(new Set(employees.map((row) => row.id)).size).toBe(10_000);
		expect(new Set(employees.map((row) => row.code)).size).toBe(10_000);
		expect(employees[0]).toMatchObject({
			id: "00000000-0000-4000-8000-000000000001",
			code: "EMP00001",
		});
		expect(employees.at(-1)?.code).toBe("EMP10000");
	});

	it("is deterministic for a seed and varies across seeds", () => {
		expect(generateEmployees({ count: 50, seed: 7 })).toEqual(
			generateEmployees({ count: 50, seed: 7 }),
		);
		expect(generateEmployees({ count: 50, seed: 8 })).not.toEqual(
			generateEmployees({ count: 50, seed: 7 }),
		);
	});

	it("honours the requested count", () => {
		expect(generateEmployees({ count: 0 })).toEqual([]);
		expect(generateEmployees({ count: 3 })).toHaveLength(3);
		expect(() => generateEmployees({ count: -1 })).toThrow();
		expect(() => generateEmployees({ count: 1.5 })).toThrow();
	});

	it("covers ten countries, each paid in its own currency", () => {
		const currencyByCountry = {
			AU: "AUD",
			BR: "BRL",
			CA: "CAD",
			DE: "EUR",
			FR: "EUR",
			GB: "GBP",
			IN: "INR",
			JP: "JPY",
			SG: "SGD",
			US: "USD",
		};
		expect(new Set(employees.map((row) => row.countryCode)).size).toBe(10);
		for (const row of employees)
			expect(row.currencyCode).toBe(
				currencyByCountry[row.countryCode as keyof typeof currencyByCountry],
			);
	});

	it("produces positive salaries in whole hundreds of major units", () => {
		for (const row of employees) {
			expect(Number.isSafeInteger(row.salaryMinorUnits)).toBe(true);
			const minorPerMajor = row.currencyCode === "JPY" ? 1 : 100;
			expect(row.salaryMinorUnits % (100 * minorPerMajor)).toBe(0);
			expect(row.salaryMinorUnits).toBeGreaterThan(0);
		}
	});

	it("raises median pay with each level within a country", () => {
		const us = employees.filter((row) => row.countryCode === "US");
		const medians = ["L1", "L2", "L3", "L4", "L5", "L6"].map((level) =>
			median(
				us
					.filter((row) => row.level === level)
					.map((row) => row.salaryMinorUnits),
			),
		);
		for (let index = 1; index < medians.length; index++)
			expect(medians[index]).toBeGreaterThan(medians[index - 1] ?? 0);
	});

	it("shares job titles across departments and marks a few employees inactive", () => {
		const departmentsByTitle = new Map<string, Set<string>>();
		for (const row of employees)
			departmentsByTitle.set(
				row.jobTitle,
				(departmentsByTitle.get(row.jobTitle) ?? new Set()).add(row.department),
			);
		expect(departmentsByTitle.size).toBe(5);
		expect([...departmentsByTitle.values()].some((set) => set.size > 1)).toBe(
			true,
		);
		const inactive = employees.filter((row) => !row.active).length;
		expect(inactive).toBeGreaterThan(100);
		expect(inactive).toBeLessThan(400);
	});

	it("keeps repeated names rare", () => {
		const counts = new Map<string, number>();
		for (const row of employees)
			counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
		expect(counts.size).toBeGreaterThan(9_800);
		expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
	});

	it("uses country-appropriate names, family name first in Japan", () => {
		const japanese = employees.filter((row) => row.countryCode === "JP");
		expect(japanese.length).toBeGreaterThan(0);
		for (const row of japanese)
			expect(row.name).toMatch(
				/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]+ [\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]+$/u,
			);
		for (const row of employees) expect(row.name.trim()).toBe(row.name);
	});

	it("uses fixed timestamps and initial versions", () => {
		for (const row of employees) {
			expect(row.version).toBe(1);
			expect(row.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
			expect(row.updatedAt).toEqual(row.createdAt);
		}
	});
});
