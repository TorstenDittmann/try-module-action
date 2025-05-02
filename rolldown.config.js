import { defineConfig } from "rolldown";

export default defineConfig({
	input: "index",
	output: {
		dir: "dist/",
		format: "esm",
	},
	platform: "node",
});
