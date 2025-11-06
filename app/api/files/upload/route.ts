import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

// Dynamic import for Vercel Blob (only in production)
async function uploadToBlob(fileName: string, buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    // Check if running on Vercel
    const isVercel = !!process.env.VERCEL;
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    console.log('Blob upload check:', {
      isVercel,
      hasToken,
      nodeEnv: process.env.NODE_ENV,
    });

    // Only try blob in production/Vercel environment
    if (isVercel && hasToken) {
      // Dynamic import to avoid bundling issues
      const { put } = await import('@vercel/blob');
      
      console.log('Uploading to Vercel Blob:', fileName, 'Size:', buffer.length);
      
      const blob = await put(fileName, buffer, {
        access: 'public',
        contentType: contentType || 'application/octet-stream',
      });
      
      console.log('Blob uploaded successfully:', blob.url);
      return blob.url;
    } else if (isVercel && !hasToken) {
      console.error('Running on Vercel but BLOB_READ_WRITE_TOKEN not found');
    }
  } catch (error: any) {
    console.error('Vercel Blob upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Fallback to local storage
  }
  return null;
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

    // Try Vercel Blob first (if available)
    const blobUrl = await uploadToBlob(fileName, buffer, file.type || 'application/octet-stream');
    
    if (blobUrl) {
      console.log('File uploaded to Vercel Blob:', fileName, blobUrl);
      return NextResponse.json({
        success: true,
        url: blobUrl,
        path: blobUrl,
        name: originalName,
        size: file.size,
      });
    }

    // Fallback: Try to use /tmp directory on Vercel (read-only filesystem)
    // On Vercel, we cannot write to public/uploads, so we must use Blob
    if (process.env.VERCEL) {
      console.error('Vercel Blob not available, but running on Vercel. Please configure Blob Store.');
      return NextResponse.json(
        { 
          error: 'File upload not configured. Please set up Vercel Blob Store in your project settings.',
          details: 'Vercel serverless functions have read-only filesystem. Use Vercel Blob for file storage.'
        },
        { status: 500 }
      );
    }

    // Local development: save to public/uploads
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

