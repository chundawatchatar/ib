import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ENGINEERING, employee, FINANCE, referenceData } from "#/test/fixtures";
import { type ApiHandler, type ApiRequest, renderApp } from "#/test/render-app";

// Requirements acceptance fixture: USD 100,000; USD 150,000; EUR 90,000;
// EUR→USD 1.10. Amounts are minor-unit strings, as the API sends them.
function summary(
	currencyCode: string,
	headcount: number,
	values: Partial<
		Record<
			"total" | "average" | "median" | "min" | "max" | "p25" | "p75",
			string
		>
	>,
) {
	return {
		currencyCode,
		currencyMinorUnits: 2,
		headcount,
		total: "0",
		average: null,
		median: null,
		min: null,
		max: null,
		p25: null,
		p75: null,
		...values,
	};
}

const usdLocal = (top = "15000000") =>
	summary("USD", 2, {
		total: String(10_000_000 + Number(top)),
		average: String((10_000_000 + Number(top)) / 2),
		median: String((10_000_000 + Number(top)) / 2),
		min: "10000000",
		max: top,
		p25: "11250000",
		p75: "13750000",
	});
const eurLocal = summary("EUR", 1, {
	total: "9000000",
	average: "9000000",
	median: "9000000",
	min: "9000000",
	max: "9000000",
	p25: "9000000",
	p75: "9000000",
});
const usdNormalized = summary("USD", 3, {
	total: "34900000",
	average: "11633333",
	median: "10000000",
	min: "9900000",
	max: "15000000",
	p25: "9950000",
	p75: "12500000",
});

function reports({ usdTop = "15000000" } = {}): ApiHandler {
	return (request) => {
		const view = request.url.searchParams.get("view");
		const report = {
			view,
			headcount: 3,
			rateDate: view === "usd" ? "2026-01-01" : null,
		};
		switch (request.url.pathname) {
			case "/api/reference-data":
				return { status: 200, body: referenceData };
			case "/api/insights/summary":
				return {
					status: 200,
					body: {
						...report,
						summaries:
							view === "usd" ? [usdNormalized] : [eurLocal, usdLocal(usdTop)],
					},
				};
			case "/api/insights/groups":
				return {
					status: 200,
					body: {
						...report,
						groupBy: request.url.searchParams.get("groupBy"),
						groups: [
							{
								key: ENGINEERING,
								label: "Engineering",
								headcount: 2,
								summaries: [
									eurLocal,
									summary("USD", 1, { median: "10000000" }),
								],
							},
							{
								key: FINANCE,
								label: "Finance",
								headcount: 1,
								summaries: [summary("USD", 1, { median: usdTop })],
							},
						],
					},
				};
			case "/api/insights/histogram":
				return {
					status: 200,
					body: {
						...report,
						distributions: [
							{
								currencyCode: "EUR",
								currencyMinorUnits: 2,
								headcount: 1,
								buckets: [
									{
										lowerBound: "9000000",
										upperBound: "9000000",
										upperInclusive: true,
										headcount: 1,
									},
								],
							},
							{
								currencyCode: "USD",
								currencyMinorUnits: 2,
								headcount: 2,
								buckets: [
									{
										lowerBound: "10000000",
										upperBound: "12000000",
										upperInclusive: false,
										headcount: 1,
									},
									{
										lowerBound: "12000000",
										upperBound: "14000000",
										upperInclusive: false,
										headcount: 0,
									},
									{
										lowerBound: "14000000",
										upperBound: "16000000",
										upperInclusive: true,
										headcount: 1,
									},
								],
							},
						],
					},
				};
		}
	};
}

const lastParams = (requests: ApiRequest[], path: string) =>
	requests.filter((request) => request.url.pathname === path).at(-1)?.url
		.searchParams;

const summaryRow = async (currency: string) =>
	within(await screen.findByRole("table", { name: "Pay summary" })).getByRole(
		"row",
		{ name: new RegExp(`^${currency}`) },
	);

