const { test_status_codes } = require('./test_status_codes');
const { test_console_errors } = require('./test_console_errors');
const { test_cwv_toggle } = require('./test_cwv_toggle');
const { test_multi_tech_tables } = require('./test_multi_tech_tables');

(async () => {
  try {
    await test_status_codes();
    await test_console_errors();
    await test_cwv_toggle();
    await test_multi_tech_tables();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
