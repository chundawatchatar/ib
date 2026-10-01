import {
	type PayInsightsQuery,
	paySummarySchema,
} from "@salary-manager/contracts";
import {
	currencies,
	type Database,
	employees,
	fxRates,
} from "@salary-manager/domain";
import { and, eq, isNull, sql } from "drizzle-orm";
import { employeeWhere } from "../employees/employee-filters";

type Reader = Pick<Database, "select" | "selectDistinct" | "execute">;
export async function latestRateDate(db: Reader) {
	const [row] = await db
		.select({ date: sql<string | null>`max(${fxRates.rateDate})::text` })
		.from(fxRates)
		.where(eq(fxRates.targetCurrencyCode, "USD"));
	return row?.date ?? null;
}
export async function missingRates(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
) {
	const rows = await db
		.selectDistinct({ code: employees.currencyCode })
		.from(employees)
		.leftJoin(
			fxRates,
			and(
				eq(fxRates.sourceCurrencyCode, employees.currencyCode),
				eq(fxRates.targetCurrencyCode, "USD"),
				date ? eq(fxRates.rateDate, date) : sql`false`,
			),
		)
		.where(and(employeeWhere(query), isNull(fxRates.rate)));
	return rows.map((row) => row.code).sort();
}
export async function summarize(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
) {
	const usd = query.view === "usd";
	const population = usd
		? sql`
 select 'USD'::text as code, 2 as precision,
 ${employees.salaryMinorUnits}::numeric * ${fxRates.rate} *
 (case ${currencies.minorUnits} when 0 then 100::numeric when 1 then 10::numeric
 when 2 then 1::numeric when 3 then 0.1::numeric when 4 then 0.01::numeric
 when 5 then 0.001::numeric when 6 then 0.0001::numeric end) as amount
 from ${employees} inner join ${currencies} on ${currencies.code} = ${employees.currencyCode}
 inner join ${fxRates} on ${fxRates.sourceCurrencyCode} = ${employees.currencyCode}
 and ${fxRates.targetCurrencyCode} = 'USD' and ${fxRates.rateDate} = ${date}
 where ${employeeWhere(query) ?? sql`true`}`
		: sql`
 select ${employees.currencyCode} as code, ${currencies.minorUnits} as precision, ${employees.salaryMinorUnits}::numeric as amount
 from ${employees} inner join ${currencies} on ${currencies.code} = ${employees.currencyCode}
 where ${employeeWhere(query) ?? sql`true`}`;
	// Number numeric values explicitly: percentile_cont converts salaries to double precision.
	// Keep FX fractions through every sum and interpolation; round only the final output.
	const result = await db.execute(sql`
 with population as (${population}), ordered as (
 select *, row_number() over(partition by code order by amount) as position from population
 ), aggregates as (
 select code, precision, count(*) as n, sum(amount) as total, avg(amount) as average,
 min(amount) as minimum, max(amount) as maximum from population group by code, precision
 ), ranks as (
 select a.code, p.label, 1 + (a.n - 1)::numeric * p.fraction as rank
 from aggregates a cross join (values ('median', 0.5::numeric), ('p25', 0.25::numeric), ('p75', 0.75::numeric)) p(label, fraction)
 ), percentiles as (
 select r.code, r.label, lo.amount + (r.rank - floor(r.rank)) * (hi.amount - lo.amount) as amount
 from ranks r join ordered lo on lo.code = r.code and lo.position = floor(r.rank)
 join ordered hi on hi.code = r.code and hi.position = ceil(r.rank)
 )
 select a.code as "currencyCode", a.precision as "currencyMinorUnits", a.n::integer as headcount,
 round(a.total)::text as total, round(a.average)::text as average,
 round(a.minimum)::text as min, round(a.maximum)::text as max,
 round(max(p.amount) filter(where p.label = 'median'))::text as median,
 round(max(p.amount) filter(where p.label = 'p25'))::text as p25,
 round(max(p.amount) filter(where p.label = 'p75'))::text as p75
 from aggregates a join percentiles p on p.code = a.code
 group by a.code, a.precision, a.n, a.total, a.average, a.minimum, a.maximum order by a.code
 `);
	const summaries = result.rows.map((row) => paySummarySchema.parse(row));
	if (usd && !summaries.length)
		summaries.push({
			currencyCode: "USD",
			currencyMinorUnits: 2,
			headcount: 0,
			total: "0",
			average: null,
			median: null,
			min: null,
			max: null,
			p25: null,
			p75: null,
		});
	return summaries;
}
