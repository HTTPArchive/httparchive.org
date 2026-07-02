rem ######################################
rem ## Custom HTTP Archive script       ##
rem ######################################
rem #
rem # This script installs all the required dependencies needed to run the
rem # HTTP Archive website providing you have node installed.
rem #
rem # It's a simplified version of run_and_test_website.sh for windows users
rem # It depends on nodejs being installed already
rem #

echo "Kill any existing instances of the webserver"
wmic Path win32_process Where "Caption Like '%%node.exe%%' AND CommandLine Like '%%server.js%%'" Call Terminate

echo "Installing node modules"
call npm install --legacy-peer-deps

echo "Building website"
call npm run build

echo "Starting website"
start node server.js
rem # Sleep for 5 seconds to make sure server is up
timeout /t 5 /nobreak
rem # Use sleep as well in case running in GitBash where above command fails
sleep 5

echo "Testing website"
call npm run test

echo "Monitoring templates for changes"
call npm run watch

echo "Website started successfully"
