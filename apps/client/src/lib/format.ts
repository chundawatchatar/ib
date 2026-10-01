import { formatMoney } from "@salary-manager/common";

/** Formats minor units in the viewer's locale. */
export function money(
	minorUnits: number | string,
	currencyCode: string,
	currencyMinorUnits: number,
	{ compact = false } = {},
): string {
	return formatMoney(minorUnits, currencyCode, currencyMinorUnits, {
		locale: navigator.language,
		compact,
	});
}
