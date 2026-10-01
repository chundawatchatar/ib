import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser calls `/api` on its own origin; forward it to the API server.
const apiProxy = {
	"/api": process.env.API_URL ?? "http://localhost:3001",
};

// Client-only rendering: Start prerenders the HTML shell and every route
// renders in the browser.
const config = defineConfig({
	resolve: { tsconfigPaths: true },
	server: { proxy: apiProxy },
	preview: { proxy: apiProxy },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart({ spa: { enabled: true } }),
		viteReact(),
	],
});

export default config;
