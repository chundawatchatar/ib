// Money crosses the API as integer minor units (numbers, or decimal strings for
// totals that can exceed the safe-integer range). These helpers convert by
// moving the decimal point in text, so no value passes through a float.

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/** Divides a nonnegative decimal string by 10^places exactly ("12345", 2 → "123.45"). */
function shiftLeft(value: string, places: number): string {
	const match = DECIMAL.exec(value);
	if (!match) throw new RangeError(`Not a nonnegative decimal: ${value}`);
	const [, whole = "", fraction = ""] = match;
	const digits = whole.padStart(places + 1, "0");
	const integer = digits
		.slice(0, digits.length - places)
		.replace(/^0+(?=\d)/, "");
	const decimals = `${digits.slice(digits.length - places)}${fraction}`;
	return decimals ? `${integer}.${decimals}` : integer;
}

export type MoneyFormatOptions = {
	locale?: string;
	/** Short form for chart labels, such as "$1.2M". */
	compact?: boolean;
};

/**
 * Formats minor units as currency. Fractional minor units (histogram bounds)
 * are kept and rounded half-expand only at display precision.
 */
export function formatMoney(
	minorUnits: number | string,
	currencyCode: string,
	currencyMinorUnits: number,
	{ locale, compact = false }: MoneyFormatOptions = {},
): string {
	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currencyCode,
		...(compact
			? { notation: "compact", maximumFractionDigits: 1 }
			: {
					minimumFractionDigits: currencyMinorUnits,
					maximumFractionDigits: currencyMinorUnits,
				}),
	});
	// Intl formats numeric strings exactly, without converting them to numbers.
	const exact = shiftLeft(String(minorUnits), currencyMinorUnits);
	return formatter.format(exact as Intl.StringNumericLiteral);
}

/** Major units as plain decimal text for inputs ("123.45"); no grouping or symbol. */
export function minorToMajorText(
	minorUnits: number | string,
	currencyMinorUnits: number,
): string {
	return shiftLeft(String(minorUnits), currencyMinorUnits);
}

/**
 * Parses major-unit text ("1234.5") into integer minor units. Returns
 * undefined for anything that is not a nonnegative amount at the currency's
 * precision, or that exceeds the safe-integer range.
 */
export function parseMajorUnits(
	text: string,
	currencyMinorUnits: number,
): number | undefined {
	const match = DECIMAL.exec(text.trim());
	if (!match) return undefined;
	const [, whole = "", fraction = ""] = match;
	if (fraction.length > currencyMinorUnits) return undefined;
	const minor = BigInt(`${whole}${fraction.padEnd(currencyMinorUnits, "0")}`);
	if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
	return Number(minor);
}
