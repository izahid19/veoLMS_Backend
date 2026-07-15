import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import Lesson from '../src/models/lesson.model';
import Course from '../src/models/course.model';
import { getBunnyVideoDetails } from '../src/services/bunny.stream.service';

async function main() {
  console.log('Connecting to database...');
  await connectDB();

  try {
    // Find all lessons that have a videoPublicId
    const lessons = await Lesson.find({ videoPublicId: { $exists: true, $ne: '' } });
    console.log(`Found ${lessons.length} lessons with a Bunny video public ID.`);

    for (const lesson of lessons) {
      console.log(`Checking duration for lesson: "${lesson.title}" (${lesson.videoPublicId})...`);
      try {
        const details = await getBunnyVideoDetails(lesson.videoPublicId);
        const duration = details.duration;

        if (duration > 0 && duration !== lesson.duration) {
          lesson.duration = duration;
          await lesson.save();
          console.log(`✅ Updated duration to ${duration}s for lesson "${lesson.title}"`);
        } else {
          console.log(`ℹ️ Duration is already up to date (${lesson.duration}s).`);
        }
      } catch (err) {
        console.error(`❌ Failed to fetch details for video ${lesson.videoPublicId}:`, (err as Error).message);
      }
    }

    // Now recalculate totalDuration for all courses
    const courses = await Course.find();
    console.log(`Recalculating totalDuration for ${courses.length} courses...`);
    for (const course of courses) {
      const courseLessons = await Lesson.find({ course: course._id });
      const totalDuration = courseLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
      if (course.totalDuration !== totalDuration) {
        course.totalDuration = totalDuration;
        await course.save();
        console.log(`✅ Updated course "${course.title}" totalDuration to ${totalDuration}s`);
      } else {
        console.log(`ℹ️ Course "${course.title}" duration already correct.`);
      }
    }

    console.log('🎉 Sync completed successfully!');
  } catch (err) {
    console.error('Fatal error during sync:', err);
  } finally {
    await disconnectDB();
  }
}

main();
