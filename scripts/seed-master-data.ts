import pool from '../lib/db/index';
import dotenv from 'dotenv';

dotenv.config();

async function seedMasterData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🌱 Seeding master data...\n');

    // 1. Seed Departments
    console.log('📦 Seeding Departments...');
    await client.query(`
      INSERT INTO "Department" ("ID", "Name") VALUES
      (1, 'Phòng Kỹ thuật'),
      (2, 'Phòng Hành chính'),
      (3, 'Phòng Kế toán'),
      (4, 'Phòng Nhân sự'),
      (5, 'Phòng Kinh doanh')
      ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"
    `);
    console.log('✅ Departments seeded\n');

    // 2. Seed DeviceCategories
    console.log('📦 Seeding DeviceCategories...');
    await client.query(`
      INSERT INTO "DeviceCategory" ("ID", "Name", "DisplayOrder") VALUES
      (1, 'Máy tính', 1),
      (2, 'Máy in', 2),
      (3, 'Thiết bị mạng', 3),
      (4, 'Điện thoại', 4),
      (5, 'Thiết bị khác', 5)
      ON CONFLICT ("ID") DO UPDATE SET 
        "Name" = EXCLUDED."Name", 
        "DisplayOrder" = EXCLUDED."DisplayOrder"
    `);
    console.log('✅ DeviceCategories seeded\n');

    // 3. Seed EventTypes
    console.log('📦 Seeding EventTypes...');
    await client.query(`
      INSERT INTO "EventType" ("ID", "Name") VALUES
      (1, 'Bảo trì'),
      (2, 'Sửa chữa'),
      (3, 'Nâng cấp'),
      (4, 'Kiểm tra'),
      (5, 'Khác')
      ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"
    `);
    console.log('✅ EventTypes seeded\n');

    // 4. Seed Staff (cần DepartmentID tồn tại)
    console.log('📦 Seeding Staff...');
    await client.query(`
      INSERT INTO "Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID") VALUES
      (1, 'Nguyễn Văn A', true, '1990-01-15', 1),
      (2, 'Trần Thị B', false, '1992-05-20', 2),
      (3, 'Lê Văn C', true, '1988-03-10', 1),
      (4, 'Phạm Thị D', false, '1995-07-25', 3),
      (5, 'Hoàng Văn E', true, '1991-11-30', 4)
      ON CONFLICT ("ID") DO UPDATE SET 
        "Name" = EXCLUDED."Name",
        "Gender" = EXCLUDED."Gender",
        "Birthday" = EXCLUDED."Birthday",
        "DepartmentID" = EXCLUDED."DepartmentID"
    `);
    console.log('✅ Staff seeded\n');

    // 5. Seed Devices (cần DepartmentID và DeviceCategoryID tồn tại)
    console.log('📦 Seeding Devices...');
    await client.query(`
      INSERT INTO "Device" ("Name", "Serial", "Description", "DepartmentID", "DeviceCategoryID", "Status", "WarrantyDate", "UseDate") VALUES
      ('Máy tính Dell OptiPlex', 'DL001', 'Máy tính văn phòng', 1, 1, '1', '2024-01-01', '2024-01-15'),
      ('Máy in HP LaserJet', 'HP001', 'Máy in laser đen trắng', 2, 2, '1', '2024-02-01', '2024-02-10'),
      ('Router Cisco', 'CS001', 'Router mạng doanh nghiệp', 1, 3, '1', '2024-03-01', '2024-03-05'),
      ('iPhone 13', 'IP001', 'Điện thoại di động', 4, 4, '1', '2024-04-01', '2024-04-10'),
      ('Máy quét Canon', 'CN001', 'Máy quét tài liệu', 2, 5, '1', '2024-05-01', '2024-05-15')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Devices seeded\n');

    await client.query('COMMIT');
    console.log('✅ All master data seeded successfully!\n');

    // Summary
    const deptCount = await client.query('SELECT COUNT(*) as count FROM "Department"');
    const catCount = await client.query('SELECT COUNT(*) as count FROM "DeviceCategory"');
    const staffCount = await client.query('SELECT COUNT(*) as count FROM "Staff"');
    const deviceCount = await client.query('SELECT COUNT(*) as count FROM "Device"');
    const eventTypeCount = await client.query('SELECT COUNT(*) as count FROM "EventType"');

    console.log('📊 Summary:');
    console.log(`   Departments: ${deptCount.rows[0].count}`);
    console.log(`   DeviceCategories: ${catCount.rows[0].count}`);
    console.log(`   Staff: ${staffCount.rows[0].count}`);
    console.log(`   Devices: ${deviceCount.rows[0].count}`);
    console.log(`   EventTypes: ${eventTypeCount.rows[0].count}\n`);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedMasterData()
  .then(() => {
    console.log('✅ Seed process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  });

