import { query } from '@/lib/db';

export interface SupplierCategory {
  ID: number;
  Name: string;
}

export class SupplierCategoryService {
  async getAll() {
    const sql = `SELECT * FROM public."SupplierCategory" ORDER BY "Name" ASC`;
    const result = await query(sql);
    return result.rows as SupplierCategory[];
  }

  async create(name: string) {
    const sql = `
      INSERT INTO public."SupplierCategory" ("Name") 
      VALUES ($1) RETURNING "ID", "Name"
    `;
    const result = await query(sql, [name]);
    return result.rows[0] as SupplierCategory;
  }

  async update(id: number, name: string) {
    const sql = `
      UPDATE public."SupplierCategory" 
      SET "Name" = $1 
      WHERE "ID" = $2 RETURNING "ID", "Name"
    `;
    const result = await query(sql, [name, id]);
    return result.rows[0] as SupplierCategory | undefined;
  }

  async delete(id: number) {
    // Cannot delete if there are suppliers using this category, foreign key will restrict or set null depending on definition (we used ON DELETE SET NULL). 
    // It's safer to just let the DB handle the ON DELETE SET NULL constraint.
    const sql = `DELETE FROM public."SupplierCategory" WHERE "ID" = $1`;
    const result = await query(sql, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
