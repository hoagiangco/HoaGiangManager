import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

// List files from Vercel Blob
async function listBlobFiles(): Promise<any[]> {
  try {
    // Check if running on Vercel and has token
    const isVercel = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (isVercel && hasToken) {
      // Dynamic import to avoid bundling issues
      const { list } = await import('@vercel/blob');
      
      console.log('Listing files from Vercel Blob...');
      
      // List all blobs
      const { blobs } = await list();
      
      console.log(`Found ${blobs.length} files in Vercel Blob`);
      
      // Map blob format to our file format
      return blobs.map((blob: any) => ({
        name: blob.pathname.split('/').pop() || blob.pathname, // Extract filename from path
        url: blob.url,
        path: blob.url,
        size: blob.size,
        modified: blob.uploadedAt || new Date().toISOString(),
        isDirectory: false,
      }));
    }
  } catch (error: any) {
    console.error('Error listing Vercel Blob files:', error);
    // Fallback to local storage
  }
  return [];
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if running on Vercel
    const isVercel = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    // If on Vercel and has token, list from Blob
    if (isVercel && hasToken) {
      try {
        const blobFiles = await listBlobFiles();
        
        // Sort by modified date (newest first)
        blobFiles.sort((a, b) => 
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
        );

        return NextResponse.json({ files: blobFiles });
      } catch (error: any) {
        console.error('Failed to list from Vercel Blob:', error);
        // Fall through to local storage as fallback
      }
    }

    // Fallback: Local filesystem (for development)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = await readdir(uploadsDir);
    const filePromises = files
      .filter(fileName => !fileName.startsWith('.')) // Filter out hidden files
      .map(async (fileName) => {
        const filePath = path.join(uploadsDir, fileName);
        const fileStats = await stat(filePath);
        
        // Only return files, not directories
        if (fileStats.isDirectory()) {
          return null;
        }
        
        return {
          name: fileName,
          url: `/uploads/${fileName}`,
          path: `/uploads/${fileName}`,
          size: fileStats.size,
          modified: fileStats.mtime.toISOString(),
          isDirectory: false,
        };
      });
    
    const fileList = await Promise.all(filePromises);
    
    // Filter out null values (directories)
    const validFiles = fileList.filter((file): file is NonNullable<typeof file> => file !== null);

    // Sort by modified date (newest first)
    validFiles.sort((a, b) => 
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );

    return NextResponse.json({ files: validFiles });
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}

