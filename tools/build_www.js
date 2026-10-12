// Copies only the game files into ./www (what Capacitor packages into the APK).
// Usage: node tools/build_www.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ['index.html', 'css', 'js', 'data', 'assets']) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
// the editor is a desktop tool; keep it out of the phone build
fs.rmSync(path.join(out, 'js', 'editor.js'), { force: true });
fs.rmSync(path.join(out, 'css', 'editor.css'), { force: true });
console.log('www/ ready');
