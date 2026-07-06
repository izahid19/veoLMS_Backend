import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Lesson from './src/models/lesson.model';

async function test() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const lessons = await Lesson.find().sort({ createdAt: -1 }).limit(5);
  for (const l of lessons) {
    console.log(`Lesson: ${l.title}, duration: ${l.duration}, videoUrl: ${l.videoUrl}`);
  }
  process.exit(0);
}
test();
