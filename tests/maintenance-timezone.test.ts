import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('the same API calendar inputs produce identical results on Vietnam, UTC and US hosts', () => {
  const script = `
    const ts=require('typescript'),fs=require('fs'),vm=require('vm');
    const scope={exports:{},Date,Intl};
    const code=ts.transpileModule(fs.readFileSync('lib/utils/maintenanceScheduler.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(code,scope);
    const c=scope.exports;
    process.stdout.write(JSON.stringify([
      c.calculateNextDueDay('2026-02-28',1,'month',null,false,'2026-01-31'),
      c.calculateNextDueDate(new Date('2026-02-28'),1,'month',null,false,new Date('2026-01-31')).toISOString(),
      c.maintenanceDay('2026-09-09T17:00:00Z'),
      c.maintenanceDaysBetween('2026-09-10T07:00:00','2026-09-10')
    ]));
  `;
  for (const TZ of ['Asia/Ho_Chi_Minh', 'UTC', 'America/Los_Angeles']) {
    const result = JSON.parse(execFileSync(process.execPath, ['-e', script], {
      env: { ...process.env, TZ }, encoding: 'utf8',
    }));
    assert.deepEqual(result, ['2026-03-31', '2026-03-31T00:00:00.000Z', '2026-09-10', 0], TZ);
  }
});
