import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { BackupService } from '@/lib/services/backupService';
import { isAdmin, isSuperAdmin } from '@/lib/auth/permissions';

/**
 * GET /api/admin/backup
 * Lists all backups
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

    const backups = await BackupService.listBackups();
    return NextResponse.json({ status: true, data: backups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup
 * Triggers a new backup
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
        result.localPath || result.blobUrl || 'backup',
        null,
        result
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
 * Deletes a backup
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
    const url = searchParams.get('url');

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await BackupService.deleteBackup(name, url);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authResult.user.userId,
        'DELETE',
        'Backups',
        name,
        { name, url },
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
 * Restores a backup
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

    const { name, url } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await BackupService.restoreBackup(name, url);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authResult.user.userId,
        'UPDATE',
        'Database',
        name,
        null,
        { action: 'RESTORE', backupName: name, url }
      );
    } catch (auditErr) {
      console.error('Audit log error on database restore:', auditErr);
    }

    return NextResponse.json({ status: true, message: 'Database restored successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
