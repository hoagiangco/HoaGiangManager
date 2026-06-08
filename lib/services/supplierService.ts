import { query } from '@/lib/db';
import { Supplier } from '@/types/supplier';

export class SupplierService {
  async getPaginated({
    page = 1,
    limit = 10,
    search = '',
    categoryId = 0
  }: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let whereConditions = ['s."IsActive" = true']; // By default only active suppliers

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        s."Name" ILIKE $${params.length} OR 
        s."TaxCode" ILIKE $${params.length} OR
        s."ContactPerson" ILIKE $${params.length} OR
        s."Phone" ILIKE $${params.length} OR
        s."Zalo" ILIKE $${params.length}
      )`);
    }

    if (categoryId > 0) {
      params.push(categoryId);
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM public."SupplierCategoryMapping" scm 
          WHERE scm."SupplierID" = s."ID" AND scm."CategoryID" = $${params.length}
        )
      `);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM public."Supplier" s ${whereClause}`;
    const dataSql = `
      SELECT 
        s.*, 
        COALESCE(
          json_agg(
            json_build_object('ID', c."ID", 'Name', c."Name")
          ) FILTER (WHERE c."ID" IS NOT NULL), '[]'
        ) as "Categories",
        COALESCE(
          array_agg(c."ID") FILTER (WHERE c."ID" IS NOT NULL), '{}'
        ) as "CategoryIDs"
      FROM public."Supplier" s 
      LEFT JOIN public."SupplierCategoryMapping" scm ON s."ID" = scm."SupplierID"
      LEFT JOIN public."SupplierCategory" c ON scm."CategoryID" = c."ID"
      ${whereClause} 
      GROUP BY s."ID"
      ORDER BY s."ID" DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countResult, dataResult] = await Promise.all([
      query(countSql, params),
      query(dataSql, params)
    ]);

    return {
      suppliers: dataResult.rows as Supplier[],
      total: parseInt(countResult.rows[0].count)
    };
  }

  async getById(id: number) {
    const sql = `
      SELECT 
        s.*, 
        COALESCE(
          json_agg(
            json_build_object('ID', c."ID", 'Name', c."Name")
          ) FILTER (WHERE c."ID" IS NOT NULL), '[]'
        ) as "Categories",
        COALESCE(
          array_agg(c."ID") FILTER (WHERE c."ID" IS NOT NULL), '{}'
        ) as "CategoryIDs"
      FROM public."Supplier" s 
      LEFT JOIN public."SupplierCategoryMapping" scm ON s."ID" = scm."SupplierID"
      LEFT JOIN public."SupplierCategory" c ON scm."CategoryID" = c."ID"
      WHERE s."ID" = $1
      GROUP BY s."ID"
    `;
    const result = await query(sql, [id]);
    return result.rows[0] as Supplier | undefined;
  }

  async create(data: Partial<Supplier>) {
    const sql = `
      INSERT INTO public."Supplier" (
        "Name", "TaxCode", "ContactPerson", "Phone", "Zalo", "Email", "Address", "Notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "ID"
    `;
    const params = [
      data.Name,
      data.TaxCode || null,
      data.ContactPerson || null,
      data.Phone || null,
      data.Zalo || null,
      data.Email || null,
      data.Address || null,
      data.Notes || null
    ];
    
    const result = await query(sql, params);
    const supplierId = result.rows[0].ID;

    if (data.CategoryIDs && data.CategoryIDs.length > 0) {
      for (const catId of data.CategoryIDs) {
        await query(
          `INSERT INTO public."SupplierCategoryMapping" ("SupplierID", "CategoryID") VALUES ($1, $2)`,
          [supplierId, catId]
        );
      }
    }

    return supplierId;
  }

  async update(id: number, data: Partial<Supplier>) {
    const sql = `
      UPDATE public."Supplier" SET
        "Name" = COALESCE($1, "Name"),
        "TaxCode" = $2,
        "ContactPerson" = $3,
        "Phone" = $4,
        "Zalo" = $5,
        "Email" = $6,
        "Address" = $7,
        "Notes" = $8,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "ID" = $9
      RETURNING "ID"
    `;
    
    // For optional fields, we allow updating to null if it's passed as null
    const params = [
      data.Name,
      data.TaxCode !== undefined ? data.TaxCode : null,
      data.ContactPerson !== undefined ? data.ContactPerson : null,
      data.Phone !== undefined ? data.Phone : null,
      data.Zalo !== undefined ? data.Zalo : null,
      data.Email !== undefined ? data.Email : null,
      data.Address !== undefined ? data.Address : null,
      data.Notes !== undefined ? data.Notes : null,
      id
    ];
    
    const result = await query(sql, params);
    
    if (data.CategoryIDs !== undefined) {
      // Delete old mappings
      await query(`DELETE FROM public."SupplierCategoryMapping" WHERE "SupplierID" = $1`, [id]);
      
      // Insert new mappings
      if (data.CategoryIDs.length > 0) {
        for (const catId of data.CategoryIDs) {
          await query(
            `INSERT INTO public."SupplierCategoryMapping" ("SupplierID", "CategoryID") VALUES ($1, $2)`,
            [id, catId]
          );
        }
      }
    }

    return result.rowCount ? result.rowCount > 0 : false;
  }

  async delete(id: number) {
    // Soft delete
    const sql = `UPDATE public."Supplier" SET "IsActive" = false WHERE "ID" = $1`;
    const result = await query(sql, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
