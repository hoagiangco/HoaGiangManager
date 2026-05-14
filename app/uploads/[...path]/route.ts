import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force this route to be dynamic to ensure we always read the latest files from disk
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruct the file path from the catch-all parameters
    const filePath = Array.isArray(params.path) ? params.path.join('/') : params.path;
    
    if (!filePath) {
      return new NextResponse('File path missing', { status: 400 });
    }

    // Determine the upload directory
    let uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (process.env.UPLOAD_DIR) {
      uploadsDir = path.isAbsolute(process.env.UPLOAD_DIR) 
        ? process.env.UPLOAD_DIR 
        : path.join(process.cwd(), process.env.UPLOAD_DIR);
    }

    const fullPath = path.join(uploadsDir, filePath);

    // Security check: Ensure the path is within the uploads directory and doesn't use .. to escape
    const resolvedUploadsDir = path.resolve(uploadsDir);
    const resolvedFullPath = path.resolve(fullPath);

    if (!resolvedFullPath.startsWith(resolvedUploadsDir)) {
      console.warn(`[Uploads Route] Blocked access attempt outside uploads dir: ${resolvedFullPath}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedFullPath)) {
      console.log(`[Uploads Route] File not found: ${resolvedFullPath}`);
      return new NextResponse('File Not Found', { status: 404 });
    }

    // Only allow files, not directories
    const stats = fs.statSync(resolvedFullPath);
    if (stats.isDirectory()) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(resolvedFullPath);
    
    // Determine content type based on extension
    const ext = path.extname(resolvedFullPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.sql': 'text/plain',
      '.dump': 'application/octet-stream',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error('[Uploads Route] Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
