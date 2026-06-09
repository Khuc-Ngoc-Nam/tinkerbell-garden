USE `tinkerbellgarden`;

DROP PROCEDURE IF EXISTS `AddPlaySessionColumnIfMissing`;

DELIMITER //

CREATE PROCEDURE `AddPlaySessionColumnIfMissing`(
  IN p_column_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'PlaySession'
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = p_ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL `AddPlaySessionColumnIfMissing`('EventRegistrationID',
  'ALTER TABLE `PlaySession` ADD COLUMN `EventRegistrationID` INT DEFAULT NULL AFTER `EventBookingID`');
CALL `AddPlaySessionColumnIfMissing`('PrepaidOnline',
  'ALTER TABLE `PlaySession` ADD COLUMN `PrepaidOnline` BOOLEAN NOT NULL DEFAULT FALSE AFTER `EventRegistrationID`');

DROP PROCEDURE `AddPlaySessionColumnIfMissing`;

ALTER TABLE `PlaySession`
  MODIFY COLUMN `CheckinTime` DATETIME DEFAULT NULL,
  MODIFY COLUMN `Status` ENUM('Pending','Playing','Completed','Cancelled') NOT NULL DEFAULT 'Pending';

UPDATE `PlaySession`
SET `Status` = 'Playing'
WHERE `Status` IS NULL;

SET @has_registration_fk := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'PlaySession'
    AND CONSTRAINT_NAME = 'fk_session_event_registration'
);
SET @registration_fk_sql := IF(
  @has_registration_fk = 0,
  'ALTER TABLE `PlaySession` ADD CONSTRAINT `fk_session_event_registration` FOREIGN KEY (`EventRegistrationID`) REFERENCES `EventRegistration` (`RegistrationID`)',
  'SELECT 1'
);
PREPARE stmt FROM @registration_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

