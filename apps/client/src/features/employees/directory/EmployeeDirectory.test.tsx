import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	directoryPage,
	employee,
	FINANCE,
	referenceData,
} from "#/test/fixtures";
import { type ApiHandler, type ApiRequest, renderApp } from "#/test/render-app";

function api(
	listEmployees: (request: ApiRequest) => { status: number; body: unknown },
): ApiHandler {
	return (request) => {
		if (request.url.pathname === "/api/reference-data")
			return { status: 200, body: referenceData };
		if (request.url.pathname === "/api/employees")
			return listEmployees(request);
	};
}

const listRequests = (requests: ApiRequest[]) =>
	requests.filter((request) => request.url.pathname === "/api/employees");
const lastListParams = (requests: ApiRequest[]) =>
	listRequests(requests).at(-1)?.url.searchParams;

describe("employee directory", () => {
	it("lists employees with formatted salaries and the total match count", async () => {
		renderApp(
			"/employees",
			api(() => ({
				status: 200,
				body: directoryPage(
					[
						employee(),
						employee({
							id: "00000000-0000-4000-8000-000000000002",
							code: "EMP00002",
							name: "Kenji Sato",
							countryName: "Japan",
							currencyCode: "JPY",
							currencyMinorUnits: 0,
							salaryMinorUnits: 9_000_000,
							active: false,
						}),
					],
					{ total: 10_000 },
				),
			})),
		);

		const table = await screen.findByRole("table", { name: "Employees" });
		const ada = within(table).getByRole("row", { name: /Ada Lovelace/ });
		expect(within(ada).getByText("$150,000.00")).toBeVisible();
		const kenji = within(table).getByRole("row", { name: /Kenji Sato/ });
		expect(within(kenji).getByText("¥9,000,000")).toBeVisible();
		expect(within(kenji).getByText("Inactive")).toBeVisible();
		expect(screen.getByText(/10,000 results · Page 1 of 400/)).toBeVisible();
	});

	it("searches after typing pauses and keeps the search in the URL", async () => {
		const { requests, router } = renderApp(
			"/employees",
			api(() => ({ status: 200, body: directoryPage([employee()]) })),
		);
		const input = await screen.findByLabelText("Search");

		fireEvent.change(input, { target: { value: "EMP0001" } });

		await waitFor(() =>
			expect(lastListParams(requests)?.get("search")).toBe("EMP0001"),
		);
		expect(router.state.location.search).toMatchObject({ search: "EMP0001" });
	});

	it("filters and sorts on the server, converting salary bounds to minor units", async () => {
		const { requests } = renderApp(
			`/employees?departmentId=%22${FINANCE}%22`,
			api(() => ({ status: 200, body: directoryPage([employee()]) })),
		);
		await screen.findByRole("row", { name: /Ada Lovelace/ });
		expect(lastListParams(requests)?.get("departmentId")).toBe(FINANCE);

		const salaryFrom = screen.getByLabelText("Salary from");
		expect(salaryFrom).toBeDisabled();
		fireEvent.change(screen.getByLabelText("Currency"), {
			target: { value: "USD" },
		});
		await waitFor(() => expect(salaryFrom).toBeEnabled());
		fireEvent.change(salaryFrom, { target: { value: "85000.5" } });
		await waitFor(() =>
			expect(lastListParams(requests)?.get("salaryMin")).toBe("8500050"),
		);
		expect(lastListParams(requests)?.get("currencyCode")).toBe("USD");

		fireEvent.click(screen.getByRole("button", { name: /Salary/ }));
		await waitFor(() =>
			expect(lastListParams(requests)?.get("sortBy")).toBe("salary"),
		);
		// Numeric columns sort highest first on the first click.
		expect(lastListParams(requests)?.get("sortDirection")).toBe("desc");
	});

	it("flags a salary bound that is not an amount without sending it", async () => {
		const { requests } = renderApp(
			"/employees?currencyCode=%22JPY%22&salaryMin=%2210.5%22",
			api(() => ({ status: 200, body: directoryPage([employee()]) })),
		);

		expect(await screen.findByLabelText("Salary from")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(
			screen.getByText("Enter an amount in JPY, such as 85000."),
		).toBeVisible();
		expect(lastListParams(requests)?.has("salaryMin")).toBe(false);
	});

	it("explains an empty result and clears the filters", async () => {
		const { requests } = renderApp(
			"/employees?search=%22nobody%22",
			api((request) => ({
				status: 200,
				body: directoryPage(
					request.url.searchParams.has("search") ? [] : [employee()],
				),
			})),
		);

		expect(
			await screen.findByText(/No employees match these filters/),
		).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

		await screen.findByRole("row", { name: /Ada Lovelace/ });
		expect(screen.getByLabelText("Search")).toHaveValue("");
		expect(lastListParams(requests)?.has("search")).toBe(false);
	});

	it("shows a retryable error when the list fails", async () => {
		let fail = true;
		renderApp(
			"/employees",
			api(() =>
				fail
					? { status: 500, body: { message: "Internal server error" } }
					: { status: 200, body: directoryPage([employee()]) },
			),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load employees.",
		);
		fail = false;
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));

		expect(
			await screen.findByRole("row", { name: /Ada Lovelace/ }),
		).toBeVisible();
	});
});

describe("directory page", () => {
	it("offers a retry when reference data fails to load", async () => {
		let fail = true;
		renderApp("/employees", (request) => {
			if (request.url.pathname === "/api/reference-data")
				return fail
					? { status: 500, body: { message: "Internal server error" } }
					: { status: 200, body: referenceData };
			return { status: 200, body: directoryPage([employee()]) };
		});

		expect(await screen.findByText("This page couldn't load")).toBeVisible();
		fail = false;
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));

		expect(
			await screen.findByRole("row", { name: /Ada Lovelace/ }),
		).toBeVisible();
	});
});
