-- ============================================================
-- VidGen: YouTube publish scheduling fields on videos
-- ============================================================

ALTER TABLE IF EXISTS videos
  ADD COLUMN IF NOT EXISTS youtube_publish_status TEXT,
  ADD COLUMN IF NOT EXISTS youtube_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS youtube_publish_visibility TEXT,
  ADD COLUMN IF NOT EXISTS youtube_publish_error TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_published_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'videos_youtube_publish_status_check'
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_youtube_publish_status_check
      CHECK (
        youtube_publish_status IS NULL OR
        youtube_publish_status IN ('scheduled', 'publishing', 'published', 'failed')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'videos_youtube_publish_visibility_check'
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_youtube_publish_visibility_check
      CHECK (
        youtube_publish_visibility IS NULL OR
        youtube_publish_visibility IN ('private', 'public', 'unlisted')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_youtube_publish_status
  ON videos(youtube_publish_status);

CREATE INDEX IF NOT EXISTS idx_videos_youtube_publish_at
  ON videos(youtube_publish_at);
