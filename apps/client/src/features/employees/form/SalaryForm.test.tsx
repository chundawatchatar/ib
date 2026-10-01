import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { employee, referenceData } from "#/test/fixtures";
import { type ApiHandler, type ApiRequest, renderApp } from "#/test/render-app";

const ada = employee();
const path = `/employees/${ada.id}`;

function api(
	current: () => ReturnType<typeof employee>,
	updateSalary: ApiHandler,
): ApiHandler {
	return (request) => {
		if (request.url.pathname === "/api/reference-data")
			return { status: 200, body: referenceData };
		if (request.url.pathname === `/api/employees/${ada.id}/salary`)
			return updateSalary(request);
		if (request.url.pathname === `/api/employees/${ada.id}`)
			return { status: 200, body: current() };
	};
}

async function salaryForm() {
	return screen.findByRole("form", { name: "Change salary" });
}

function change(form: HTMLElement, label: string, value: string) {
	fireEvent.change(within(form).getByLabelText(label), { target: { value } });
}

const salaryRequests = (requests: ApiRequest[]) =>
	requests.filter((request) => request.url.pathname.endsWith("/salary"));

describe("salary edit", () => {
	it("saves the new salary in minor units and shows the refreshed amount", async () => {
		let current = ada;
		const { requests } = renderApp(
			path,
			api(
				() => current,
				() => {
					current = employee({ salaryMinorUnits: 16_000_000, version: 2 });
					return { status: 200, body: current };
				},
			),
		);
		const form = await salaryForm();
		expect(within(form).getByLabelText("New annual salary")).toHaveValue(
			"150000.00",
		);

		change(form, "New annual salary", "160000");
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));

		expect(await within(form).findByText("Salary saved.")).toBeVisible();
		expect(screen.getByText("$160,000.00")).toBeVisible();
		expect(within(form).getByLabelText("New annual salary")).toHaveValue(
			"160000.00",
		);
		expect(salaryRequests(requests)[0]).toMatchObject({
			method: "PUT",
			body: { version: 1, currencyCode: "USD", salaryMinorUnits: 16_000_000 },
		});
		expect(salaryRequests(requests)[0]?.body).not.toHaveProperty("reason");
	});

	it("sends a reason when one is given", async () => {
		const { requests } = renderApp(
			path,
			api(
				() => ada,
				() => ({ status: 200, body: employee({ version: 2 }) }),
			),
		);
		const form = await salaryForm();
		change(form, "New annual salary", "155000");
		change(form, "Reason (optional)", "Annual review");
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));

		await waitFor(() =>
			expect(salaryRequests(requests)[0]?.body).toMatchObject({
				reason: "Annual review",
			}),
		);
	});

	it("checks the amount against the chosen currency without saving", async () => {
		const { requests } = renderApp(
			path,
			api(
				() => ada,
				() => ({ status: 200, body: ada }),
			),
		);
		const form = await salaryForm();
		change(form, "Currency", "JPY");
		change(form, "New annual salary", "1000.50");
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));

		expect(
			await within(form).findByText("Enter a positive whole amount"),
		).toBeVisible();
		expect(salaryRequests(requests)).toHaveLength(0);
	});

	it("keeps the input on a stale edit and retries with the reloaded version", async () => {
		let current = ada;
		const { requests } = renderApp(
			path,
			api(
				() => current,
				(request) => {
					if (salaryRequests(requests).length === 1) {
						current = employee({ salaryMinorUnits: 15_500_000, version: 5 });
						return {
							status: 409,
							body: { message: "Employee was changed by another request" },
						};
					}
					return {
						status: 200,
						body: { ...current, ...(request.body as object), version: 6 },
					};
				},
			),
		);
		const form = await salaryForm();
		change(form, "New annual salary", "160000");
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));

		expect(
			await screen.findByText("Someone else changed this employee"),
		).toBeVisible();
		expect(within(form).getByLabelText("New annual salary")).toHaveValue(
			"160000",
		);

		fireEvent.click(screen.getByRole("button", { name: "Load latest values" }));
		await waitFor(() =>
			expect(within(form).getByLabelText("New annual salary")).toHaveValue(
				"155000.00",
			),
		);

		change(form, "New annual salary", "160000");
		fireEvent.click(within(form).getByRole("button", { name: "Save salary" }));

		expect(await within(form).findByText("Salary saved.")).toBeVisible();
		expect(salaryRequests(requests).at(-1)?.body).toMatchObject({
			version: 5,
			salaryMinorUnits: 16_000_000,
		});
	});
});
