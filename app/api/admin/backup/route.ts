import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { BackupService } from '@/lib/services/backupService';

/**
 * GET /api/admin/backup
 * Lists all backups
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user || !authResult.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (!authResult.user || !authResult.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await BackupService.createBackup();
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
    if (!authResult.user || !authResult.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const url = searchParams.get('url');

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await BackupService.deleteBackup(name, url);
    return NextResponse.json({ status: true, message: 'Backup deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup/restore
 * Restores a backup
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.user || !authResult.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, url } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await BackupService.restoreBackup(name, url);
    return NextResponse.json({ status: true, message: 'Database restored successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
