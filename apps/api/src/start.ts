import { once } from "node:events";
import type { Server } from "node:http";
import { createDatabase, requireDatabaseUrl } from "@salary-manager/domain";
import { createApp } from "./app";
import { createServices } from "./services";

// `host` defaults to all interfaces. Tests pass "127.0.0.1": an ephemeral port
// on all interfaces can coincide with a service bound only to loopback (such as
// PostgreSQL's forwarded port), and requests to 127.0.0.1 would reach that service.
export async function startApi(
	databaseUrl = process.env.DATABASE_URL,
	port = parsePort(process.env.PORT),
	host?: string,
) {
	const connection = createDatabase(requireDatabaseUrl(databaseUrl));
	let server: Server | undefined;
	try {
		await connection.checkConnection();
		const app = createApp({ services: createServices(connection.db) });
		server = host === undefined ? app.listen(port) : app.listen(port, host);
		await once(server, "listening");
	} catch {
		if (server?.listening) server.close();
		await connection.close();
		throw new Error(
			"API startup failed: unable to connect to PostgreSQL or start the HTTP listener",
		);
	}
	const listeningServer = server;
	let closing: Promise<void> | undefined;
	return {
		server: listeningServer,
		db: connection.db,
		close: () => {
			closing ??= (async () => {
				try {
					await new Promise<void>((resolve, reject) =>
						listeningServer.close((error) =>
							error ? reject(error) : resolve(),
						),
					);
				} finally {
					await connection.close();
				}
			})();
			return closing;
		},
	};
}

export function parsePort(value: string | undefined, fallback = 3001): number {
	if (value === undefined || value === "") return fallback;
	const port = Number(value);
	if (!/^\d+$/.test(value) || port > 65_535)
		throw new Error("PORT must be an integer from 0 to 65535");
	return port;
}
