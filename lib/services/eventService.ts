import pool from '../db';
import { Event, EventVM, DeviceStatus } from '@/types';

export class EventService {
  async getEventByType(eventTypeId: number = 0): Promise<EventVM[]> {
    let query = `
      SELECT 
        e."ID" as id,
        e."Name" as name,
        e."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        e."EventTypeID" as "eventTypeId",
        et."Name" as "eventTypeName",
        e."Description" as description,
        e."Img" as img,
        e."StartDate" as "startDate",
        e."FinishDate" as "finishDate",
        e."StaffID" as "staffId",
        s."Name" as "staffName",
        e."Notes" as notes,
        CAST(e."NewDeviceStatus"::text AS INTEGER) as "newDeviceStatus"
      FROM "Event" e
      LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
      LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
      LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
    `;

    const params: any[] = [];
    if (eventTypeId > 0) {
      query += ` WHERE e."EventTypeID" = $1`;
      params.push(eventTypeId);
    }

    if (eventTypeId === 0) {
      query += ` ORDER BY e."StartDate" DESC`;
    } else {
      query += ` ORDER BY e."Name"`;
    }

    const result = await pool.query(query, params);
    return result.rows.map((row: any) => ({
      ...row,
      newDeviceStatus: row.newDeviceStatus ? parseInt(row.newDeviceStatus) as DeviceStatus : null
    }));
  }

  async getById(id: number): Promise<Event | null> {
    const result = await pool.query(
      `SELECT * FROM "Event" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      name: row.Name,
      deviceId: row.DeviceID,
      eventTypeId: row.EventTypeID,
      description: row.Description,
      img: row.Img,
      startDate: row.StartDate,
      finishDate: row.FinishDate,
      staffId: row.StaffID,
      notes: row.Notes,
      newDeviceStatus: row.NewDeviceStatus ? (typeof row.NewDeviceStatus === 'string' ? parseInt(row.NewDeviceStatus) : row.NewDeviceStatus) as DeviceStatus : undefined
    };
  }

  async create(event: Omit<Event, 'id'>): Promise<number> {
    const result = await pool.query(
      `INSERT INTO "Event" (
        "Name", "DeviceID", "EventTypeID", "Description", "Img",
        "StartDate", "FinishDate", "StaffID", "Notes", "NewDeviceStatus"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING "ID"`,
      [
        event.name || null,
        event.deviceId || null,
        event.eventTypeId || null,
        event.description,
        event.img || null,
        event.startDate || null,
        event.finishDate,
        event.staffId || null,
        event.notes,
        event.newDeviceStatus || null
      ]
    );

    const eventId = result.rows[0].ID;

    // Update device status if NewDeviceStatus is provided
    if (event.deviceId && event.newDeviceStatus) {
      await pool.query(
        `UPDATE "Device" SET "Status" = $1 WHERE "ID" = $2`,
        [event.newDeviceStatus.toString(), event.deviceId]
      );
    }

    return eventId;
  }

  async update(event: Event): Promise<number> {
    await pool.query(
      `UPDATE "Event" SET
        "Name" = $1,
        "DeviceID" = $2,
        "EventTypeID" = $3,
        "Description" = $4,
        "Img" = $5,
        "StartDate" = $6,
        "FinishDate" = $7,
        "StaffID" = $8,
        "Notes" = $9,
        "NewDeviceStatus" = $10
      WHERE "ID" = $11`,
      [
        event.name || null,
        event.deviceId || null,
        event.eventTypeId || null,
        event.description,
        event.img || null,
        event.startDate || null,
        event.finishDate,
        event.staffId || null,
        event.notes,
        event.newDeviceStatus || null,
        event.id
      ]
    );

    // Update device status if NewDeviceStatus is provided
    if (event.deviceId && event.newDeviceStatus) {
      await pool.query(
        `UPDATE "Device" SET "Status" = $1 WHERE "ID" = $2`,
        [event.newDeviceStatus.toString(), event.deviceId]
      );
    }

    return event.id;
  }

  async delete(id: number): Promise<boolean> {
    await pool.query('DELETE FROM "Event" WHERE "ID" = $1', [id]);
    return true;
  }
}

