import axios from 'axios';
import { config } from '../config/config';

const STREAM_API_BASE = 'https://video.bunnycdn.com/library';
const libraryId = config.BUNNY_STREAM_LIBRARY_ID;
const apiKey = config.BUNNY_STREAM_API_KEY;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BunnyVideoDetails {
  videoId: string;
  duration: number;        // seconds
  status: number;          // Bunny encode status (4 = ready, 5 = error)
  thumbnailUrl: string;
  playbackUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function streamHeaders() {
  return { AccessKey: apiKey };
}

/**
 * Build the HLS playback URL for a given videoId.
 * Format: https://<cdn-hostname>/<videoId>/playlist.m3u8
 */
export function buildPlaybackUrl(videoId: string): string {
  return `https://${config.BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
}

/**
 * Build the iframe embed URL for a given videoId.
 * Useful as a fallback for non-HLS players.
 */
export function buildEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Step 1 — Create a new video object in the Bunny Stream library.
 * Returns the videoId to use for upload and future references.
 */
export async function createBunnyVideo(title: string): Promise<string> {
  const response = await axios.post(
    `${STREAM_API_BASE}/${libraryId}/videos`,
    { title },
    { headers: streamHeaders() },
  );
  return response.data.guid as string;
}

/**
 * Step 2 — Upload the raw video bytes to Bunny Stream.
 * Uses a readable stream to avoid loading the whole file into memory.
 * @param videoId  - The guid returned by createBunnyVideo
 * @param stream   - A readable stream (e.g. fs.createReadStream)
 * @param fileSize - Content-Length in bytes (required by Bunny)
 */
export async function uploadBunnyVideo(
  videoId: string,
  stream: NodeJS.ReadableStream,
  fileSize: number,
): Promise<void> {
  await axios.put(
    `${STREAM_API_BASE}/${libraryId}/videos/${videoId}`,
    stream,
    {
      headers: {
        ...streamHeaders(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );
}

/**
 * Fetch video metadata from Bunny Stream.
 * Returns duration (seconds), encode status, thumbnail, and playback URL.
 */
export async function getBunnyVideoDetails(videoId: string): Promise<BunnyVideoDetails> {
  const response = await axios.get(
    `${STREAM_API_BASE}/${libraryId}/videos/${videoId}`,
    { headers: streamHeaders() },
  );

  const data = response.data;

  return {
    videoId: data.guid,
    duration: Math.round(data.length ?? 0),       // Bunny returns seconds as float
    status: data.status,
    thumbnailUrl: `https://${config.BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/${data.thumbnailFileName ?? 'thumbnail.jpg'}`,
    playbackUrl: buildPlaybackUrl(videoId),
  };
}

/**
 * Safely delete a video from Bunny Stream by its videoId.
 * Logs errors instead of throwing so cascading deletes never crash.
 */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  try {
    if (!videoId) return;
    await axios.delete(
      `${STREAM_API_BASE}/${libraryId}/videos/${videoId}`,
      { headers: streamHeaders() },
    );
  } catch (err) {
    console.error('[BunnyStream] Failed to delete video:', videoId, err);
  }
}
