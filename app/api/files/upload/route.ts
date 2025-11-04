import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

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

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name || 'unnamed';
    const ext = path.extname(originalName) || '';
    const baseName = path.basename(originalName, ext) || 'file';
    // Sanitize filename to prevent path traversal
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedBaseName}_${timestamp}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    
    console.log('File path:', filePath);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file URL
    const fileUrl = `/uploads/${fileName}`;
    
    console.log('File uploaded successfully:', {
      fileName,
      fileUrl,
      size: file.size
    });
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: fileUrl,
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

