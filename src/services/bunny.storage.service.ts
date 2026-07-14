import axios from 'axios';
import { config } from '../config/config';

const STORAGE_BASE_URL = `https://${config.BUNNY_STORAGE_HOST}/${config.BUNNY_STORAGE_ZONE}`;

/**
 * Upload a file buffer to Bunny Storage.
 * @param buffer   - Raw file bytes
 * @param fileName - Unique file name (e.g. `avatar-123.webp`)
 * @param folder   - Folder inside the storage zone (e.g. `avatars`, `thumbnails`)
 * @returns        Public CDN URL for the uploaded file
 */
export async function uploadFileToBunny(
  buffer: Buffer,
  fileName: string,
  folder: string,
): Promise<string> {
  const path = `${folder}/${fileName}`;
  const url = `${STORAGE_BASE_URL}/${path}`;

  await axios.put(url, buffer, {
    headers: {
      AccessKey: config.BUNNY_STORAGE_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  // Return the CDN pull zone URL
  return `${config.BUNNY_CDN_URL}/${path}`;
}

/**
 * Delete a file from Bunny Storage using its CDN URL.
 * Safe — logs errors instead of throwing so callers never crash.
 * @param cdnUrl - The full CDN URL previously returned by uploadFileToBunny
 */
export async function deleteFileFromBunny(cdnUrl: string): Promise<void> {
  try {
    if (!cdnUrl) return;

    // Convert CDN URL back to storage path
    // e.g. https://veoLMS-pull.b-cdn.net/avatars/avatar-123.webp
    //       → avatars/avatar-123.webp
    const cdnBase = config.BUNNY_CDN_URL.replace(/\/$/, '');
    const storagePath = cdnUrl.replace(cdnBase, '').replace(/^\//, '');

    if (!storagePath) return;

    const url = `${STORAGE_BASE_URL}/${storagePath}`;

    await axios.delete(url, {
      headers: {
        AccessKey: config.BUNNY_STORAGE_API_KEY,
      },
    });
  } catch (err) {
    console.error('[BunnyStorage] Failed to delete file:', cdnUrl, err);
  }
}
