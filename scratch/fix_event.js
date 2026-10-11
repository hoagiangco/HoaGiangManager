const fs = require('fs');

const path = 'app/api/events/[id]/route.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  '    const eventService = new EventService();\n    const result = await eventService.delete(id);',
  '    const eventService = new EventService();\n    const existingEvent = await eventService.getById(id);\n    const result = await eventService.delete(id);'
);
fs.writeFileSync(path, content);
console.log('Fixed event delete!');
