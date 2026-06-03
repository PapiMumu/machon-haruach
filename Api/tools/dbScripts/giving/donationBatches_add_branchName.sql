-- Run once on existing databases to add per-branch batch grouping.
ALTER TABLE `donationBatches`
  ADD COLUMN `branchName` varchar(128) DEFAULT NULL AFTER `batchDate`;
