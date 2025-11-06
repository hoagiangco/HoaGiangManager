import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

// List files from Vercel Blob
async function listBlobFiles(): Promise<any[]> {
  try {
    // Dynamic import to avoid bundling issues
    const { list } = await import('@vercel/blob');
    
    console.log('Calling Vercel Blob list()...');
    
    // List all blobs with pagination support
    let allBlobs: any[] = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    
    while (hasMore && pageCount < maxPages) {
      pageCount++;
      console.log(`Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}...`);
      
      const result: any = await list({
        cursor: cursor,
        limit: 1000, // Maximum items per page
      });
      
      console.log(`Page ${pageCount} result:`, {
        hasBlobs: !!result.blobs,
        blobCount: result.blobs?.length || 0,
        hasCursor: !!result.cursor,
        hasHasMore: 'hasMore' in result ? result.hasMore : 'N/A',
      });
      
      const pageBlobs = result.blobs || [];
      allBlobs = allBlobs.concat(pageBlobs);
      
      // Check if there are more pages
      if (result.cursor && pageBlobs.length > 0) {
        cursor = result.cursor;
        hasMore = true;
      } else {
        hasMore = false;
      }
      
      // If no cursor or empty result, we're done
      if (!result.cursor || pageBlobs.length === 0) {
        hasMore = false;
      }
    }
    
    console.log(`Total files found: ${allBlobs.length} (across ${pageCount} pages)`);
    
    if (allBlobs.length > 0) {
      console.log('Sample blob:', {
        pathname: allBlobs[0].pathname,
        url: allBlobs[0].url,
        size: allBlobs[0].size,
        uploadedAt: allBlobs[0].uploadedAt,
      });
    }
    
    // Map blob format to our file format
    const mappedFiles = allBlobs.map((blob: any) => {
      // Extract filename from pathname (could be just filename or path/filename)
      // Handle both cases: "filename.jpg" or "path/to/filename.jpg"
      let fileName = blob.pathname || 'unnamed';
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop() || fileName;
      }
      
      return {
        name: fileName,
        url: blob.url,
        path: blob.url,
        size: blob.size || 0,
        modified: blob.uploadedAt || blob.createdAt || new Date().toISOString(),
        isDirectory: false,
      };
    });
    
    console.log(`Mapped ${mappedFiles.length} files for FileManager`);
    return mappedFiles;
  } catch (error: any) {
    console.error('Error listing Vercel Blob files:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error; // Re-throw to let caller handle
  }
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

    console.log('List files - Environment check:', {
      isVercel,
      hasToken,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    });

    // If on Vercel and has token, list from Blob
    if (isVercel && hasToken) {
      console.log('Attempting to list files from Vercel Blob...');
      try {
        const blobFiles = await listBlobFiles();
        
        console.log(`Successfully retrieved ${blobFiles.length} files from Vercel Blob`);
        
        // Sort by modified date (newest first)
        blobFiles.sort((a, b) => 
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
        );

        return NextResponse.json({ files: blobFiles });
      } catch (error: any) {
        console.error('Failed to list from Vercel Blob:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        
        // On Vercel, if Blob list fails, return empty array instead of falling back to filesystem
        if (isVercel) {
          console.error('On Vercel, cannot fallback to local filesystem. Returning empty array.');
          return NextResponse.json({ files: [] });
        }
        // Only fall through to local storage if NOT on Vercel
      }
    } else {
      console.log('Skipping Vercel Blob list:', {
        reason: !isVercel ? 'Not on Vercel' : 'No BLOB_READ_WRITE_TOKEN',
        isVercel,
        hasToken,
      });
      
      // If on Vercel but no token, return empty array (cannot use local filesystem)
      if (isVercel) {
        console.error('On Vercel but BLOB_READ_WRITE_TOKEN not found. Returning empty array.');
        return NextResponse.json({ files: [] });
      }
    }

    // Fallback: Local filesystem (ONLY for development, NOT on Vercel)
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

