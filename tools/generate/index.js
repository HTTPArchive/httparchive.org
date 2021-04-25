let { generate_sitemap } = require('./generate_sitemap');

(async () => {
  try {
    await generate_sitemap();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
