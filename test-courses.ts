import 'dotenv/config';
import { connectDB } from './src/config/db';
import Course from './src/models/course.model';

async function run() {
  await connectDB();
  console.log('Connected to DB');
  const courses = await Course.find({});
  console.log('Courses:', courses);
  process.exit(0);
}
run();
