import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { authenticate } from '@/lib/auth/middleware';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await authenticate(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawFileParam = searchParams.get('file');

    if (!rawFileParam) {
      return NextResponse.json({ error: 'File name required' }, { status: 400 });
    }

    const decodedParam = decodeURIComponent(rawFileParam);

    const isVercel = !!(
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    );
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (isVercel) {
      if (!hasToken) {
        console.error('Delete file error: Missing BLOB_READ_WRITE_TOKEN on Vercel');
        return NextResponse.json({
          error: 'BLOB_READ_WRITE_TOKEN is required to delete files on Vercel.',
        }, { status: 500 });
      }

      try {
        const { del } = await import('@vercel/blob');
        const baseTarget = decodedParam.trim();

        const candidates = new Set<string>();
        if (baseTarget) {
          candidates.add(baseTarget);

          if (baseTarget.startsWith('/')) {
            candidates.add(baseTarget.slice(1));
          } else {
            candidates.add(`/${baseTarget}`);
          }

          if (baseTarget.startsWith('http')) {
            try {
              const parsed = new URL(baseTarget);
              const pathname = parsed.pathname?.startsWith('/')
                ? parsed.pathname.slice(1)
                : parsed.pathname;
              if (pathname) {
                candidates.add(pathname);
                candidates.add(`/${pathname}`);
              }
              // Ensure full URL is also attempted
              candidates.add(parsed.toString());
            } catch (parseError) {
              console.warn('Failed to parse delete target as URL:', parseError);
            }
          }
        }

        let lastError: any = null;
        let triedCandidates: string[] = [];
        for (const candidate of Array.from(candidates)) {
          try {
            triedCandidates.push(candidate);
            await del(candidate, { token: process.env.BLOB_READ_WRITE_TOKEN });
            return NextResponse.json({ success: true, message: 'File deleted successfully' });
          } catch (candidateError: any) {
            lastError = candidateError;
            if (!(candidateError?.status === 404 || candidateError?.code === 'not_found')) {
              console.warn(`Delete attempt failed for candidate "${candidate}":`, candidateError);
            }
          }
        }

        if (lastError?.status === 404 || lastError?.code === 'not_found') {
          try {
            const { list } = await import('@vercel/blob');
            const token = process.env.BLOB_READ_WRITE_TOKEN as string;
            const searchTerm = baseTarget.replace(/^https?:\/\//, '').trim();
            let cursor: string | undefined = undefined;
            let match: any = null;
            let pagesChecked = 0;
            const MAX_PAGES = 10;

            while (!match && pagesChecked < MAX_PAGES) {
              pagesChecked++;
              const result = await list({ cursor, token, limit: 1000 });
              for (const blob of result.blobs || []) {
                const candidatesToCompare = [
                  blob.pathname,
                  blob.pathname ? `/${blob.pathname}` : '',
                  blob.url,
                ].filter(Boolean) as string[];

                const normalized = (value: string) => value.trim().replace(/^https?:\/\//, '').replace(/^\/+/, '');
                const normBase = normalized(baseTarget);

                if (candidatesToCompare.some(candidate => normalized(candidate) === normBase)) {
                  match = blob;
                  break;
                }
              }

              if (!match && result.cursor && (result.blobs?.length || 0) > 0) {
                cursor = result.cursor;
              } else {
                break;
              }
            }

            if (match) {
              await del(match.pathname, { token });
              return NextResponse.json({ success: true, message: 'File deleted successfully' });
            }
          } catch (recoveryError) {
            console.warn('Blob delete recovery attempt failed:', recoveryError);
          }

          return NextResponse.json({ error: 'File not found', attempted: triedCandidates }, { status: 404 });
        }

        throw lastError || new Error('Unknown delete error');
      } catch (error: any) {
        console.error('Vercel Blob delete error:', error);
        return NextResponse.json({
          error: error?.message || 'Failed to delete file from Vercel Blob',
        }, { status: 500 });
      }
    }

    // Local filesystem (development only)
    let fileName = decodedParam;
    if (fileName.startsWith('/uploads/')) {
      fileName = fileName.replace('/uploads/', '');
    }

    // Security: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);

    try {
      await unlink(filePath);
      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

