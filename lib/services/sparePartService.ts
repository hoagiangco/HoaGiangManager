import pool from '../db';
import { 
  SparePart, 
  SparePartVM, 
  SparePartCategory, 
  SparePartTransaction, 
  SparePartTransactionVM,
  SparePartTransactionType 
} from '@/types';
import { PoolClient } from 'pg';

export class SparePartService {
  // --- Category Methods ---
  async getCategories(): Promise<SparePartCategory[]> {
    const result = await pool.query('SELECT "ID" as id, "Name" as name, "Description" as description FROM "SparePartCategory" ORDER BY "Name"');
    return result.rows;
  }

  async createCategory(category: Omit<SparePartCategory, 'id'>): Promise<number> {
    const result = await pool.query(
      'INSERT INTO "SparePartCategory" ("Name", "Description") VALUES ($1, $2) RETURNING "ID"',
      [category.name, category.description]
    );
    return result.rows[0].ID;
  }

  // --- Spare Part Methods ---
  async getPaginated(filters: {
    page: number;
    limit: number;
    categoryId?: number;
    search?: string;
  }): Promise<{ items: SparePartVM[]; total: number }> {
    const { page = 1, limit = 10, categoryId = 0, search = '' } = filters;
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    if (categoryId > 0) {
      params.push(categoryId);
      whereClause += ` AND sp."CategoryID" = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(sp."Name") LIKE $${params.length} OR LOWER(sp."Description") LIKE $${params.length})`;
    }

    try {
      const countQuery = `SELECT COUNT(*) FROM "SparePart" sp ${whereClause}`;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT 
          sp."ID" as id,
          sp."Name" as name,
          sp."Unit" as unit,
          sp."CategoryID" as "categoryId",
          c."Name" as "categoryName",
          sp."MinQuantity" as "minQuantity",
          sp."CurrentQuantity" as "currentQuantity",
          sp."Description" as description,
          sp."ImageUrl" as "imageUrl",
          sp."CreatedAt" as "createdAt",
          sp."UpdatedAt" as "updatedAt"
        FROM "SparePart" sp
        LEFT JOIN "SparePartCategory" c ON sp."CategoryID" = c."ID"
        ${whereClause}
        ORDER BY sp."Name" ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const result = await pool.query(dataQuery, [...params, limit, offset]);
      const items = result.rows.map((row: any) => ({
        ...row,
        isLowStock: row.currentQuantity <= row.minQuantity
      }));

      return { items, total };
    } catch (error) {
      console.error('SparePartService.getPaginated error:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<SparePartVM | null> {
    const result = await pool.query(
      `SELECT 
        sp.*, 
        c."Name" as "categoryName" 
      FROM "SparePart" sp 
      LEFT JOIN "SparePartCategory" c ON sp."CategoryID" = c."ID" 
      WHERE sp."ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.ID,
      name: row.Name,
      unit: row.Unit,
      categoryId: row.CategoryID,
      categoryName: row.categoryName,
      minQuantity: row.MinQuantity,
      currentQuantity: row.CurrentQuantity,
      description: row.Description,
      imageUrl: row.ImageUrl,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
      isLowStock: row.CurrentQuantity <= row.MinQuantity
    };
  }

  async create(item: Omit<SparePart, 'id' | 'currentQuantity' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await pool.query(
      `INSERT INTO "SparePart" ("Name", "Unit", "CategoryID", "MinQuantity", "CurrentQuantity", "Description", "ImageUrl")
       VALUES ($1, $2, $3, $4, 0, $5, $6) RETURNING "ID"`,
      [item.name, item.unit, item.categoryId, item.minQuantity, item.description, item.imageUrl]
    );
    return result.rows[0].ID;
  }

  async update(id: number, item: Partial<SparePart>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (item.name) { fields.push(`"Name" = $${idx++}`); values.push(item.name); }
    if (item.unit !== undefined) { fields.push(`"Unit" = $${idx++}`); values.push(item.unit); }
    if (item.categoryId !== undefined) { fields.push(`"CategoryID" = $${idx++}`); values.push(item.categoryId); }
    if (item.minQuantity !== undefined) { fields.push(`"MinQuantity" = $${idx++}`); values.push(item.minQuantity); }
    if (item.description !== undefined) { fields.push(`"Description" = $${idx++}`); values.push(item.description); }
    if (item.imageUrl !== undefined) { fields.push(`"ImageUrl" = $${idx++}`); values.push(item.imageUrl); }
    
    fields.push(`"UpdatedAt" = CURRENT_TIMESTAMP`);

    if (fields.length === 0) return;

    values.push(id);
    await pool.query(
      `UPDATE "SparePart" SET ${fields.join(', ')} WHERE "ID" = $${idx}`,
      values
    );
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM "SparePart" WHERE "ID" = $1', [id]);
  }

  // --- Transaction Methods ---
  async createTransaction(transaction: Omit<SparePartTransaction, 'id' | 'createdAt'>): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create the transaction record
      const result = await client.query(
        `INSERT INTO "SparePartTransaction" ("SparePartID", "Type", "Quantity", "TransactionDate", "Note", "RelatedReportID", "CreatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "ID"`,
        [
          transaction.sparePartId, 
          transaction.type, 
          transaction.quantity, 
          transaction.transactionDate || new Date(), 
          transaction.note, 
          transaction.relatedReportId, 
          transaction.createdBy
        ]
      );
      const transactionId = result.rows[0].ID;

      // 2. Update the CurrentQuantity in SparePart table
      const quantityModifier = transaction.type === SparePartTransactionType.In ? transaction.quantity : -transaction.quantity;
      
      await client.query(
        `UPDATE "SparePart" SET "CurrentQuantity" = "CurrentQuantity" + $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $2`,
        [quantityModifier, transaction.sparePartId]
      );

      await client.query('COMMIT');
      return transactionId;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('SparePartService.createTransaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransactions(filters: {
    sparePartId?: number;
    type?: SparePartTransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SparePartTransactionVM[]; total: number }> {
    const { sparePartId, type, startDate, endDate, limit = 50, offset = 0 } = filters;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    if (sparePartId) {
      params.push(sparePartId);
      whereClause += ` AND t."SparePartID" = $${params.length}`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND t."Type" = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND t."TransactionDate" >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND t."TransactionDate" <= $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM "SparePartTransaction" t ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        t."ID" as id,
        t."SparePartID" as "sparePartId",
        sp."Name" as "sparePartName",
        sp."Unit" as "sparePartUnit",
        t."Type" as type,
        t."Quantity" as quantity,
        t."TransactionDate" as "transactionDate",
        t."Note" as note,
        t."RelatedReportID" as "relatedReportId",
        t."CreatedBy" as "createdBy",
        u."FullName" as "createdByName"
      FROM "SparePartTransaction" t
      JOIN "SparePart" sp ON t."SparePartID" = sp."ID"
      LEFT JOIN "AspNetUsers" u ON t."CreatedBy" = u."Id"
      ${whereClause}
      ORDER BY t."TransactionDate" DESC, t."ID" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(dataQuery, [...params, limit, offset]);
    return { items: result.rows, total };
  }

  async updateTransactionNote(id: number, note: string): Promise<void> {
    await pool.query(
      'UPDATE "SparePartTransaction" SET "Note" = $1 WHERE "ID" = $2',
      [note, id]
    );
  }
}
