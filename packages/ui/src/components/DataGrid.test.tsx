import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DataGrid } from "./DataGrid";

afterEach(cleanup);
const columns = [{ accessorKey: "name", header: "Name" }];
it("sorts rows and paginates locally", () => {
	render(
		<DataGrid
			label="Employees"
			columns={columns}
			data={Array.from({ length: 12 }, (_, i) => ({
				name: `Employee ${String(12 - i).padStart(2, "0")}`,
			}))}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: /Name/ }));
	expect(screen.getAllByRole("cell")[0]?.textContent).toBe("Employee 01");
	fireEvent.click(screen.getByRole("button", { name: "Next" }));
	expect(screen.getByText("Employee 12")).toBeTruthy();
	expect(screen.queryByText("Employee 01")).toBeNull();
});
it("uses the total count with server pagination without slicing the supplied page", () => {
	const onPaginationChange = vi.fn();
	render(
		<DataGrid
			label="Employees"
			columns={columns}
			data={[{ name: "Ada" }]}
			manualPagination
			rowCount={100}
			pagination={{ pageIndex: 2, pageSize: 10 }}
			onPaginationChange={onPaginationChange}
		/>,
	);
	expect(screen.getByText("Ada")).toBeTruthy();
	expect(screen.getByText(/100 results · Page 3 of 10/)).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Next" }));
	const updater = onPaginationChange.mock.calls[0]?.[0];
	expect(updater({ pageIndex: 2, pageSize: 10 })).toEqual({
		pageIndex: 3,
		pageSize: 10,
	});
});
it("shows loading, empty and actionable error states", () => {
	const onRetry = vi.fn();
	const { rerender } = render(
		<DataGrid label="Employees" columns={columns} data={[]} isLoading />,
	);
	expect(screen.getByText("Loading results…")).toBeTruthy();
	rerender(<DataGrid label="Employees" columns={columns} data={[]} />);
	expect(screen.getByText("No results found.")).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "Next" }).hasAttribute("disabled"),
	).toBe(true);
	rerender(
		<DataGrid
			label="Employees"
			columns={columns}
			data={[]}
			error="Unable to load employees."
			onRetry={onRetry}
		/>,
	);
	expect(screen.getByRole("alert").textContent).toContain(
		"Unable to load employees.",
	);
	fireEvent.click(screen.getByRole("button", { name: "Retry" }));
	expect(onRetry).toHaveBeenCalledOnce();
});

// Regression: server pagination without sort handlers showed inert sort buttons.
it("hides sort controls for server data when sorting is not handled", () => {
	render(
		<DataGrid
			label="Employees"
			columns={columns}
			data={[{ name: "Ada" }]}
			manualPagination
			rowCount={1}
			pagination={{ pageIndex: 0, pageSize: 10 }}
			onPaginationChange={() => {}}
		/>,
	);
	expect(screen.queryByRole("button", { name: /Name/ })).toBeNull();
	expect(
		screen
			.getByRole("columnheader", { name: "Name" })
			.hasAttribute("aria-sort"),
	).toBe(false);
});

it("requests server sorting when the consumer handles it", () => {
	const onSortingChange = vi.fn();
	render(
		<DataGrid
			label="Employees"
			columns={columns}
			data={[{ name: "Ada" }]}
			manualPagination
			rowCount={1}
			pagination={{ pageIndex: 0, pageSize: 10 }}
			onPaginationChange={() => {}}
			sorting={[]}
			onSortingChange={onSortingChange}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: /Name/ }));
	expect(onSortingChange).toHaveBeenCalledOnce();
});
it("right-aligns columns marked as numeric", () => {
	render(
		<DataGrid
			label="Salaries"
			columns={[
				{ accessorKey: "name", header: "Name", enableSorting: false },
				{
					accessorKey: "salary",
					header: "Salary",
					enableSorting: false,
					meta: { align: "right" },
				},
			]}
			data={[{ name: "Ada", salary: "$100.00" }]}
		/>,
	);
	expect(screen.getByRole("columnheader", { name: "Salary" })).toHaveProperty(
		"className",
		expect.stringContaining("text-right"),
	);
	expect(screen.getByRole("cell", { name: "$100.00" }).className).toContain(
		"text-right",
	);
	expect(screen.getByRole("cell", { name: "Ada" }).className).not.toContain(
		"text-right",
	);
});

// Regression: new filters showed the first page at the old scroll offset.
it("scrolls back to the first row when the results change", () => {
	const grid = (key: string) => (
		<DataGrid
			label="Employees"
			columns={columns}
			data={[{ name: "Ada" }]}
			scrollResetKey={key}
		/>
	);
	const { rerender } = render(grid("search=a"));
	const scrollArea = screen.getByRole("table").parentElement;
	if (!scrollArea) throw new Error("missing scroll area");
	scrollArea.scrollTop = 200;
	rerender(grid("search=a"));
	expect(scrollArea.scrollTop).toBe(200);
	rerender(grid("search=b"));
	expect(scrollArea.scrollTop).toBe(0);
});
