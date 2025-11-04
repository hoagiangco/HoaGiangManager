import { NextRequest, NextResponse } from 'next/server';
import { rename } from 'fs/promises';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { oldName, newName } = body;
    
    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Old name and new name required' }, { status: 400 });
    }

    // Security: prevent directory traversal
    if (oldName.includes('..') || oldName.includes('/') || oldName.includes('\\') ||
        newName.includes('..') || newName.includes('/') || newName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const oldPath = path.join(uploadsDir, oldName);
    const newPath = path.join(uploadsDir, newName);
    
    if (!existsSync(oldPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (existsSync(newPath)) {
      return NextResponse.json({ error: 'File with this name already exists' }, { status: 400 });
    }

    await rename(oldPath, newPath);
    
    return NextResponse.json({ 
      success: true, 
      message: 'File renamed successfully',
      newUrl: `/uploads/${newName}`
    });
  } catch (error: any) {
    console.error('Rename file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rename file' },
      { status: 500 }
    );
  }
}



