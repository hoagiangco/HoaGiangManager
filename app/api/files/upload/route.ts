import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

// Upload to Vercel Blob (works in both local dev and production when BLOB_READ_WRITE_TOKEN is set)
async function uploadToBlob(fileName: string, buffer: Buffer, contentType: string): Promise<string | null> {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');
  
  console.log('Blob upload check:', {
    hasToken,
    nodeEnv: process.env.NODE_ENV,
  });

  if (!hasToken) {
    return null; // No token → fallback to local storage
  }

  try {
    const { put } = await import('@vercel/blob');
    
    console.log('Uploading to Vercel Blob:', fileName, 'Size:', buffer.length);
    
    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
    });
    
    console.log('Blob uploaded successfully:', blob.url);
    return blob.url;
  } catch (error: any) {
    console.error('Vercel Blob upload error:', error.message);
    throw error;
  }
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

    // Check if running on Vercel (for filesystem restriction check)
    const isVercel = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');

    console.log('Environment check:', { isVercel, hasToken, nodeEnv: process.env.NODE_ENV });

    // Try Vercel Blob first — works both locally and on Vercel when token is set
    let blobUrl: string | null = null;
    try {
      blobUrl = await uploadToBlob(fileName, buffer, file.type || 'application/octet-stream');
    } catch (blobError: any) {
      // If blob upload failed (token exists but error occurred), return error
      if (hasToken) {
        console.error('Vercel Blob upload failed:', blobError);
        return NextResponse.json(
          { 
            error: `Upload lên Vercel Blob thất bại: ${blobError.message}`,
            details: 'Kiểm tra lại BLOB_READ_WRITE_TOKEN và cấu hình Blob Store.'
          },
          { status: 500 }
        );
      }
      // No token → fall through to local storage
      console.warn('No BLOB_READ_WRITE_TOKEN, falling back to local storage');
    }
    
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

    // On Vercel without blob: filesystem is read-only, cannot save locally
    if (isVercel && !blobUrl) {
      return NextResponse.json(
        { 
          error: 'Vercel Blob Store chưa được cấu hình. Vui lòng thêm BLOB_READ_WRITE_TOKEN vào environment variables.',
          troubleshooting: '1. Vào Vercel Dashboard → Storage → Tạo/Kết nối Blob Store. 2. Đảm bảo BLOB_READ_WRITE_TOKEN được set. 3. Redeploy project.'
        },
        { status: 500 }
      );
    }

    // ONLY for local development: save to public/uploads
    // This code should NEVER run on Vercel
    console.log('Using local file storage (development mode)');
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

