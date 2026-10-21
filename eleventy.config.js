import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compileAsync } from "sass";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
	"src/assets": "assets",
	"src/favicon.ico": "favicon.ico",
	"src/site.webmanifest": "site.webmanifest",
  });

  eleventyConfig.addWatchTarget("./src/styles/");

  eleventyConfig.on("eleventy.before", async ({ directories }) => {
	const result = await compileAsync("src/styles/main.scss", {
	  style: "expanded",
	});

	const cssDirectory = join(directories.output, "assets/css");

	await mkdir(cssDirectory, { recursive: true });
	await writeFile(join(cssDirectory, "main.css"), result.css);
  });

  return {
	dir: {
	  input: "src",
	  output: "dist",
	  includes: "_includes",
	  data: "_data",
	},
	templateFormats: ["njk", "md", "html"],
	htmlTemplateEngine: "njk",
	markdownTemplateEngine: "njk",
  };
}