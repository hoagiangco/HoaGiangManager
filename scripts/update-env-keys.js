const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();
const envPath = path.join(__dirname, '..', '.env');

let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

const lines = envContent.split('\n');
const newLines = lines.filter(line => 
    !line.startsWith('NEXT_PUBLIC_VAPID_PUBLIC_KEY=') && 
    !line.startsWith('VAPID_PRIVATE_KEY=')
);

newLines.push(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
newLines.push(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

fs.writeFileSync(envPath, newLines.join('\n').trim() + '\n');
console.log('✅ VAPID keys added to .env');
console.log('Public Key (for reference):', vapidKeys.publicKey);
