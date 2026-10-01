import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Input } from "./Input.js";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
it("debounces typing, clears immediately and cancels on unmount", () => {
	vi.useFakeTimers();
	const onDebouncedChange = vi.fn();
	const { unmount } = render(
		<Input
			type="search"
			aria-label="Search employees"
			onDebouncedChange={onDebouncedChange}
		/>,
	);
	const input = screen.getByRole("searchbox");
	fireEvent.change(input, { target: { value: "Ada" } });
	expect(onDebouncedChange).not.toHaveBeenCalled();
	act(() => vi.advanceTimersByTime(300));
	expect(onDebouncedChange).toHaveBeenLastCalledWith("Ada");
	fireEvent.change(input, { target: { value: "Grace" } });
	fireEvent.change(input, { target: { value: "" } });
	expect(onDebouncedChange).toHaveBeenLastCalledWith("");
	act(() => vi.advanceTimersByTime(300));
	expect(onDebouncedChange).toHaveBeenCalledTimes(2);
	fireEvent.change(input, { target: { value: "Alan" } });
	unmount();
	act(() => vi.advanceTimersByTime(300));
	expect(onDebouncedChange).toHaveBeenCalledTimes(2);
});

// Regression: the timer called the callback captured at keypress time.
it("delivers the debounced value to the latest callback after a re-render", () => {
	vi.useFakeTimers();
	const first = vi.fn();
	const latest = vi.fn();
	const { rerender } = render(
		<Input type="search" aria-label="Search" onDebouncedChange={first} />,
	);
	fireEvent.change(screen.getByRole("searchbox"), {
		target: { value: "Ada" },
	});
	rerender(
		<Input type="search" aria-label="Search" onDebouncedChange={latest} />,
	);
	act(() => vi.advanceTimersByTime(300));
	expect(first).not.toHaveBeenCalled();
	expect(latest).toHaveBeenCalledExactlyOnceWith("Ada");
});
