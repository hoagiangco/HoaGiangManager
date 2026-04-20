import pool from '../db';
import { PoolClient } from 'pg';
import { NotificationService, NotificationType, NotificationCategory } from './notificationService';
import { Event, EventVM, EventStatus } from '@/types';

export class EventService {
  private async ensureEventSequence(client?: PoolClient): Promise<void> {
    const executor = client || pool;
    const maxRes = await executor.query(
      'SELECT COALESCE(MAX("ID"), 0) AS max_id FROM "Event"'
    );
    const seqRes = await executor.query(
      'SELECT last_value, is_called FROM "Event_ID_seq"'
    );

    const maxId = Number(maxRes.rows[0]?.max_id || 0);
    let seqValue = Number(seqRes.rows[0]?.last_value || 0);
    const isCalled = seqRes.rows[0]?.is_called ?? false;

    if (!isCalled) {
      seqValue -= 1;
    }

    if (maxId > seqValue) {
      await executor.query(
        'SELECT setval(pg_get_serial_sequence(\'"Event"\', \'ID\'), $1, true)',
        [maxId]
      );
    }
  }

  async getEventByType(eventTypeId: number = 0): Promise<EventVM[]> {
    let query = `
      SELECT 
        e."ID" as id,
        e."Title" as title,
        e."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        e."EventTypeID" as "eventTypeId",
        et."Name" as "eventTypeName",
        et."Code" as "eventTypeCode",
        et."Description" as "eventTypeDescription",
        et."Category" as "eventTypeCategory",
        e."Description" as description,
        e."Notes" as notes,
        e."Status" as status,
        e."EventDate" as "eventDate",
        e."StartDate" as "startDate",
        e."EndDate" as "endDate",
        e."StaffID" as "staffId",
        s."Name" as "staffName",
        e."RelatedReportID" as "relatedReportId",
        dr."DamageContent" as "relatedReportSummary",
        dr."DamageLocation" as "relatedReportLocation",
        e."Metadata" as metadata,
        e."CreatedBy" as "createdBy",
        e."CreatedAt" as "createdAt",
        e."UpdatedBy" as "updatedBy",
        e."UpdatedAt" as "updatedAt"
      FROM "Event" e
      LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
      LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
      LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
      LEFT JOIN "DamageReport" dr ON e."RelatedReportID" = dr."ID"
    `;

    const params: any[] = [];
    if (eventTypeId > 0) {
      query += ` WHERE e."EventTypeID" = $1`;
      params.push(eventTypeId);
    }

    query += ` ORDER BY COALESCE(e."EventDate", e."StartDate", e."EndDate", e."CreatedAt") DESC NULLS LAST, e."ID" DESC`;

    const result = await pool.query(query, params);
    return result.rows.map((row: any) => {
      let metadata: Record<string, any> | null = null;
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (error) {
            metadata = null;
          }
        } else {
          metadata = row.metadata;
        }
      }

      const statusValue = row.status ? String(row.status).toLowerCase() as EventStatus : EventStatus.Completed;

      return {
      id: row.id,
      title: row.title,
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      eventTypeId: row.eventTypeId,
      eventTypeName: row.eventTypeName,
      eventTypeCode: row.eventTypeCode,
      description: row.description,
      notes: row.notes,
        status: statusValue,
      eventDate: row.eventDate,
      startDate: row.startDate,
      endDate: row.endDate,
      staffId: row.staffId,
      staffName: row.staffName,
      relatedReportId: row.relatedReportId,
      relatedReportSummary: row.relatedReportSummary || row.relatedReportLocation || null,
        metadata,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
      } as EventVM;
    });
  }

  async getById(id: number): Promise<Event | null> {
    const result = await pool.query(
      `SELECT 
        "ID" as id,
        "Title" as title,
        "DeviceID" as "deviceId",
        "EventTypeID" as "eventTypeId",
        "Description" as description,
        "Notes" as notes,
        "Status" as status,
        "EventDate" as "eventDate",
        "StartDate" as "startDate",
        "EndDate" as "endDate",
        "StaffID" as "staffId",
        "RelatedReportID" as "relatedReportId",
        "Metadata" as metadata,
        "CreatedBy" as "createdBy",
        "CreatedAt" as "createdAt",
        "UpdatedBy" as "updatedBy",
        "UpdatedAt" as "updatedAt"
      FROM "Event" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    let metadata: Record<string, any> | null = null;
    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        try {
          metadata = JSON.parse(row.metadata);
        } catch (error) {
          metadata = null;
        }
      } else {
        metadata = row.metadata;
      }
    }

    return {
      id: row.id,
      title: row.title,
      deviceId: row.deviceId,
      eventTypeId: row.eventTypeId,
      description: row.description,
      notes: row.notes,
      status: (row.status ? String(row.status).toLowerCase() : EventStatus.Completed) as EventStatus,
      eventDate: row.eventDate,
      startDate: row.startDate,
      endDate: row.endDate,
      staffId: row.staffId,
      relatedReportId: row.relatedReportId,
      metadata,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  async getByRelatedReportId(reportId: number): Promise<Event | null> {
    const result = await pool.query(
      `SELECT 
        "ID" as id,
        "Title" as title,
        "DeviceID" as "deviceId",
        "EventTypeID" as "eventTypeId",
        "Description" as description,
        "Notes" as notes,
        "Status" as status,
        "EventDate" as "eventDate",
        "StartDate" as "startDate",
        "EndDate" as "endDate",
        "StaffID" as "staffId",
        "RelatedReportID" as "relatedReportId",
        "Metadata" as metadata,
        "CreatedBy" as "createdBy",
        "CreatedAt" as "createdAt",
        "UpdatedBy" as "updatedBy",
        "UpdatedAt" as "updatedAt"
      FROM "Event" 
      WHERE "RelatedReportID" = $1 
      ORDER BY "ID" DESC LIMIT 1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    let metadata: Record<string, any> | null = null;
    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        try {
          metadata = JSON.parse(row.metadata);
        } catch (error) {
          metadata = null;
        }
      } else {
        metadata = row.metadata;
      }
    }

    return {
      id: row.id,
      title: row.title,
      deviceId: row.deviceId,
      eventTypeId: row.eventTypeId,
      description: row.description,
      notes: row.notes,
      status: (row.status ? String(row.status).toLowerCase() : EventStatus.Completed) as EventStatus,
      eventDate: row.eventDate,
      startDate: row.startDate,
      endDate: row.endDate,
      staffId: row.staffId,
      relatedReportId: row.relatedReportId,
      metadata,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  async create(event: Omit<Event, 'id'>): Promise<number> {
    await this.ensureEventSequence();

    const now = new Date();
    const result = await pool.query(
      `INSERT INTO "Event" (
        "Title", "DeviceID", "EventTypeID", "Description", "Notes",
        "Status", "EventDate", "StartDate", "EndDate", "StaffID",
        "RelatedReportID", "Metadata", "CreatedBy", "CreatedAt",
        "UpdatedBy", "UpdatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING "ID"`,
      [
        event.title || null,
        event.deviceId || null,
        event.eventTypeId,
        event.description || null,
        event.notes || '', // Notes column is NOT NULL, so use empty string instead of null
        event.status || EventStatus.Completed,
        event.eventDate || null,
        event.startDate || null,
        event.endDate || null,
        event.staffId || null,
        event.relatedReportId || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.createdBy || null,
        event.createdAt || now,
        event.updatedBy || event.createdBy || null,
        event.updatedAt || now
      ]
    );

    return result.rows[0].ID;
  }

  async update(event: Event): Promise<number> {
    await this.ensureEventSequence();

    // Get current status to detect change
    const currentRes = await pool.query('SELECT "Status" FROM "Event" WHERE "ID" = $1', [event.id]);
    const oldStatus = currentRes.rows[0]?.Status;

    await pool.query(
      `UPDATE "Event" SET
        "Title" = $1,
        "DeviceID" = $2,
        "EventTypeID" = $3,
        "Description" = $4,
        "Notes" = $5,
        "Status" = $6,
        "EventDate" = $7,
        "StartDate" = $8,
        "EndDate" = $9,
        "StaffID" = $10,
        "RelatedReportID" = $11,
        "Metadata" = $12,
        "UpdatedBy" = $13,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "ID" = $14`,
      [
        event.title || null,
        event.deviceId || null,
        event.eventTypeId,
        event.description || null,
        event.notes || '', // Notes column is NOT NULL, so use empty string instead of null
        event.status || 'completed',
        event.eventDate || null,
        event.startDate || null,
        event.endDate || null,
        event.staffId || null,
        event.relatedReportId || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.updatedBy || null,
        event.id
      ]
    );

    // Notification on completion
    if (oldStatus !== event.status && event.status === 'completed') {
      try {
        const staffRes = await pool.query('SELECT "Name" FROM "Staff" WHERE "ID" = $1', [event.staffId]);
        const staffName = staffRes.rows[0]?.Name || 'Nhân viên';
        
        const ns = new NotificationService();
        await ns.createNotification({
          title: 'Sự kiện hoàn thành ✅',
          content: `${staffName} đã hoàn thành: ${event.title || 'Một sự kiện'}`,
          type: NotificationType.System,
          category: NotificationCategory.Completed,
          targetUrl: `/dashboard/events`,
          createdBy: event.updatedBy || undefined,
          excludeUserId: event.updatedBy || undefined
        });
      } catch (err) {
        console.error('Error sending event completion notification:', err);
      }
    }

    return event.id;
  }

  async delete(id: number): Promise<boolean> {
    await pool.query('DELETE FROM "Event" WHERE "ID" = $1', [id]);
    return true;
  }
}

