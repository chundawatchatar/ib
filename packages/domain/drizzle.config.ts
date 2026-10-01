import { defineConfig } from "drizzle-kit";
import { loadRootEnv } from "./src/env.js";

loadRootEnv();

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./migrations",
});
