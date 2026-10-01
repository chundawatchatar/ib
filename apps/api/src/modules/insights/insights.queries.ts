import {
	MAX_INSIGHT_GROUPS,
	type PayInsightsGroupBy,
	type PayInsightsQuery,
	payDistributionSchema,
	payInsightsGroupSchema,
	paySummarySchema,
} from "@salary-manager/contracts";
import {
	countries,
	currencies,
	type Database,
	departments,
	employees,
	fxRates,
	jobTitles,
} from "@salary-manager/domain";
import { and, eq, isNull, ne, type SQL, sql } from "drizzle-orm";
import { employeeWhere } from "../employees/employee-filters";

type Reader = Pick<Database, "select" | "selectDistinct" | "execute">;
// USD converts to USD at exactly 1 by definition, so it never needs a stored
// rate: USD→USD rows neither choose the rate date nor count as missing.
const REPORTING_CURRENCY = "USD";

export async function latestRateDate(db: Reader) {
	const [row] = await db
		.select({ date: sql<string | null>`max(${fxRates.rateDate})::text` })
		.from(fxRates)
		.where(
			and(
				eq(fxRates.targetCurrencyCode, REPORTING_CURRENCY),
				ne(fxRates.sourceCurrencyCode, REPORTING_CURRENCY),
			),
		);
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
				eq(fxRates.targetCurrencyCode, REPORTING_CURRENCY),
				date ? eq(fxRates.rateDate, date) : sql`false`,
			),
		)
		.where(
			and(
				employeeWhere(query),
				ne(employees.currencyCode, REPORTING_CURRENCY),
				isNull(fxRates.rate),
			),
		);
	return rows.map((row) => row.code).sort();
}
function groupKey(groupBy: PayInsightsGroupBy): SQL {
	const columns = {
		country: employees.countryCode,
		department: employees.departmentId,
		level: employees.level,
		jobTitle: employees.jobTitleId,
	};
	return sql`${columns[groupBy]}::text`;
}
export async function exceedsGroupLimit(
	db: Reader,
	query: PayInsightsQuery,
	groupBy: PayInsightsGroupBy,
) {
	const result = await db.execute(
		sql`select count(distinct ${groupKey(groupBy)}) > ${MAX_INSIGHT_GROUPS} as exceeded from ${employees} where ${employeeWhere(query) ?? sql`true`}`,
	);
	return result.rows[0]?.exceeded === true;
}
function population(
	query: PayInsightsQuery,
	date: string | null,
	groupBy?: PayInsightsGroupBy,
) {
	const usd = query.view === "usd";
	const amounts = usd
		? sql`
 select ${employees.id} as id, 'USD'::text as code, 2 as precision,
 ${employees.salaryMinorUnits}::numeric *
 (case when ${employees.currencyCode} = ${REPORTING_CURRENCY} then 1::numeric else ${fxRates.rate} end) *
 (case ${currencies.minorUnits} when 0 then 100::numeric when 1 then 10::numeric
 when 2 then 1::numeric when 3 then 0.1::numeric when 4 then 0.01::numeric
 when 5 then 0.001::numeric when 6 then 0.0001::numeric end) as amount
 from ${employees} inner join ${currencies} on ${currencies.code} = ${employees.currencyCode}
 left join ${fxRates} on ${fxRates.sourceCurrencyCode} = ${employees.currencyCode}
 and ${fxRates.sourceCurrencyCode} <> ${REPORTING_CURRENCY}
 and ${fxRates.targetCurrencyCode} = ${REPORTING_CURRENCY} and ${fxRates.rateDate} = ${date}
 where ${employeeWhere(query) ?? sql`true`}`
		: sql`
 select ${employees.id} as id, ${employees.currencyCode} as code, ${currencies.minorUnits} as precision, ${employees.salaryMinorUnits}::numeric as amount
 from ${employees} inner join ${currencies} on ${currencies.code} = ${employees.currencyCode}
 where ${employeeWhere(query) ?? sql`true`}`;
	if (!groupBy)
		return sql`select *, ''::text as key, ''::text as label from (${amounts}) amounts`;
	const labels = {
		country: countries.name,
		department: departments.name,
		level: employees.level,
		jobTitle: jobTitles.name,
	};
	// Join group labels by employee ID, leaving the population and conversion rules shared.
	return sql`select amounts.*, ${groupKey(groupBy)} as key, ${labels[groupBy]} as label
 from (${amounts}) amounts inner join ${employees} on ${employees.id} = amounts.id
 inner join ${countries} on ${countries.code} = ${employees.countryCode}
 inner join ${departments} on ${departments.id} = ${employees.departmentId}
 inner join ${jobTitles} on ${jobTitles.id} = ${employees.jobTitleId}`;
}
async function summaryRows(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
	groupBy?: PayInsightsGroupBy,
) {
	// Number numeric values explicitly: percentile_cont converts salaries to double precision.
	// Keep FX fractions through every sum and interpolation; round only the final output.

	const result = await db.execute(sql`
 with population as (${population(query, date, groupBy)}), ordered as (
  select *, row_number() over(partition by key, code order by amount) as position,
   count(*) over(partition by key, code) as n from population
 ), ranked as (
  select *, 1 + (n-1)::numeric*0.5 as median_rank,
   1 + (n-1)::numeric*0.25 as p25_rank, 1 + (n-1)::numeric*0.75 as p75_rank from ordered
 ), statistics as (
  select key, label, code, precision, count(*)::integer as headcount,
   sum(amount) as total, avg(amount) as average, min(amount) as minimum, max(amount) as maximum,
   median_rank, p25_rank, p75_rank,
   max(amount) filter(where position = floor(median_rank)) as median_lo,
   max(amount) filter(where position = ceil(median_rank)) as median_hi,
   max(amount) filter(where position = floor(p25_rank)) as p25_lo,
   max(amount) filter(where position = ceil(p25_rank)) as p25_hi,
   max(amount) filter(where position = floor(p75_rank)) as p75_lo,
   max(amount) filter(where position = ceil(p75_rank)) as p75_hi
  from ranked group by key, label, code, precision, median_rank, p25_rank, p75_rank
 )
 select key, label, code as "currencyCode", precision as "currencyMinorUnits", headcount,
  round(total)::text as total, round(average)::text as average,
  round(minimum)::text as min, round(maximum)::text as max,
  round(median_lo + (median_rank-floor(median_rank))*(median_hi-median_lo))::text as median,
  round(p25_lo + (p25_rank-floor(p25_rank))*(p25_hi-p25_lo))::text as p25,
  round(p75_lo + (p75_rank-floor(p75_rank))*(p75_hi-p75_lo))::text as p75
 from statistics order by key, code
 `);
	return result.rows;
}
export async function summarize(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
) {
	const rows = await summaryRows(db, query, date);
	const summaries = rows.map((row) => paySummarySchema.parse(row));
	if (query.view === "usd" && !summaries.length)
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
export async function groupSummaries(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
	groupBy: PayInsightsGroupBy,
) {
	const rows = await summaryRows(db, query, date, groupBy);
	const groups = new Map<
		string,
		ReturnType<typeof payInsightsGroupSchema.parse>
	>();
	for (const row of rows) {
		const summary = paySummarySchema.parse(row);
		const { key, label } = payInsightsGroupSchema
			.pick({ key: true, label: true })
			.parse(row);
		const group = groups.get(key) ?? {
			key,
			label,
			headcount: 0,
			summaries: [],
		};
		group.headcount += summary.headcount;
		group.summaries.push(summary);
		groups.set(key, group);
	}
	const collator = new Intl.Collator("en", {
		numeric: groupBy === "level",
		sensitivity: "variant",
	});
	return [...groups.values()].sort(
		(a, b) =>
			collator.compare(a.label, b.label) ||
			(a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
	);
}
export async function histogram(
	db: Reader,
	query: PayInsightsQuery,
	date: string | null,
) {
	// Derive the decimal exponent from numeric text, avoiding logarithms and floats.
	// Multiplying by 0.1 keeps all decimal places even for tiny FX fractions.
	// A power-of-ten currency scale preserves the 1/2/5 width family in minor units.
	// Use div/mod for outward alignment to avoid decimal-division rounding at edges.
	const result = await db.execute(sql`
 with population as (${population(query, date)}), ranges as (
  select code, precision, count(*) as n, min(amount) as minimum, max(amount) as maximum
  from population group by code, precision
 ), targets as (
  select *, (maximum-minimum)*0.1::numeric as target from ranges where maximum > minimum
 ), magnitudes as (
  select *, ('1e' || (case when target >= 1 then length(split_part(target::text, '.', 1))-1
   else -length(substring(split_part(target::text, '.', 2) from '^0*'))-1 end)::text)::numeric as magnitude
  from targets
 ), widths as (
  select m.*, w.width from magnitudes m cross join lateral (
   select min(factor * magnitude) as width from (values (1::numeric), (2::numeric), (5::numeric), (10::numeric)) factors(factor)
   where factor * magnitude >= target
  ) w
 ), bounds as (
  select *, div(minimum,width)*width as lower,
   (div(maximum,width) + case when mod(maximum,width) = 0 then 0 else 1 end)*width as upper from widths
 ), bands as (
  select *, div(upper-lower,width)::integer as bucket_count from bounds
 ), counts as (
  select p.code, least(width_bucket(p.amount,b.lower,b.upper,b.bucket_count), b.bucket_count) as bucket, count(*)::integer as n
  from population p join bands b on b.code = p.code group by p.code, bucket
 ), buckets as (
  select b.code, b.precision, b.n, i.bucket,
   trim_scale(b.lower+(i.bucket-1)*b.width)::text as "lowerBound",
   trim_scale(b.lower+i.bucket*b.width)::text as "upperBound",
   i.bucket = b.bucket_count as "upperInclusive", coalesce(c.n,0) as headcount
  from bands b cross join lateral generate_series(1,b.bucket_count) i(bucket)
  left join counts c on c.code = b.code and c.bucket = i.bucket
  union all
  select code, precision, n, 1, trim_scale(minimum)::text, trim_scale(maximum)::text, true, n::integer
  from ranges where minimum = maximum
 )
 select code as "currencyCode", precision as "currencyMinorUnits", n::integer as headcount,
 jsonb_agg(jsonb_build_object('lowerBound', "lowerBound", 'upperBound', "upperBound", 'upperInclusive', "upperInclusive", 'headcount', headcount) order by bucket) as buckets
 from buckets group by code, precision, n order by code
 `);
	const distributions = result.rows.map((row) =>
		payDistributionSchema.parse(row),
	);
	if (query.view === "usd" && !distributions.length)
		distributions.push({
			currencyCode: "USD",
			currencyMinorUnits: 2,
			headcount: 0,
			buckets: [],
		});
	return distributions;
}
