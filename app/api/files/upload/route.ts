import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';
// Vercel Blob is used in production for persistent storage
let put: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ put } = require('@vercel/blob'));
} catch {
  // no-op locally if package not present yet
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload endpoint called');
    
    // Check authentication
    const authResult = await authenticate(request);
    if (!authResult.user) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authentication successful, user:', authResult.user.email);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'No file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name || 'unnamed';
    const ext = path.extname(originalName) || '';
    const baseName = path.basename(originalName, ext) || 'file';
    // Sanitize filename to prevent path traversal
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedBaseName}_${timestamp}${ext}`;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // If running on Vercel (production), use Blob storage
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    if (isProd && put) {
      const blob = await put(fileName, buffer, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
      });
      const fileUrl = blob.url as string;

      console.log('File uploaded to Vercel Blob:', fileName, fileUrl);
      return NextResponse.json({
        success: true,
        url: fileUrl,
        path: fileUrl,
        name: originalName,
        size: file.size,
      });
    }

    // Fallback for local/dev: save to public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    console.log('Local upload path:', filePath);
    await writeFile(filePath, buffer);
    const localUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: localUrl,
      path: localUrl,
      name: originalName,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

