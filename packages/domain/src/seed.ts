import {
	base,
	de,
	en,
	en_AU,
	en_CA,
	en_GB,
	en_IN,
	en_US,
	Faker,
	fr,
	ja,
	type LocaleDefinition,
	pt_BR,
	type Randomizer,
} from "@faker-js/faker";
import { sql } from "drizzle-orm";
import type { Database } from "./database.js";
import {
	departments as departmentTable,
	employees,
	jobTitles as jobTitleTable,
	type NewEmployee,
} from "./schema/index.js";

// Departments and job titles are referenced by name; their IDs are owned by
// migrations/0001_master_data.sql and resolved when seeding.
export type SeedEmployee = Omit<
	Required<NewEmployee>,
	"departmentId" | "jobTitleId"
> & { department: string; jobTitle: string };
type SeedOptions = { count?: number; seed?: number };

const DEFAULT_SEED_COUNT = 10_000;
const DEFAULT_SEED = 20_260_101;
const SEEDED_AT = new Date("2026-01-01T00:00:00Z");
const BATCH_SIZE = 500;

// Entry-level (L1) annual base salaries in major units; exercise values only.
type SeedCountry = {
	code: string;
	currency: string;
	minorUnits: number;
	weight: number;
	base: number;
	// Faker has no Singapore locale; English names are used there.
	locale: LocaleDefinition;
	familyNameFirst?: boolean;
};
const countries: SeedCountry[] = [
	{
		code: "US",
		currency: "USD",
		minorUnits: 2,
		weight: 20,
		base: 72_000,
		locale: en_US,
	},
	{
		code: "IN",
		currency: "INR",
		minorUnits: 2,
		weight: 18,
		base: 900_000,
		locale: en_IN,
	},
	{
		code: "GB",
		currency: "GBP",
		minorUnits: 2,
		weight: 10,
		base: 40_000,
		locale: en_GB,
	},
	{
		code: "DE",
		currency: "EUR",
		minorUnits: 2,
		weight: 9,
		base: 52_000,
		locale: de,
	},
	{
		code: "CA",
		currency: "CAD",
		minorUnits: 2,
		weight: 8,
		base: 68_000,
		locale: en_CA,
	},
	{
		code: "JP",
		currency: "JPY",
		minorUnits: 0,
		weight: 8,
		base: 4_500_000,
		locale: ja,
		familyNameFirst: true,
	},
	{
		code: "FR",
		currency: "EUR",
		minorUnits: 2,
		weight: 7,
		base: 45_000,
		locale: fr,
	},
	{
		code: "AU",
		currency: "AUD",
		minorUnits: 2,
		weight: 7,
		base: 75_000,
		locale: en_AU,
	},
	{
		code: "SG",
		currency: "SGD",
		minorUnits: 2,
		weight: 7,
		base: 62_000,
		locale: en,
	},
	{
		code: "BR",
		currency: "BRL",
		minorUnits: 2,
		weight: 6,
		base: 84_000,
		locale: pt_BR,
	},
];
// Titles are shared across departments, as the schema allows.
const departments = [
	{
		name: "Engineering",
		weight: 35,
		factor: 1.15,
		titles: ["Engineer", "Analyst"],
	},
	{
		name: "Sales",
		weight: 25,
		factor: 1,
		titles: ["Account Executive", "Coordinator", "Specialist"],
	},
	{
		name: "Operations",
		weight: 20,
		factor: 0.9,
		titles: ["Coordinator", "Specialist", "Analyst"],
	},
	{
		name: "Finance",
		weight: 10,
		factor: 1.05,
		titles: ["Analyst", "Specialist", "Coordinator"],
	},
	{
		name: "People",
		weight: 10,
		factor: 0.95,
		titles: ["Specialist", "Coordinator"],
	},
];
// A pyramid: more junior than senior staff, with pay rising by level.
const levels = [
	{ name: "L1", weight: 25, factor: 1 },
	{ name: "L2", weight: 25, factor: 1.3 },
	{ name: "L3", weight: 20, factor: 1.7 },
	{ name: "L4", weight: 15, factor: 2.2 },
	{ name: "L5", weight: 10, factor: 2.9 },
	{ name: "L6", weight: 5, factor: 3.8 },
];
// mulberry32: a small, fast PRNG; the same seed always yields the same data.
function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(random: () => number, items: readonly T[]): T {
	const item = items[Math.floor(random() * items.length)];
	if (item === undefined) throw new Error("Cannot pick from an empty list");
	return item;
}

