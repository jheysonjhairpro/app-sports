-- AlterTable
ALTER TABLE `password_reset` ADD COLUMN `intentos` TINYINT NOT NULL DEFAULT 0;
