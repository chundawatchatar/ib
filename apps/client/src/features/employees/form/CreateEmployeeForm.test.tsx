import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	ENGINEER,
	ENGINEERING,
	employee,
	referenceData,
} from "#/test/fixtures";
import { type ApiHandler, renderApp } from "#/test/render-app";

const created = employee({
	id: "00000000-0000-4000-8000-0000000000c1",
	name: "Grace Hopper",
	code: "EMP09999",
	countryCode: "DE",
	countryName: "Germany",
	currencyCode: "EUR",
	salaryMinorUnits: 8_500_050,
});

function api(createEmployee: ApiHandler): ApiHandler {
	return (request) => {
		const path = request.url.pathname;
		if (path === "/api/reference-data")
			return { status: 200, body: referenceData };
		if (path === "/api/employees" && request.method === "POST")
			return createEmployee(request);
		if (path === `/api/employees/${created.id}`)
			return { status: 200, body: created };
	};
}

function fill(label: string, value: string) {
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillValidEmployee() {
	await screen.findByLabelText("Full name");
	fill("Full name", " Grace Hopper ");
	fill("Employee code", "EMP09999");
	fill("Country", "DE");
	fill("Department", ENGINEERING);
	fill("Job title", ENGINEER);
	fill("Level", "L3");
	fill("Annual base salary", "85000.50");
}

describe("new employee form", () => {
	it("suggests the country's currency and creates the employee in minor units", async () => {
		const { requests, router } = renderApp(
			"/employees/new",
			api(() => ({ status: 201, body: created })),
		);
		await fillValidEmployee();
		expect(screen.getByLabelText("Salary currency")).toHaveValue("EUR");

		fireEvent.click(screen.getByRole("button", { name: "Add employee" }));

		await waitFor(() =>
			expect(router.state.location.pathname).toBe(`/employees/${created.id}`),
		);
		expect(requests.find((request) => request.method === "POST")?.body).toEqual(
			{
				name: "Grace Hopper",
				code: "EMP09999",
				countryCode: "DE",
				departmentId: ENGINEERING,
				jobTitleId: ENGINEER,
				level: "L3",
				currencyCode: "EUR",
				salaryMinorUnits: 8_500_050,
			},
		);
		expect(
			await screen.findByRole("heading", { name: "Grace Hopper" }),
		).toBeVisible();
	});

	it("shows field errors without sending an invalid employee", async () => {
		const { requests } = renderApp(
			"/employees/new",
			api(() => ({ status: 201, body: created })),
		);
		await screen.findByLabelText("Full name");
		fill("Annual base salary", "85,000");

		fireEvent.click(screen.getByRole("button", { name: "Add employee" }));

		expect(
			await screen.findByText(
				"Enter an amount without commas, such as 85000.50",
			),
		).toBeVisible();
		expect(screen.getByLabelText("Full name")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
		expect(requests.some((request) => request.method === "POST")).toBe(false);
	});

	it("checks the salary against the currency's precision", async () => {
		const { requests } = renderApp(
			"/employees/new",
			api(() => ({ status: 201, body: created })),
		);
		await fillValidEmployee();
		fill("Salary currency", "JPY");
		fill("Annual base salary", "1000.5");

		fireEvent.click(screen.getByRole("button", { name: "Add employee" }));

		expect(
			await screen.findByText("Enter a positive whole amount"),
		).toBeVisible();
		expect(requests.some((request) => request.method === "POST")).toBe(false);
	});

	it("keeps the input and explains a rejected save", async () => {
		renderApp(
			"/employees/new",
			api(() => ({
				status: 409,
				body: { message: "Employee code EMP09999 is already in use" },
			})),
		);
		await fillValidEmployee();

		fireEvent.click(screen.getByRole("button", { name: "Add employee" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Employee code EMP09999 is already in use",
		);
		expect(screen.getByLabelText("Employee code")).toHaveValue("EMP09999");
		expect(screen.getByLabelText("Annual base salary")).toHaveValue("85000.50");
	});
});
