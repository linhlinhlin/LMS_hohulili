const { execSync } = require('child_process');
const fs = require('fs');
try {
    console.log('Running tests...');
    const output = execSync('npx ng test lms-angular --watch=false --browsers=ChromeHeadless', { encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024 * 1024 * 10 });
    fs.writeFileSync('fails.log', output);
    console.log('Done, wrote to fails.log');
} catch (error) {
    const st = error.stdout || '';
    fs.writeFileSync('fails.log', st);
    console.log('Tests failed, wrote output to fails.log');
}
