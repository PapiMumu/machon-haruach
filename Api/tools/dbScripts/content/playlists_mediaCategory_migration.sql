ALTER TABLE `playlists`
  ADD COLUMN `mediaCategory` varchar(32) NOT NULL DEFAULT 'sermon' AFTER `playlistType`;
