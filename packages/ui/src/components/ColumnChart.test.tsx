import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ColumnChart, niceMaximum } from "./ColumnChart";

afterEach(cleanup);

describe("niceMaximum", () => {
	it("rounds up to 1, 2, or 5 times a power of ten", () => {
		expect(niceMaximum(0)).toBe(1);
		expect(niceMaximum(3)).toBe(5);
		expect(niceMaximum(10)).toBe(10);
		expect(niceMaximum(1_234)).toBe(2_000);
	});
});

describe("ColumnChart", () => {
	const data = [
		{ key: "a", label: "$0–$10K", value: 4 },
		{ key: "b", label: "$10K–$20K", value: 10 },
	];

	it("names each column with its label and value, scaled to the axis", () => {
		render(
			<ColumnChart
				title="Salary distribution"
				data={data}
				labelHeader="Band"
				valueHeader="Employees"
			/>,
		);

		const chart = screen.getByRole("list", { name: "Salary distribution" });
		const columns = within(chart).getAllByRole("listitem");
		expect(columns.map((column) => column.getAttribute("aria-label"))).toEqual([
			"$0–$10K: 4",
			"$10K–$20K: 10",
		]);
		expect(
			columns[0]?.querySelector<HTMLElement>(".bg-chart")?.style.height,
		).toBe("40%");
		expect(columns[1]?.getAttribute("tabindex")).toBe("0");
	});

	it("offers the same data as a table", () => {
		render(
			<ColumnChart
				title="Salary distribution"
				data={data}
				labelHeader="Band"
				valueHeader="Employees"
			/>,
		);

		const table = screen.getByRole("table", {
			name: "Salary distribution",
			hidden: true,
		});
		expect(
			within(table)
				.getAllByRole("row", { hidden: true })
				.map((row) => row.textContent),
		).toEqual(["BandEmployees", "$0–$10K4", "$10K–$20K10"]);
	});
});
