const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier-next");   

module.exports = function (eleventyConfig) {
  const md = require("markdown-it")({
    html: false,
    breaks: true,
    linkify: true,
  });

  eleventyConfig.addNunjucksFilter("markdownify", (markdownString) =>
    md.render(markdownString),
  );

  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // human readable date
  const readableDate = (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
      "dd LLL yyyy"
    );
  };
  eleventyConfig.addFilter("readableDate", readableDate);
  eleventyConfig.addNunjucksFilter("readableDate", readableDate);

  const partitionEventsByDate = (events = []) => {
    const today = DateTime.utc().startOf("day");
    const groupedEvents = { upcoming: [], past: [] };

    for (const event of events) {
      const date =
        event.data.date instanceof Date
          ? DateTime.fromJSDate(event.data.date, { zone: "utc" })
          : DateTime.fromISO(String(event.data.date), { zone: "utc" });

      if (!date.isValid) {
        throw new Error(`Invalid event date for "${event.data.title}"`);
      }

      groupedEvents[date.startOf("day") >= today ? "upcoming" : "past"].push({
        ...event,
        eventDate: date,
      });
    }

    groupedEvents.upcoming.sort((a, b) => a.eventDate - b.eventDate);
    groupedEvents.past.sort((a, b) => b.eventDate - a.eventDate);

    return groupedEvents;
  };
  eleventyConfig.addCollection("upcomingEvents", (collectionApi) =>
    partitionEventsByDate(collectionApi.getFilteredByTag("events")).upcoming,
  );
  eleventyConfig.addCollection("pastEvents", (collectionApi) =>
    partitionEventsByDate(collectionApi.getFilteredByTag("events")).past,
  );

   // Sort by data files `date` field
  eleventyConfig.addFilter("sortDataByDate", (obj) => {
    const sorted = {};
    Object.keys(obj)
      .sort((a, b) => {
        return obj[a].date > obj[b].date ? 1 : -1;
      })
      .forEach((name) => (sorted[name] = obj[name]));
    return sorted;
  });

  // Syntax Highlighting for Code blocks
  eleventyConfig.addPlugin(syntaxHighlight);

  // To Support .yaml Extension in _data
  // You may remove this if you can use JSON
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // Copy Static Files to /_Site
  eleventyConfig.addPassthroughCopy({
    "./src/admin/config.yml": "./admin/config.yml",
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css":
      "./static/css/prism-tomorrow.css",
  });

  // Copy Image Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/img");

  // Copy favicon to route of /_site
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");

  // Copy font
  eleventyConfig.addPassthroughCopy("./src/static/fonts/OrticaLinear-Regular.otf");

  // Minify HTML
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    // Eleventy 1.0+: use this.inputPath and this.outputPath instead
    if (typeof outputPath === "string" && outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });

  // Let Eleventy transform HTML files as nunjucks
  // So that we can use .html instead of .njk
  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
