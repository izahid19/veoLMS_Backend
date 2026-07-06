import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/course.model';
import Lesson from './src/models/lesson.model';

dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const courses = await Course.find();
  for (const course of courses) {
    const lessons = await Lesson.find({ course: course._id });
    const totalDuration = lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
    course.totalDuration = totalDuration;
    await course.save();
    console.log(`Course ${course._id} updated totalDuration to ${totalDuration}`);
  }
  process.exit(0);
}
fix();
