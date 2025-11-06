import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

// Dynamic import for Vercel Blob (only in production)
async function uploadToBlob(fileName: string, buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    // Check if running on Vercel (multiple ways to detect)
    const isVercel = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    console.log('Blob upload check:', {
      isVercel,
      hasToken,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV,
    });

    // Only try blob if we have token (on Vercel or production)
    if (hasToken) {
      // Dynamic import to avoid bundling issues
      const { put } = await import('@vercel/blob');
      
      console.log('Uploading to Vercel Blob:', fileName, 'Size:', buffer.length);
      
      const blob = await put(fileName, buffer, {
        access: 'public',
        contentType: contentType || 'application/octet-stream',
      });
      
      console.log('Blob uploaded successfully:', blob.url);
      return blob.url;
    } else if (isVercel) {
      console.error('Running on Vercel but BLOB_READ_WRITE_TOKEN not found');
      throw new Error('BLOB_READ_WRITE_TOKEN is required for Vercel Blob upload');
    }
  } catch (error: any) {
    console.error('Vercel Blob upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Don't fallback - let caller handle the error
    throw error;
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

    // Check if running on Vercel (multiple ways to detect)
    const isVercel = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );

    console.log('Environment check:', {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      isVercel,
    });

    // Try Vercel Blob first (if available)
    let blobUrl: string | null = null;
    try {
      blobUrl = await uploadToBlob(fileName, buffer, file.type || 'application/octet-stream');
    } catch (blobError: any) {
      // If we're on Vercel and blob upload failed, return error immediately
      if (isVercel) {
        console.error('Vercel Blob upload failed:', blobError);
        const errorMsg = process.env.BLOB_READ_WRITE_TOKEN 
          ? `Failed to upload to Vercel Blob: ${blobError.message}. Please check Blob Store configuration and logs.`
          : 'Vercel Blob Store not configured. Please set up Blob Store in Vercel Dashboard and ensure BLOB_READ_WRITE_TOKEN is set.';
        
        return NextResponse.json(
          { 
            error: errorMsg,
            details: 'Vercel serverless functions have read-only filesystem. File upload requires Vercel Blob Storage.',
            troubleshooting: '1. Go to Vercel Dashboard → Storage → Create/Connect Blob Store. 2. Ensure BLOB_READ_WRITE_TOKEN is set. 3. Redeploy your project.'
          },
          { status: 500 }
        );
      }
      // If not on Vercel, fall through to local storage
      console.warn('Blob upload failed, falling back to local storage:', blobError.message);
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

    // CRITICAL: On Vercel, NEVER try to write to filesystem
    // If we're on Vercel and blob upload failed, return error immediately
    if (isVercel) {
      const errorMsg = process.env.BLOB_READ_WRITE_TOKEN 
        ? 'Failed to upload to Vercel Blob. Please check Blob Store configuration and logs.'
        : 'Vercel Blob Store not configured. Please set up Blob Store in Vercel Dashboard and ensure BLOB_READ_WRITE_TOKEN is set.';
      
      console.error('Vercel upload failed:', {
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        errorMsg,
      });
      
      return NextResponse.json(
        { 
          error: errorMsg,
          details: 'Vercel serverless functions have read-only filesystem. File upload requires Vercel Blob Storage.',
          troubleshooting: '1. Go to Vercel Dashboard → Storage → Create/Connect Blob Store. 2. Ensure BLOB_READ_WRITE_TOKEN is set. 3. Redeploy your project.'
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

