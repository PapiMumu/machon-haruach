-- Migration: song credits / metadata on songDetails
-- Run manually before deploying API + B1Admin changes

ALTER TABLE songDetails ADD COLUMN featuredArtists VARCHAR(255) DEFAULT NULL;
ALTER TABLE songDetails ADD COLUMN producer VARCHAR(255) DEFAULT NULL;
ALTER TABLE songDetails ADD COLUMN composer VARCHAR(255) DEFAULT NULL;
ALTER TABLE songDetails ADD COLUMN lyricist VARCHAR(255) DEFAULT NULL;
ALTER TABLE songDetails ADD COLUMN genre VARCHAR(100) DEFAULT NULL;
ALTER TABLE songDetails ADD COLUMN recordLabel VARCHAR(255) DEFAULT NULL;
