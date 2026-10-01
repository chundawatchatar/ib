export type LogEntry = {
	event: "request.completed" | "request.failed";
	requestId: string;
	method: string;
	status: number;
	durationMs?: number;
};

export type Logger = {
	info: (entry: LogEntry) => void;
	error: (entry: LogEntry) => void;
};

export const consoleLogger: Logger = {
	info: (entry) => console.info(JSON.stringify(entry)),
	error: (entry) => console.error(JSON.stringify(entry)),
};
