import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { authenticate } from '@/lib/auth/middleware';
import { BackupService } from '@/lib/services/backupService';
import { isAdmin, isSuperAdmin } from '@/lib/auth/permissions';

/**
 * GET /api/admin/backup
 * Lists all backups, or downloads a specific backup file if ?download=<filename> is provided
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(authResult.user.roles)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ quản trị viên mới có quyền xem bản sao lưu' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const downloadName = searchParams.get('download');

    if (downloadName) {
      const filePath = BackupService.getBackupFilePath(downloadName);
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${downloadName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    const backups = await BackupService.listBackups();
    return NextResponse.json({ status: true, data: backups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup
 * Triggers a new local database backup
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(authResult.user.roles)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ quản trị viên mới có quyền tạo bản sao lưu' }, { status: 403 });
    }

    const result = await BackupService.createBackup();

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authResult.user.userId,
        'CREATE',
        'Backups',
        result.filename,
        null,
        {
          filename: result.filename,
          localPath: result.localPath,
        }
      );
    } catch (auditErr) {
      console.error('Audit log error on backup create:', auditErr);
    }

    return NextResponse.json({ 
      status: true, 
      message: 'Backup created successfully',
      data: result 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/backup
 * Deletes a local backup
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }
    if (!isSuperAdmin(authResult.user.roles)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ SuperAdmin mới có quyền xóa bản sao lưu' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Missing backup name' }, { status: 400 });
    }

    await BackupService.deleteBackup(name);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authResult.user.userId,
        'DELETE',
        'Backups',
        name,
        { name },
        null
      );
    } catch (auditErr) {
      console.error('Audit log error on backup delete:', auditErr);
    }

    return NextResponse.json({ status: true, message: 'Backup deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/backup
 * Restores a database from a local backup
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(authResult.user.roles)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ quản trị viên mới có quyền phục hồi dữ liệu' }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Missing backup name' }, { status: 400 });
    }

    await BackupService.restoreBackup(name);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authResult.user.userId,
        'UPDATE',
        'Database',
        name,
        null,
        { action: 'RESTORE', backupName: name }
      );
    } catch (auditErr) {
      console.error('Audit log error on database restore:', auditErr);
    }

    return NextResponse.json({ status: true, message: 'Database restored successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
