import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'veolms/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', quality: 'auto' }],
  } as any,
});

const avatarMulter = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('INVALID_TYPE'));
    } else {
      cb(null, true);
    }
  },
}).single('avatar');

export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  avatarMulter(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size must be under 2MB' });
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

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'veolms/videos',
    allowed_formats: ['mp4', 'mov', 'webm', 'mkv'],
    resource_type: 'video',
  } as any,
});

const videoMulter = multer({ storage: videoStorage }).single('video');

export const uploadVideo = (req: Request, res: Response, next: NextFunction) => {
  videoMulter(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};
