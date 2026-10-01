import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { employee, referenceData } from "#/test/fixtures";
import { type ApiHandler, renderApp } from "#/test/render-app";

const ada = employee();
const path = `/employees/${ada.id}`;

/** Serves reference data and the employee, and routes writes to `write`. */
function api(
	current: () => ReturnType<typeof employee>,
	write: ApiHandler = () => undefined,
): ApiHandler {
	return (request) => {
		if (request.url.pathname === "/api/reference-data")
			return { status: 200, body: referenceData };
		if (request.method !== "GET") return write(request);
		if (request.url.pathname === `/api/employees/${ada.id}`)
			return { status: 200, body: current() };
	};
}

const profile = () => screen.findByRole("form", { name: "Profile" });

describe("employee profile", () => {
	it("saves edits with the version that was loaded", async () => {
		let current = ada;
		const { requests } = renderApp(
			path,
			api(
				() => current,
				(request) => {
					current = employee({ name: "Ada King", version: 2 });
					return request.url.pathname === `/api/employees/${ada.id}`
						? { status: 200, body: current }
						: undefined;
				},
			),
		);
		const form = await profile();
		const save = within(form).getByRole("button", { name: "Save changes" });
		expect(save).toBeDisabled();

		fireEvent.change(within(form).getByLabelText("Full name"), {
			target: { value: "Ada King" },
		});
		fireEvent.click(save);

		expect(await within(form).findByText("Changes saved.")).toBeVisible();
		expect(requests.find((request) => request.method === "PUT")?.body).toEqual({
			code: ada.code,
			name: "Ada King",
			countryCode: ada.countryCode,
			departmentId: ada.departmentId,
			jobTitleId: ada.jobTitleId,
			level: ada.level,
			version: 1,
		});
		expect(
			await screen.findByRole("heading", { name: "Ada King" }),
		).toBeVisible();
	});

	it("rejects a stale edit and reloads the latest values on request", async () => {
		let current = ada;
		const { requests } = renderApp(
			path,
			api(
				() => current,
				() => {
					current = employee({ name: "Ada Byron", version: 3 });
					return {
						status: 409,
						body: { message: "Employee was changed by another request" },
					};
				},
			),
		);
		const form = await profile();
		fireEvent.change(within(form).getByLabelText("Level"), {
			target: { value: "L3" },
		});
		fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));

		expect(
			await screen.findByText("Someone else changed this employee"),
		).toBeVisible();
		expect(within(form).getByLabelText("Level")).toHaveValue("L3");

		fireEvent.click(screen.getByRole("button", { name: "Load latest values" }));

		await waitFor(() =>
			expect(within(form).getByLabelText("Full name")).toHaveValue("Ada Byron"),
		);
		expect(within(form).getByLabelText("Level")).toHaveValue(ada.level);
		expect(
			screen.queryByText("Someone else changed this employee"),
		).not.toBeInTheDocument();

		fireEvent.change(within(form).getByLabelText("Level"), {
			target: { value: "L3" },
		});
		current = employee({ name: "Ada Byron", level: "L3", version: 4 });
		fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
		await waitFor(() =>
			expect(
				requests.filter((request) => request.method === "PUT").at(-1)?.body,
			).toMatchObject({ level: "L3", version: 3 }),
		);
	});

	it("shows server validation issues on their fields", async () => {
		renderApp(
			path,
			api(
				() => ada,
				() => ({
					status: 400,
					body: {
						message: "Invalid request",
						issues: [
							{
								location: "body",
								path: "countryCode",
								message: "Unknown country",
							},
						],
					},
				}),
			),
		);
		const form = await profile();
		fireEvent.change(within(form).getByLabelText("Full name"), {
			target: { value: "Ada King" },
		});
		fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));

		expect(await within(form).findByText("Unknown country")).toBeVisible();
		expect(within(form).getByLabelText("Country")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(within(form).getByRole("alert")).toHaveTextContent(
			"Fix the highlighted fields and save again.",
		);
		expect(within(form).getByLabelText("Full name")).toHaveValue("Ada King");
	});
});

describe("deactivation", () => {
	it("asks for confirmation, then deactivates with the current version", async () => {
		let current = ada;
		const { requests } = renderApp(
			path,
			api(
				() => current,
				() => {
					current = employee({ active: false, version: 2 });
					return { status: 200, body: current };
				},
			),
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Deactivate employee" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

		expect(await screen.findByText(/This employee is inactive/)).toBeVisible();
		expect(screen.getByText("Inactive")).toBeVisible();
		expect(
			requests.find((request) => request.method === "POST")?.url.pathname,
		).toBe(`/api/employees/${ada.id}/deactivate`);
		expect(requests.find((request) => request.method === "POST")?.body).toEqual(
			{ version: 1 },
		);
	});

	it("can be cancelled without a request", async () => {
		const { requests } = renderApp(
			path,
			api(() => ada),
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Deactivate employee" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Keep active" }));

		expect(
			screen.getByRole("button", { name: "Deactivate employee" }),
		).toBeVisible();
		expect(requests.some((request) => request.method === "POST")).toBe(false);
	});
});

describe("employee page", () => {
	it("explains when the employee does not exist", async () => {
		renderApp("/employees/00000000-0000-4000-8000-00000000ffff", (request) =>
			request.url.pathname === "/api/reference-data"
				? { status: 200, body: referenceData }
				: { status: 404, body: { message: "Employee not found" } },
		);

		expect(await screen.findByText("Employee not found")).toBeVisible();
	});
});
