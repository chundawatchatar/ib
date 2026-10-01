import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom lacks these browser APIs used by the theme toggle and router.
function stubBrowserApis() {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
	vi.stubGlobal("scrollTo", vi.fn());
}

beforeEach(stubBrowserApis);

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.localStorage.clear();
});
