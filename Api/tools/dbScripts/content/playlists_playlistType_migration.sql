ALTER TABLE `playlists`
  ADD COLUMN `playlistType` varchar(16) NOT NULL DEFAULT 'video' AFTER `thumbnail`;

CREATE TABLE IF NOT EXISTS `playlistSongs` (
  `id` char(11) NOT NULL,
  `churchId` char(11) NOT NULL,
  `playlistId` char(11) NOT NULL,
  `songDetailId` char(11) NOT NULL,
  `sort` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_playlistSongs_playlist` (`playlistId`),
  KEY `idx_playlistSongs_church` (`churchId`),
  UNIQUE KEY `uk_playlistSongs_playlist_song` (`playlistId`, `songDetailId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
