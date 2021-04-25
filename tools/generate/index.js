const { generate_sitemap } = require('./generate_sitemap');
const { generate_js } = require('./generate_js');

(async () => {
  try {
    await generate_sitemap();
    await generate_js();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
