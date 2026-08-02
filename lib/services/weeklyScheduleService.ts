import pool from '../db';

let schemaReady = false;

export interface WeeklyScheduleCell {
  id?: number;
  weekStartDate: string; // yyyy-MM-dd (always Monday)
  staffId: number;
  dayOfWeek: number; // 1=Mon, 2=Tue, ... 7=Sun
  content: string;
  note?: string;
}

export interface WeeklyScheduleStaffRow {
  staffId: number;
  staffName: string;
  departmentId: number;
  departmentName: string;
  days: Record<number, WeeklyScheduleCell>; // dayOfWeek -> cell
}

export interface WeeklyScheduleDeptGroup {
  departmentId: number;
  departmentName: string;
  staff: WeeklyScheduleStaffRow[];
}

export interface WeeklyScheduleMeta {
  note: string;
  approvedImageUrl?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  creatorSignatureUrl?: string | null;
  creatorName?: string | null;
  creatorSignedAt?: string | null;
}

export class WeeklyScheduleService {
  async ensureSchema(): Promise<void> {
    if (schemaReady) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('weekly_schedule_schema_v2'))`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "WeeklySchedule" (
          "ID"            SERIAL PRIMARY KEY,
          "WeekStartDate" DATE NOT NULL,
          "StaffID"       INTEGER NOT NULL,
          "DayOfWeek"     SMALLINT NOT NULL CHECK ("DayOfWeek" BETWEEN 1 AND 7),
          "Content"       TEXT NOT NULL DEFAULT '',
          "Note"          TEXT,
          "CreatedBy"     TEXT,
          "CreatedAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "UpdatedAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT "uq_weekly_schedule_staff_day"
            UNIQUE ("WeekStartDate", "StaffID", "DayOfWeek")
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS "idx_weekly_schedule_week"
          ON "WeeklySchedule"("WeekStartDate", "StaffID")
      `);

      // Table to track which staff are included in the weekly schedule
      await client.query(`
        CREATE TABLE IF NOT EXISTS "WeeklyScheduleStaff" (
          "StaffID"   INTEGER NOT NULL PRIMARY KEY,
          "SortOrder" INTEGER NOT NULL DEFAULT 0,
          "AddedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Table to store the weekly global note & metadata
      await client.query(`
        CREATE TABLE IF NOT EXISTS "WeeklyScheduleNote" (
          "WeekStartDate"        DATE NOT NULL PRIMARY KEY,
          "Note"                 TEXT,
          "ApprovedImageUrl"     TEXT,
          "ApprovedAt"           TIMESTAMP WITH TIME ZONE,
          "ApprovedBy"           TEXT,
          "CreatorSignatureUrl"  TEXT,
          "CreatorName"          TEXT,
          "CreatorSignedAt"      TIMESTAMP WITH TIME ZONE,
          "UpdatedAt"            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      await client.query(`
        ALTER TABLE "WeeklyScheduleNote" 
          ADD COLUMN IF NOT EXISTS "ApprovedImageUrl" TEXT,
          ADD COLUMN IF NOT EXISTS "ApprovedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "ApprovedBy" TEXT,
          ADD COLUMN IF NOT EXISTS "CreatorSignatureUrl" TEXT,
          ADD COLUMN IF NOT EXISTS "CreatorName" TEXT,
          ADD COLUMN IF NOT EXISTS "CreatorSignedAt" TIMESTAMP WITH TIME ZONE
      `);

      await client.query('COMMIT');
      schemaReady = true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Return the Monday of the week containing the given date string */
  static getMondayOf(dateStr: string | Date): string {
    const d = typeof dateStr === 'string' && !dateStr.includes('T')
      ? new Date(dateStr + 'T00:00:00Z') // Force UTC parsing for pure date strings
      : new Date(dateStr);
    const day = d.getUTCDay(); // 0=Sun, 1=Mon ...
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  // ─── Selected Staff Management ─────────────────────────────────────────────

  /** Get all selected staff IDs */
  async getSelectedStaff(): Promise<{ staffId: number; staffName: string; departmentId: number; departmentName: string }[]> {
    await this.ensureSchema();
    const result = await pool.query(
      `SELECT
         s."ID"            AS "staffId",
         s."Name"          AS "staffName",
         COALESCE(s."DepartmentID", 0) AS "departmentId",
         COALESCE(d."Name", 'Không xác định') AS "departmentName"
       FROM "WeeklyScheduleStaff" wss
       INNER JOIN "Staff" s ON wss."StaffID" = s."ID"
       LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
       ORDER BY wss."SortOrder", d."Name", s."Name"`
    );
    return result.rows;
  }

  /** Get selected staff IDs as a set */
  async getSelectedStaffIds(): Promise<number[]> {
    await this.ensureSchema();
    const result = await pool.query('SELECT "StaffID" FROM "WeeklyScheduleStaff"');
    return result.rows.map((r: any) => r.StaffID);
  }

  /** Set the selected staff (replace all) */
  async setSelectedStaff(staffIds: number[]): Promise<void> {
    await this.ensureSchema();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM "WeeklyScheduleStaff"');
      for (let i = 0; i < staffIds.length; i++) {
        await client.query(
          'INSERT INTO "WeeklyScheduleStaff" ("StaffID", "SortOrder") VALUES ($1, $2) ON CONFLICT ("StaffID") DO UPDATE SET "SortOrder" = $2',
          [staffIds[i], i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Weekly Note & Metadata Management ────────────────────────────────────

  async getWeeklyNote(weekStartDate: string): Promise<string> {
    const meta = await this.getWeeklyMeta(weekStartDate);
    return meta.note;
  }

  async getWeeklyMeta(weekStartDate: string): Promise<WeeklyScheduleMeta> {
    await this.ensureSchema();
    const result = await pool.query(
      `SELECT "Note", "ApprovedImageUrl", "ApprovedAt", "ApprovedBy", "CreatorSignatureUrl", "CreatorName", "CreatorSignedAt" FROM "WeeklyScheduleNote" WHERE "WeekStartDate" = $1`,
      [weekStartDate]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        note: row.Note || '',
        approvedImageUrl: row.ApprovedImageUrl || null,
        approvedAt: row.ApprovedAt ? new Date(row.ApprovedAt).toISOString() : null,
        approvedBy: row.ApprovedBy || null,
        creatorSignatureUrl: row.CreatorSignatureUrl || null,
        creatorName: row.CreatorName || null,
        creatorSignedAt: row.CreatorSignedAt ? new Date(row.CreatorSignedAt).toISOString() : null,
      };
    }
    return {
      note: '',
      approvedImageUrl: null,
      approvedAt: null,
      approvedBy: null,
      creatorSignatureUrl: null,
      creatorName: null,
      creatorSignedAt: null
    };
  }

  async setWeeklyNote(weekStartDate: string, note: string): Promise<void> {
    await this.ensureSchema();
    await pool.query(
      `INSERT INTO "WeeklyScheduleNote" ("WeekStartDate", "Note", "UpdatedAt")
       VALUES ($1, $2, NOW())
       ON CONFLICT ("WeekStartDate") DO UPDATE SET "Note" = EXCLUDED."Note", "UpdatedAt" = NOW()`,
      [weekStartDate, note]
    );
  }

  async setApprovedImage(weekStartDate: string, approvedImageUrl: string | null, approvedBy?: string | null): Promise<void> {
    await this.ensureSchema();
    await pool.query(
      `INSERT INTO "WeeklyScheduleNote" ("WeekStartDate", "ApprovedImageUrl", "ApprovedAt", "ApprovedBy", "UpdatedAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("WeekStartDate") DO UPDATE SET
         "ApprovedImageUrl" = EXCLUDED."ApprovedImageUrl",
         "ApprovedAt" = EXCLUDED."ApprovedAt",
         "ApprovedBy" = EXCLUDED."ApprovedBy",
         "UpdatedAt" = NOW()`,
      [
        weekStartDate,
        approvedImageUrl || null,
        approvedImageUrl ? new Date() : null,
        approvedImageUrl ? (approvedBy || null) : null,
      ]
    );
  }

  async setCreatorSignature(
    weekStartDate: string,
    creatorSignatureUrl: string | null,
    creatorName?: string | null
  ): Promise<void> {
    await this.ensureSchema();
    await pool.query(
      `INSERT INTO "WeeklyScheduleNote" ("WeekStartDate", "CreatorSignatureUrl", "CreatorName", "CreatorSignedAt", "UpdatedAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("WeekStartDate") DO UPDATE SET
         "CreatorSignatureUrl" = EXCLUDED."CreatorSignatureUrl",
         "CreatorName" = EXCLUDED."CreatorName",
         "CreatorSignedAt" = EXCLUDED."CreatorSignedAt",
         "UpdatedAt" = NOW()`,
      [
        weekStartDate,
        creatorSignatureUrl || null,
        creatorName || null,
        creatorSignatureUrl ? new Date() : null,
      ]
    );
  }

  // ─── Schedule Data ─────────────────────────────────────────────────────────

  async getWeeklySchedule(
    weekStartDate: string,
    departmentId: number = 0
  ): Promise<WeeklyScheduleDeptGroup[]> {
    await this.ensureSchema();

    // Only load staff that are in WeeklyScheduleStaff
    let deptFilter = '';
    const params: any[] = [];
    if (departmentId > 0) {
      params.push(departmentId);
      deptFilter = `AND s."DepartmentID" = $${params.length}`;
    }

    const staffRes = await pool.query(
      `SELECT
         s."ID"            AS "staffId",
         s."Name"          AS "staffName",
         COALESCE(s."DepartmentID", 0) AS "departmentId",
         COALESCE(d."Name", 'Không xác định') AS "departmentName"
       FROM "WeeklyScheduleStaff" wss
       INNER JOIN "Staff" s ON wss."StaffID" = s."ID"
       LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
       WHERE 1=1 ${deptFilter}
       ORDER BY wss."SortOrder", d."Name", s."Name"`,
      params
    );

    if (staffRes.rows.length === 0) return [];

    const staffIds = staffRes.rows.map((r: any) => r.staffId);

    // Load all schedule cells for this week
    const schedRes = await pool.query(
      `SELECT
         ws."ID"            AS id,
         ws."WeekStartDate" AS "weekStartDate",
         ws."StaffID"       AS "staffId",
         ws."DayOfWeek"     AS "dayOfWeek",
         ws."Content"       AS content,
         ws."Note"          AS note
       FROM "WeeklySchedule" ws
       WHERE ws."WeekStartDate" = $1
         AND ws."StaffID" = ANY($2::int[])`,
      [weekStartDate, staffIds]
    );

    // Index cells: staffId -> dayOfWeek -> cell
    const cellMap: Record<number, Record<number, WeeklyScheduleCell>> = {};
    for (const row of schedRes.rows) {
      if (!cellMap[row.staffId]) cellMap[row.staffId] = {};
      cellMap[row.staffId][row.dayOfWeek] = {
        id: row.id,
        weekStartDate: row.weekStartDate,
        staffId: row.staffId,
        dayOfWeek: row.dayOfWeek,
        content: row.content,
        note: row.note,
      };
    }

    // Build department groups
    const deptMap: Record<number, WeeklyScheduleDeptGroup> = {};
    for (const s of staffRes.rows) {
      if (!deptMap[s.departmentId]) {
        deptMap[s.departmentId] = {
          departmentId: s.departmentId,
          departmentName: s.departmentName,
          staff: [],
        };
      }
      deptMap[s.departmentId].staff.push({
        staffId: s.staffId,
        staffName: s.staffName,
        departmentId: s.departmentId,
        departmentName: s.departmentName,
        days: cellMap[s.staffId] || {},
      });
    }

    return Object.values(deptMap);
  }

  async upsertBatch(cells: WeeklyScheduleCell[], createdBy?: string): Promise<void> {
    await this.ensureSchema();
    if (cells.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const cell of cells) {
        await client.query(
          `INSERT INTO "WeeklySchedule"
             ("WeekStartDate", "StaffID", "DayOfWeek", "Content", "Note", "CreatedBy", "UpdatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT ("WeekStartDate", "StaffID", "DayOfWeek")
           DO UPDATE SET
             "Content"   = EXCLUDED."Content",
             "Note"      = EXCLUDED."Note",
             "UpdatedAt" = NOW()`,
          [
            cell.weekStartDate,
            cell.staffId,
            cell.dayOfWeek,
            cell.content,
            cell.note ?? null,
            createdBy ?? null,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Get schedule for HTML export/print — only selected staff */
  async getForExport(weekStartDate: string, departmentIds?: number[]): Promise<WeeklyScheduleDeptGroup[]> {
    await this.ensureSchema();

    let deptFilter = '';
    const params: any[] = [];

    if (departmentIds && departmentIds.length > 0) {
      params.push(departmentIds);
      deptFilter = `AND s."DepartmentID" = ANY($${params.length}::int[])`;
    }

    const staffRes = await pool.query(
      `SELECT
         s."ID"            AS "staffId",
         s."Name"          AS "staffName",
         COALESCE(s."DepartmentID", 0) AS "departmentId",
         COALESCE(d."Name", 'Không xác định') AS "departmentName"
       FROM "WeeklyScheduleStaff" wss
       INNER JOIN "Staff" s ON wss."StaffID" = s."ID"
       LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
       WHERE 1=1 ${deptFilter}
       ORDER BY wss."SortOrder", d."Name", s."Name"`,
      params
    );

    if (staffRes.rows.length === 0) return [];

    const staffIds = staffRes.rows.map((r: any) => r.staffId);

    const schedRes = await pool.query(
      `SELECT
         ws."StaffID"   AS "staffId",
         ws."DayOfWeek" AS "dayOfWeek",
         ws."Content"   AS content,
         ws."Note"      AS note
       FROM "WeeklySchedule" ws
       WHERE ws."WeekStartDate" = $1
         AND ws."StaffID" = ANY($2::int[])`,
      [weekStartDate, staffIds]
    );

    const cellMap: Record<number, Record<number, WeeklyScheduleCell>> = {};
    for (const row of schedRes.rows) {
      if (!cellMap[row.staffId]) cellMap[row.staffId] = {};
      cellMap[row.staffId][row.dayOfWeek] = {
        weekStartDate,
        staffId: row.staffId,
        dayOfWeek: row.dayOfWeek,
        content: row.content,
        note: row.note,
      };
    }

    const deptMap: Record<number, WeeklyScheduleDeptGroup> = {};
    for (const s of staffRes.rows) {
      if (!deptMap[s.departmentId]) {
        deptMap[s.departmentId] = {
          departmentId: s.departmentId,
          departmentName: s.departmentName,
          staff: [],
        };
      }
      deptMap[s.departmentId].staff.push({
        staffId: s.staffId,
        staffName: s.staffName,
        departmentId: s.departmentId,
        departmentName: s.departmentName,
        days: cellMap[s.staffId] || {},
      });
    }

    return Object.values(deptMap);
  }
}
