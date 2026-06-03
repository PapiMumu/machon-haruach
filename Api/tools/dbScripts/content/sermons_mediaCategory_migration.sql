-- Video library category (sermon, movie, kids, dance, musicVideo, other).
-- Distinct from videoType (youtube, vimeo, facebook, etc.).
ALTER TABLE `sermons`
  ADD COLUMN `mediaCategory` varchar(45) DEFAULT 'sermon' AFTER `playlistId`;
