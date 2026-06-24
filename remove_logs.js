const fs = require('fs');
const filePath = './public/js/home.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace console.log(...); with empty string
// We'll use a regex to match console.log statements.
content = content.replace(/^[ \t]*console\.log\(.*?\);?[ \t]*$/gm, '');

// Save back to file
fs.writeFileSync(filePath, content);
console.log('Removed console.log from home.js');
