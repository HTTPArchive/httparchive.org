const { test_status_codes } = require('./test_status_codes');
const { test_console_errors } = require('./test_console_errors');

(async () => {
  try {
    await test_status_codes();
    await test_console_errors();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
