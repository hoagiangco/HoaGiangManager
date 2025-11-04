import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

