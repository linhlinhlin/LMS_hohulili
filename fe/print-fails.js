const fs = require('fs');
const lines = fs.readFileSync('fails.log', 'utf8').split('\n');
console.log('Real errors:');
let out = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l && l.trim() && !l.includes('Executed') && !l.includes('[1A') && !l.includes('[2K')) {
        out.push(l);
    }
}
console.log(out.join('\n'));
