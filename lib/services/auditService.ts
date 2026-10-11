import pool from '../db';
import { PoolClient } from 'pg';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Ghi log thao tác hệ thống (Audit Log)
 * @param client Tùy chọn truyền transaction client, nếu không truyền sẽ dùng default pool
 * @param userId ID người dùng thực hiện thao tác
 * @param action Hành động (CREATE, UPDATE, DELETE)
 * @param tableName Tên bảng/Thực thể bị tác động (vd: 'Devices', 'SpareParts')
 * @param recordId ID của record bị tác động
 * @param oldValues Dữ liệu cũ trước khi bị tác động (nếu có)
 * @param newValues Dữ liệu mới sau khi bị tác động (nếu có)
 * @param ipAddress Địa chỉ IP của người dùng (tùy chọn)
 */
export async function logAudit(
  client: PoolClient | null,
  userId: string,
  action: AuditAction,
  tableName: string,
  recordId: string,
  oldValues: any = null,
  newValues: any = null,
  ipAddress?: string
) {
  const sql = `
    INSERT INTO "AuditLogs" 
      ("UserId", "Action", "TableName", "RecordId", "OldValues", "NewValues", "IpAddress")
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
  `;

  const safeRecordId = String(recordId || 'N/A').slice(0, 100);

  const values = [
    userId,
    action,
    tableName,
    safeRecordId,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ipAddress || null,
  ];

  if (client) {
    await client.query(sql, values);
  } else {
    await pool.query(sql, values);
  }
}