describe("pay insights", () => {
	it("reports each local currency separately for active employees", async () => {
		const { requests } = renderApp("/insights", reports());

		const usd = await summaryRow("USD");
		expect(within(usd).getByText("$250,000.00")).toBeVisible();
		expect(within(usd).getAllByText("$125,000.00")).toHaveLength(2);
		expect(within(usd).getByText("$100,000.00")).toBeVisible();
		expect(within(usd).getByText("$150,000.00")).toBeVisible();
		const eur = await summaryRow("EUR");
		expect(within(eur).getAllByText("€90,000.00").length).toBeGreaterThan(0);
		expect(
			screen.getByText(/Each currency is reported separately/),
		).toBeVisible();
		expect(lastParams(requests, "/api/insights/summary")?.get("status")).toBe(
			"active",
		);
	});

	it("switches to USD-normalized figures and states the rate date", async () => {
		const { requests } = renderApp("/insights", reports());
		await summaryRow("USD");

		fireEvent.click(screen.getByRole("radio", { name: "USD" }));

		await waitFor(() => expect(screen.getByText("$349,000.00")).toBeVisible());
		expect(screen.getByText("$116,333.33")).toBeVisible();
		expect(
			screen.getByText(
				"All amounts converted to USD at exchange rates dated 2026-01-01.",
			),
		).toBeVisible();
		expect(lastParams(requests, "/api/insights/groups")?.get("view")).toBe(
			"usd",
		);
	});

	it("groups pay by the chosen dimension without combining currencies", async () => {
		const { requests } = renderApp(
			`/insights?departmentId=%22${ENGINEERING}%22`,
			reports(),
		);
		await screen.findByRole("table", { name: "Pay by country" });
		expect(
			lastParams(requests, "/api/insights/groups")?.get("departmentId"),
		).toBe(ENGINEERING);

		fireEvent.change(screen.getByLabelText("Group by"), {
			target: { value: "department" },
		});

		await waitFor(() =>
			expect(lastParams(requests, "/api/insights/groups")?.get("groupBy")).toBe(
				"department",
			),
		);
		const grouped = await screen.findByRole("table", {
			name: "Pay by department",
		});
		const engineering = within(grouped).getByRole("cell", {
			name: "Engineering",
		});
		expect(engineering).toHaveAttribute("rowspan", "2");
		expect(within(grouped).getAllByRole("row")).toHaveLength(4);
	});

	it("charts the distribution of the largest currency and switches currency", async () => {
		renderApp("/insights", reports());

		const chart = await screen.findByRole("list", {
			name: "Salary distribution in USD",
		});
		expect(
			within(chart)
				.getAllByRole("listitem")
				.map((column) => column.getAttribute("aria-label")),
		).toEqual(["$100K–$120K: 1", "$120K–$140K: 0", "$140K–$160K: 1"]);

		fireEvent.change(screen.getByLabelText("Distribution currency"), {
			target: { value: "EUR" },
		});
		expect(
			await screen.findByRole("list", { name: "Salary distribution in EUR" }),
		).toBeVisible();
	});

	it("explains a report the server cannot produce, with a retry", async () => {
		let missingRates = true;
		const ok = reports();
		renderApp("/insights?view=%22usd%22", (request) =>
			missingRates && request.url.pathname === "/api/insights/summary"
				? {
						status: 422,
						body: {
							message: "Missing USD exchange rates for EUR at 2026-01-01",
						},
					}
				: ok(request),
		);

		const section = await screen.findByText(
			"Missing USD exchange rates for EUR at 2026-01-01",
		);
		missingRates = false;
		fireEvent.click(within(section).getByRole("button", { name: "Retry" }));

		expect(await screen.findByText("$349,000.00")).toBeVisible();
	});

	it("refreshes reports after a salary save", async () => {
		let usdTop = "15000000";
		const ada = employee();
		const insights = (request: ApiRequest) => reports({ usdTop })(request);
		const { router } = renderApp("/insights", (request) => {
			if (request.url.pathname === `/api/employees/${ada.id}/salary`) {
				usdTop = "16000000";
				return {
					status: 200,
					body: employee({ salaryMinorUnits: 16_000_000, version: 2 }),
				};
			}
			if (request.url.pathname === `/api/employees/${ada.id}`)
				return { status: 200, body: ada };
			return insights(request);
		});
		expect(
			within(await summaryRow("USD")).getByText("$250,000.00"),
		).toBeVisible();

		await router.navigate({
			to: "/employees/$employeeId",
			params: { employeeId: ada.id },
		});
		const form = await screen.findByRole("form", { name: "Change salary" });
		fireEvent.change(within(form).getByLabelText("New annual salary"), {
			target: { value: "160000" },
		});
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));
		await within(form).findByText("Salary saved.");
		await router.navigate({ to: "/insights" });

		const usd = await summaryRow("USD");
		await waitFor(() =>
			expect(within(usd).getByText("$260,000.00")).toBeVisible(),
		);
		expect(within(usd).getAllByText("$130,000.00")).toHaveLength(2);
	});
});
