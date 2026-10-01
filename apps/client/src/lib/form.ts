import { fieldDescriptionIds } from "@salary-manager/ui";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { ApiError, errorMessage } from "./api";

// Contract schemas own the rules; this only rewords their messages for empty
// fields, which would otherwise read "Invalid uuid" or "Invalid". Registered
// once for the client, because the form resolver takes no per-form error map.
z.setErrorMap((_issue, context) =>
	context.data === "" || context.data === undefined
		? { message: "Required" }
		: { message: context.defaultError },
);

export const isConflict = (error: unknown) =>
	error instanceof ApiError && error.status === 409;

/** Puts server validation issues on the matching form fields. */
export function setServerFieldErrors<T extends FieldValues>(
	error: unknown,
	setError: UseFormSetError<T>,
	toField: (path: string) => Path<T> | undefined,
) {
	if (!(error instanceof ApiError)) return;
	for (const issue of error.issues) {
		const field = toField(issue.path);
		if (field) setError(field, { type: "server", message: issue.message });
	}
}

/** Form-level message for a failed save; field issues are shown on the fields. */
export function saveErrorMessage(error: unknown): string {
	if (error instanceof ApiError && error.status === 400 && error.issues.length)
		return "Fix the highlighted fields and save again.";
	return errorMessage(
		error,
		"Couldn't save. Check your connection and try again.",
	);
}

/** ARIA wiring for a control inside a FormField with this id. */
export function controlProps(id: string, error: string | undefined) {
	return {
		id,
		"aria-invalid": error ? true : undefined,
		"aria-describedby": fieldDescriptionIds(id, { error }),
	};
}