function pickWeighted<T extends { weight: number }>(
	random: () => number,
	items: readonly T[],
): T {
	let remaining = random() * items.reduce((sum, item) => sum + item.weight, 0);
	for (const item of items) {
		remaining -= item.weight;
		if (remaining < 0) return item;
	}
	return pick(random, items);
}

// Names use their own stream, so a Faker upgrade can change names but never pay.
// Faker is pinned to an exact version because its seeded output may change.
function createNameGenerator(seed: number): (country: SeedCountry) => string {
	const randomizer: Randomizer = {
		next: createRandom(seed ^ 0x5eed),
		seed: () => {
			throw new Error("Reseed names through generateEmployees({ seed })");
		},
	};
	const fakers = new Map(
		countries.map((country) => [
			country,
			new Faker({ locale: [country.locale, en, base], randomizer }),
		]),
	);
	return (country) => {
		const faker = fakers.get(country);
		if (!faker) throw new Error(`No name locale for ${country.code}`);
		const first = faker.person.firstName();
		const last = faker.person.lastName();
		return country.familyNameFirst ? `${last} ${first}` : `${first} ${last}`;
	};
}

export function generateEmployees({
	count = DEFAULT_SEED_COUNT,
	seed = DEFAULT_SEED,
}: SeedOptions = {}): SeedEmployee[] {
	if (!Number.isSafeInteger(count) || count < 0)
		throw new Error("Seed count must be a non-negative integer");
	const random = createRandom(seed);
	const nameFor = createNameGenerator(seed);
	return Array.from({ length: count }, (_, index) => {
		const number = index + 1;
		const country = pickWeighted(random, countries);
		const dept = pickWeighted(random, departments);
		const level = pickWeighted(random, levels);
		const jobTitle = pick(random, dept.titles);
		const name = nameFor(country);
		const spread = 0.88 + random() * 0.24;
		// Whole hundreds of major units, stored as minor units.
		const major =
			Math.round((country.base * level.factor * dept.factor * spread) / 100) *
			100;
		return {
			id: `00000000-0000-4000-8000-${number.toString(16).padStart(12, "0")}`,
			code: `EMP${number.toString().padStart(5, "0")}`,
			name,
			countryCode: country.code,
			currencyCode: country.currency,
			department: dept.name,
			level: level.name,
			jobTitle,
			salaryMinorUnits: major * 10 ** country.minorUnits,
			active: random() >= 0.02,
			version: 1,
			createdAt: SEEDED_AT,
			updatedAt: SEEDED_AT,
		};
	});
}

function requireId(
	ids: ReadonlyMap<string, string>,
	kind: string,
	name: string,
): string {
	const id = ids.get(name);
	if (!id)
		throw new Error(
			`Unknown ${kind} "${name}"; add it to the master-data migration first`,
		);
	return id;
}

export async function seedEmployees(
	db: Database,
	rows: readonly SeedEmployee[],
): Promise<{ employees: number }> {
	await db.transaction(async (tx) => {
		// Serialize seeding so concurrent runs cannot both see empty tables.
		await tx.execute(
			sql`LOCK TABLE employees, salary_changes IN EXCLUSIVE MODE`,
		);
		const existing = await tx.execute(
			sql`select 1 from employees union all select 1 from salary_changes limit 1`,
		);
		if (existing.rows.length)
			throw new Error(
				"Employee and salary-change tables must be empty; run db:reset before db:seed",
			);
		const departmentIds = new Map(
			(await tx.select().from(departmentTable)).map((row) => [
				row.name,
				row.id,
			]),
		);
		const jobTitleIds = new Map(
			(await tx.select().from(jobTitleTable)).map((row) => [row.name, row.id]),
		);
		// Resolve every row before inserting so a missing name inserts nothing.
		const resolved: NewEmployee[] = rows.map(
			({ department, jobTitle, ...row }) => ({
				...row,
				departmentId: requireId(departmentIds, "department", department),
				jobTitleId: requireId(jobTitleIds, "job title", jobTitle),
			}),
		);
		for (let offset = 0; offset < resolved.length; offset += BATCH_SIZE)
			await tx
				.insert(employees)
				.values(resolved.slice(offset, offset + BATCH_SIZE));
	});
	return { employees: rows.length };
}
