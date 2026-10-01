import { describe, expect, it } from "vitest";
import { formatMoney, minorToMajorText, parseMajorUnits } from "./money";

describe("formatMoney", () => {
	it("formats minor units at the currency's precision", () => {
		expect(formatMoney(10_000_000, "USD", 2, { locale: "en-US" })).toBe(
			"$100,000.00",
		);
		expect(formatMoney(9_000_000, "JPY", 0, { locale: "en-US" })).toBe(
			"¥9,000,000",
		);
	});

	it("keeps totals beyond the safe-integer range exact", () => {
		expect(
			formatMoney("123456789012345678901", "USD", 2, { locale: "en-US" }),
		).toBe("$1,234,567,890,123,456,789.01");
	});

	it("matches the acceptance average of 116,333.33", () => {
		expect(formatMoney("11633333", "USD", 2, { locale: "en-US" })).toBe(
			"$116,333.33",
		);
	});

	it("rounds fractional minor units only for display", () => {
		expect(formatMoney("12345.5", "USD", 2, { locale: "en-US" })).toBe(
			"$123.46",
		);
	});

	it("has a compact form for chart labels", () => {
		expect(
			formatMoney(125_000_000, "USD", 2, { locale: "en-US", compact: true }),
		).toBe("$1.3M");
	});
});

describe("minorToMajorText", () => {
	it("moves the decimal point without grouping", () => {
		expect(minorToMajorText(5, 2)).toBe("0.05");
		expect(minorToMajorText(1_234_567, 2)).toBe("12345.67");
		expect(minorToMajorText(900, 0)).toBe("900");
	});
});

describe("parseMajorUnits", () => {
	it("converts major-unit text to integer minor units", () => {
		expect(parseMajorUnits("1234.5", 2)).toBe(123_450);
		expect(parseMajorUnits(" 0.07 ", 2)).toBe(7);
		expect(parseMajorUnits("900", 0)).toBe(900);
	});

	it("rejects text that is not an amount at the currency's precision", () => {
		expect(parseMajorUnits("", 2)).toBeUndefined();
		expect(parseMajorUnits("-5", 2)).toBeUndefined();
		expect(parseMajorUnits("1,000", 2)).toBeUndefined();
		expect(parseMajorUnits("1.234", 2)).toBeUndefined();
		expect(parseMajorUnits("1.5", 0)).toBeUndefined();
		expect(parseMajorUnits("90071992547409.92", 2)).toBeUndefined();
	});
});
