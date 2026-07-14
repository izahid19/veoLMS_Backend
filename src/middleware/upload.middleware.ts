import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';

// ── Image uploads (avatars, thumbnails) ───────────────────────────────────────
// Small files — buffer in memory for a direct PUT to Bunny Storage.

const imageMemoryStorage = multer.memoryStorage();

const imageMulter = multer({
  storage: imageMemoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('INVALID_TYPE'));
    } else {
      cb(null, true);
    }
  },
});

export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  imageMulter.single('avatar')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size must be under 5MB' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      if (err.message === 'INVALID_TYPE') {
        return res.status(400).json({ success: false, message: 'Only image files allowed' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

export const uploadThumbnail = (req: Request, res: Response, next: NextFunction) => {
  imageMulter.single('thumbnail')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size must be under 5MB' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      if (err.message === 'INVALID_TYPE') {
        return res.status(400).json({ success: false, message: 'Only image files allowed' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ── Video uploads ─────────────────────────────────────────────────────────────
// Large files — write to a temp file on disk, then stream to Bunny.
// This avoids buffering gigabytes of video in server RAM.

const videoDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir()); // system temp dir
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video-${Date.now()}${ext}`);
  },
});

const videoMulter = multer({
  storage: videoDiskStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('INVALID_VIDEO_TYPE'));
    } else {
      cb(null, true);
    }
  },
});

export const uploadVideo = (req: Request, res: Response, next: NextFunction) => {
  videoMulter.single('video')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      if (err.message === 'INVALID_VIDEO_TYPE') {
        return res.status(400).json({ success: false, message: 'Invalid video format. Allowed: mp4, mov, webm, mkv, avi' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};
