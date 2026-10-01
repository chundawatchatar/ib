import { once } from "node:events";
import type { Server } from "node:http";
import { createDatabase, requireDatabaseUrl } from "@salary-manager/domain";
import { app } from "./app.js";

export async function startApi(
	databaseUrl = process.env.DATABASE_URL,
	port = 3001,
) {
	const connection = createDatabase(requireDatabaseUrl(databaseUrl));
	let server: Server | undefined;
	try {
		await connection.checkConnection();
		server = app.listen(port);
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
