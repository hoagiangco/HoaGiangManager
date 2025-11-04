import pool from '../db';
import { Device, DeviceVM, DeviceStatus } from '@/types';

export class DeviceService {
  async getDeviceByCategory(categoryId: number = 0): Promise<DeviceVM[]> {
    try {
      let query = `
        SELECT 
          d."ID" as id,
          d."Name" as name,
          d."Serial" as serial,
          d."Description" as description,
          d."Img" as img,
          d."WarrantyDate" as "warrantyDate",
          d."UseDate" as "useDate",
          d."EndDate" as "endDate",
          d."DepartmentID" as "departmentId",
          dep."Name" as "departmentName",
          d."DeviceCategoryID" as "deviceCategoryId",
          dc."Name" as "deviceCategoryName",
          CAST(d."Status"::text AS INTEGER) as status
        FROM "Device" d
        INNER JOIN "DeviceCategory" dc ON d."DeviceCategoryID" = dc."ID"
        INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"
      `;

      const params: any[] = [];
      if (categoryId > 0) {
        query += ` WHERE d."DeviceCategoryID" = $1`;
        params.push(categoryId);
      }

      query += ` ORDER BY d."Name"`;

      const result = await pool.query(query, params);

      // Return empty array if no devices, otherwise map the results
      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return result.rows.map((row: any) => ({
        ...row,
        status: row.status ? parseInt(row.status) as DeviceStatus : DeviceStatus.DangSuDung,
        statusName: this.getStatusName(row.status ? parseInt(row.status) : DeviceStatus.DangSuDung)
      }));
    } catch (error: any) {
      console.error('DeviceService.getDeviceByCategory error:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<Device | null> {
    const result = await pool.query(
      `SELECT * FROM "Device" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      name: row.Name,
      serial: row.Serial,
      description: row.Description,
      img: row.Img,
      warrantyDate: row.WarrantyDate,
      useDate: row.UseDate,
      endDate: row.EndDate,
      departmentId: row.DepartmentID,
      deviceCategoryId: row.DeviceCategoryID,
      status: row.Status ? (typeof row.Status === 'string' ? parseInt(row.Status) : row.Status) as DeviceStatus : DeviceStatus.DangSuDung
    };
  }

  async create(device: Omit<Device, 'id'>): Promise<number> {
    const result = await pool.query(
      `INSERT INTO "Device" (
        "Name", "Serial", "Description", "Img", "WarrantyDate", 
        "UseDate", "EndDate", "DepartmentID", "DeviceCategoryID", "Status"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING "ID"`,
      [
        device.name,
        device.serial || null,
        device.description || null,
        device.img || null,
        device.warrantyDate || null,
        device.useDate || null,
        device.endDate || null,
        device.departmentId,
        device.deviceCategoryId,
        device.status || DeviceStatus.DangSuDung
      ]
    );

    return result.rows[0].ID;
  }

  async update(device: Device): Promise<number> {
    await pool.query(
      `UPDATE "Device" SET
        "Name" = $1,
        "Serial" = $2,
        "Description" = $3,
        "Img" = $4,
        "WarrantyDate" = $5,
        "UseDate" = $6,
        "EndDate" = $7,
        "DepartmentID" = $8,
        "DeviceCategoryID" = $9,
        "Status" = $10
      WHERE "ID" = $11`,
      [
        device.name,
        device.serial || null,
        device.description || null,
        device.img || null,
        device.warrantyDate || null,
        device.useDate || null,
        device.endDate || null,
        device.departmentId,
        device.deviceCategoryId,
        device.status,
        device.id
      ]
    );

    return device.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if device is used in events
    const eventCheck = await pool.query(
      'SELECT "ID" FROM "Event" WHERE "DeviceID" = $1 LIMIT 1',
      [id]
    );

    if (eventCheck.rows.length > 0) {
      return false; // Cannot delete if used in events
    }

    await pool.query('DELETE FROM "Device" WHERE "ID" = $1', [id]);
    return true;
  }

  private getStatusName(status: DeviceStatus): string {
    switch (status) {
      case DeviceStatus.DangSuDung:
        return 'Đang sử dụng';
      case DeviceStatus.DangSuaChua:
        return 'Đang sửa chữa';
      case DeviceStatus.HuHong:
        return 'Hư hỏng không dùng được';
      case DeviceStatus.DaThanhLy:
        return 'Đã thanh lý';
      default:
        return 'Không xác định';
    }
  }
}

