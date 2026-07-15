import { Router, Request, Response } from 'express';
import { LessonRepository } from '../repositories/lesson.repository';
import { CourseRepository } from '../repositories/course.repository';
import { getBunnyVideoDetails } from '../services/bunny.stream.service';

const router = Router();
const lessonRepository = new LessonRepository();
const courseRepository = new CourseRepository();

/**
 * POST /api/webhooks/bunny/video-encoded
 *
 * Called by Bunny Stream when a video finishes transcoding.
 * Bunny sends a JSON body with VideoGuid, Status, and VideoLibraryId.
 * Status 4 = ready (encoding complete).
 *
 * Configure this in Bunny Stream → Library → API → Webhook URL:
 *   https://your-domain.com/api/webhooks/bunny/video-encoded
 */
router.post('/bunny/video-encoded', async (req: Request, res: Response) => {
  try {
    const { VideoGuid, Status } = req.body;

    // Validate VideoGuid looks like a UUID before any DB access.
    // This prevents injection of arbitrary IDs if the endpoint is ever hit
    // by a source other than Bunny (the endpoint has no signature to verify).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!VideoGuid || !UUID_RE.test(VideoGuid)) {
      return res.status(200).json({ success: true, message: 'Invalid or missing VideoGuid' });
    }

    // Status 3 = Finished (Encoding complete, fully available)
    // Status 4 = Resolution finished (Video playable)
    if (Status !== 3 && Status !== 4) {
      return res.status(200).json({ success: true, message: 'Ignored — not ready status' });
    }

    // Find the lesson with this Bunny videoId
    const lesson = await lessonRepository.findByVideoPublicId(VideoGuid);
    if (!lesson) {
      // Video may have been deleted already — not an error
      return res.status(200).json({ success: true, message: 'Lesson not found for videoId' });
    }

    // Fetch real duration from Bunny now that encoding is done
    const details = await getBunnyVideoDetails(VideoGuid);
    const duration = details.duration;

    if (duration > 0 && duration !== lesson.duration) {
      await lessonRepository.update(lesson._id.toString(), { duration } as any);

      // Recalculate totalDuration on the course
      const allLessons = await lessonRepository.findByCourse(lesson.course.toString());
      const totalDuration = allLessons.reduce((sum, l) => {
        return sum + (l._id.toString() === lesson._id.toString() ? duration : l.duration);
      }, 0);

      await courseRepository.update(lesson.course.toString(), { totalDuration } as any);

      console.log(`[Webhook] Updated duration for lesson ${lesson._id}: ${duration}s`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Webhook] Bunny video-encoded error:', err);
    // Always return 200 to Bunny so it doesn't retry forever
    return res.status(200).json({ success: false });
  }
});

export default router;
