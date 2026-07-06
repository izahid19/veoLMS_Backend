import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import Lesson from './src/models/lesson.model';

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fix() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const lessons = await Lesson.find({ videoPublicId: { $ne: '' }, $or: [{ duration: 0 }, { duration: { $exists: false } }] });
  
  console.log(`Found ${lessons.length} lessons to fix.`);
  
  for (const lesson of lessons) {
    try {
      console.log(`Fetching details for ${lesson.videoPublicId}`);
      const details = await cloudinary.api.resource(lesson.videoPublicId, { resource_type: 'video', media_metadata: true, image_metadata: true });
      if (details.duration) {
        lesson.duration = details.duration;
        await lesson.save();
        console.log(`Fixed lesson ${lesson._id}, new duration: ${details.duration}`);
      } else {
        console.log('No duration returned by Cloudinary');
      }
    } catch (err) {
      console.error(`Failed to fetch ${lesson.videoPublicId}:`, err);
    }
  }
  process.exit(0);
}
fix();
