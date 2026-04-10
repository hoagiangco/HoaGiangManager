
// Simulating the server-side date filtering logic from app/api/damage-reports/export/route.ts

function testFiltering() {
    const fromDateStr = "2026-04-08";
    const toDateStr = "2026-04-08";
    
    // Server logic after my fix
    const from = new Date(fromDateStr);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDateStr);
    to.setHours(23, 59, 59, 999);
    
    console.log("Filter Range (Local):", from.toLocaleString(), "to", to.toLocaleString());
    
    // Simulate reports from DB (usually returned as local start-of-day for DATE column)
    // In node-postgres, a DATE '2026-04-08' is often parsed as local April 8 00:00:00
    const reportDateFromDB = new Date(2026, 3, 8, 0, 0, 0); // April 8, 2026 00:00:00 local
    
    const reportDateObj = new Date(reportDateFromDB);
    reportDateObj.setHours(0, 0, 0, 0);
    
    console.log("Report Date (Local):", reportDateObj.toLocaleString());
    
    const matches = reportDateObj >= from && reportDateObj <= to;
    console.log("Matches:", matches);
    
    if (matches) {
        console.log("SUCCESS: Report on April 8 IS included in 8-8 range.");
    } else {
        console.log("FAILURE: Report on April 8 is NOT included in 8-8 range.");
    }
}

testFiltering();
