import { defineConfig } from "rolldown";

export default defineConfig({
	input: "index",
	output: {
		dir: "dist/",
		minify: true,
		format: "esm",
		chunkFileNames: "[name].js",
	},
	platform: "node",
});
