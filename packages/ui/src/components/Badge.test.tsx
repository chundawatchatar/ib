import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Badge } from "./Badge";

afterEach(cleanup);

function classesOf(variant: "secondary" | "destructive") {
	render(<Badge variant={variant}>Status</Badge>);
	return screen.getByText("Status").className.split(" ");
}

// Regression: variant colors were overridden by later base CSS rules.
it("gives the secondary variant muted text instead of the default color", () => {
	const classes = classesOf("secondary");
	expect(classes).toContain("text-muted-foreground");
	expect(classes).not.toContain("text-foreground");
});

it("gives the destructive variant a destructive border, not the default border", () => {
	const classes = classesOf("destructive");
	expect(classes).toContain("border-destructive");
	expect(classes).toContain("text-destructive");
	expect(classes).not.toContain("border-border");
});

it("lets a consumer class replace a conflicting variant class", () => {
	render(<Badge className="rounded-ui">Status</Badge>);
	const classes = screen.getByText("Status").className.split(" ");
	expect(classes).toContain("rounded-ui");
	expect(classes).not.toContain("rounded-full");
});
