const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// if [ ! -d ./build ]; then npm run build; fi; if [ ! -d ./client/build ]; then npm run build-client; fi; NODE_ENV=production HEADLESS=1 node ./build/main.js

if (!fs.existsSync('./build')) {
  run('npm run build');
}

if (!fs.existsSync('./client/build')) {
  run('npm run build-client');
}

process.env.NODE_ENV = 'production';
process.env.HEADLESS = 1;
run('node ./build/main.js');

function run(command) {
  console.log(command);
  execSync(command, { stdio: 'inherit' });
}
