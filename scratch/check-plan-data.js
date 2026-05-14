const pool = require('../lib/db').default;

async function checkData() {
  try {
    const res = await pool.query('SELECT * FROM "WorkPlanItem" ORDER BY "ID" DESC LIMIT 10');
    console.log('Total items in WorkPlanItem:', res.rows.length);
    console.table(res.rows.map(r => ({
      id: r.ID,
      date: r.PlanDate,
      staff: r.StaffID,
      title: r.Title,
      implemented: r.IsImplemented
    })));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkData();
