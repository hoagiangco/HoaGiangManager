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
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');

    if (hasToken) {
      try {
        const { del, list } = await import('@vercel/blob');
        const token = process.env.BLOB_READ_WRITE_TOKEN as string;
        const baseTarget = decodedParam.trim();

        const normalize = (value: string) =>
          value.trim().replace(/^https?:\/\//, '').replace(/^\/+/, '');

        const findMatchingBlob = async () => {
          const targetNorm = normalize(baseTarget);
          let cursor: string | undefined;
          let pagesChecked = 0;
          const MAX_PAGES = 10;

          while (pagesChecked < MAX_PAGES) {
            pagesChecked++;
            const result: { blobs: any[]; cursor?: string } = await list({ cursor, token, limit: 1000 });
            for (const blob of result.blobs || []) {
              const compareValues = [
                blob.pathname,
                blob.pathname ? `/${blob.pathname}` : '',
                blob.url,
              ].filter(Boolean) as string[];

              if (compareValues.some((value) => normalize(value) === targetNorm)) {
                return blob;
              }
            }

            if (result.cursor && (result.blobs?.length || 0) > 0) {
              cursor = result.cursor;
            } else {
              break;
            }
          }

          return null;
        };

        const addCandidate = (set: Set<string>, value?: string | null) => {
          if (!value) return;
          const trimmed = value.trim();
          if (trimmed) {
            set.add(trimmed);
          }
        };

        const candidates = new Set<string>();
        addCandidate(candidates, baseTarget);
        if (baseTarget.startsWith('/')) {
          addCandidate(candidates, baseTarget.slice(1));
        } else {
          addCandidate(candidates, `/${baseTarget}`);
        }
        if (baseTarget.startsWith('http')) {
          try {
            const parsed = new URL(baseTarget);
            addCandidate(candidates, parsed.toString());
            const pathname = parsed.pathname?.startsWith('/')
              ? parsed.pathname.slice(1)
              : parsed.pathname;
            addCandidate(candidates, pathname);
            addCandidate(candidates, pathname ? `/${pathname}` : undefined);
          } catch (parseError) {
            console.warn('Failed to parse delete target as URL:', parseError);
          }
        }

        const matchedBlob = await findMatchingBlob();
        if (matchedBlob) {
          addCandidate(candidates, matchedBlob.pathname);
          addCandidate(candidates, matchedBlob.pathname ? `/${matchedBlob.pathname}` : undefined);
          addCandidate(candidates, matchedBlob.url);
        }

        const triedCandidates: string[] = [];
        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        for (const candidate of Array.from(candidates)) {
          triedCandidates.push(candidate);
          try {
            await del(candidate, { token });
            await wait(300);
            const stillExists = await findMatchingBlob();
            if (!stillExists) {
              return NextResponse.json({ success: true, message: 'File deleted successfully' });
            }
            console.warn('Blob delete reported success but blob still exists. Retrying...', {
              candidate,
              baseTarget,
            });
          } catch (candidateError: any) {
            if (!(candidateError?.status === 404 || candidateError?.code === 'not_found')) {
              console.warn(`Delete attempt failed for candidate "${candidate}":`, candidateError);
            }
          }
        }

        const finalCheck = await findMatchingBlob();
        if (!finalCheck) {
          return NextResponse.json({ success: true, message: 'File deleted successfully' });
        }

        return NextResponse.json({
          error: 'File not found or could not be deleted',
          attempted: triedCandidates,
        }, { status: 404 });
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

