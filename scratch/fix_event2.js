const fs = require('fs');

const path = 'app/api/events/[id]/route.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  '    const eventService = new EventService();\r\n    const result = await eventService.delete(id);',
  '    const eventService = new EventService();\r\n    const existingEvent = await eventService.getById(id);\r\n    const result = await eventService.delete(id);'
);
fs.writeFileSync(path, content);
console.log('Fixed event delete correctly!');
