-- Migration: track number on songDetails (album track ordering)
-- Run before using album track numbers / reorder in B1Admin

ALTER TABLE songDetails ADD COLUMN trackNumber INT(11) DEFAULT NULL;
