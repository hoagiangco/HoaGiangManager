const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', '(dashboard)', 'dashboard', 'devices', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regexOpen = /\) : \(\s+<div className="mb-3 border-bottom pb-2">/;
content = content.replace(regexOpen, ') : (<>\n  <div className="mb-3 border-bottom pb-2">');

const regexClose = /<div className="modal-footer bg-light">/;
content = content.replace(regexClose, '</>\n              <div className="modal-footer bg-light">');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed.');
