export function requireDatabaseUrl(value = process.env.DATABASE_URL): string {
	if (!value) throw new Error("DATABASE_URL is required");
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("DATABASE_URL must be a PostgreSQL URL");
	}
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		!url.hostname ||
		url.pathname.length <= 1
	) {
		throw new Error("DATABASE_URL must identify a PostgreSQL database");
	}
	return value;
}
