USE `tinkerbellgarden`;

DROP PROCEDURE IF EXISTS `AddEventCampaignColumnIfMissing`;

DELIMITER //

CREATE PROCEDURE `AddEventCampaignColumnIfMissing`(
  IN p_column_name VARCHAR(64),
  IN ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'EventCampaign'
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL `AddEventCampaignColumnIfMissing`('EventType',
  'ALTER TABLE `EventCampaign` ADD COLUMN `EventType` VARCHAR(80) NOT NULL DEFAULT ''Khác'' AFTER `EventName`');
CALL `AddEventCampaignColumnIfMissing`('ScaleText',
  'ALTER TABLE `EventCampaign` ADD COLUMN `ScaleText` VARCHAR(120) DEFAULT NULL AFTER `Description`');
CALL `AddEventCampaignColumnIfMissing`('EstimatedCost',
  'ALTER TABLE `EventCampaign` ADD COLUMN `EstimatedCost` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `ScaleText`');
CALL `AddEventCampaignColumnIfMissing`('Sponsor',
  'ALTER TABLE `EventCampaign` ADD COLUMN `Sponsor` VARCHAR(160) DEFAULT NULL AFTER `EstimatedCost`');
CALL `AddEventCampaignColumnIfMissing`('PlannedDate',
  'ALTER TABLE `EventCampaign` ADD COLUMN `PlannedDate` DATE DEFAULT NULL AFTER `Sponsor`');
CALL `AddEventCampaignColumnIfMissing`('StartTime',
  'ALTER TABLE `EventCampaign` ADD COLUMN `StartTime` TIME DEFAULT NULL AFTER `PlannedDate`');
CALL `AddEventCampaignColumnIfMissing`('EndTime',
  'ALTER TABLE `EventCampaign` ADD COLUMN `EndTime` TIME DEFAULT NULL AFTER `StartTime`');
CALL `AddEventCampaignColumnIfMissing`('RegistrationDeadline',
  'ALTER TABLE `EventCampaign` ADD COLUMN `RegistrationDeadline` DATE DEFAULT NULL AFTER `EndTime`');
CALL `AddEventCampaignColumnIfMissing`('DeliveryMode',
  'ALTER TABLE `EventCampaign` ADD COLUMN `DeliveryMode` ENUM(''Online'',''Offline'',''Hybrid'') NOT NULL DEFAULT ''Offline'' AFTER `RegistrationDeadline`');
CALL `AddEventCampaignColumnIfMissing`('OnlineDiscountPercent',
  'ALTER TABLE `EventCampaign` ADD COLUMN `OnlineDiscountPercent` DECIMAL(5,2) NOT NULL DEFAULT 20 AFTER `DiscountRate`');
CALL `AddEventCampaignColumnIfMissing`('MarketingHtml',
  'ALTER TABLE `EventCampaign` ADD COLUMN `MarketingHtml` LONGTEXT AFTER `OnlineDiscountPercent`');

DROP PROCEDURE `AddEventCampaignColumnIfMissing`;

UPDATE `EventCampaign`
SET
  `EventType` = COALESCE(NULLIF(`EventType`, ''), 'Khác'),
  `PlannedDate` = COALESCE(`PlannedDate`, DATE(`StartDate`)),
  `StartTime` = COALESCE(`StartTime`, TIME(`StartDate`)),
  `EndTime` = COALESCE(`EndTime`, TIME(`EndDate`)),
  `RegistrationDeadline` = COALESCE(`RegistrationDeadline`, DATE(`StartDate`)),
  `OnlineDiscountPercent` = COALESCE(`OnlineDiscountPercent`, 20),
  `MarketingHtml` = COALESCE(`MarketingHtml`, CONCAT('<h2>', `EventName`, '</h2><p>', COALESCE(`Description`, ''), '</p>'));

CREATE TABLE IF NOT EXISTS `EventRegistration` (
  `RegistrationID` INT NOT NULL AUTO_INCREMENT,
  `EventID` INT NOT NULL,
  `CustomerID` INT DEFAULT NULL,
  `ParentName` VARCHAR(120) NOT NULL,
  `Phone` VARCHAR(30) NOT NULL,
  `Email` VARCHAR(120) NOT NULL,
  `TicketCount` INT NOT NULL,
  `UnitPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `EarlyDiscountPercent` DECIMAL(5,2) NOT NULL DEFAULT 20,
  `VipDiscountPercent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `FinalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `TransferContent` VARCHAR(255) NOT NULL,
  `Status` ENUM('PendingTransfer','TransferSubmitted','Confirmed','Cancelled') NOT NULL DEFAULT 'TransferSubmitted',
  `SubmittedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RegistrationID`),
  KEY `fk_event_registration_event` (`EventID`),
  KEY `fk_event_registration_customer` (`CustomerID`),
  CONSTRAINT `fk_event_registration_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_event_registration_event` FOREIGN KEY (`EventID`) REFERENCES `EventCampaign` (`EventID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EventRegistrationChild` (
  `ChildID` INT NOT NULL AUTO_INCREMENT,
  `RegistrationID` INT NOT NULL,
  `RowNo` INT NOT NULL,
  `ChildName` VARCHAR(120) NOT NULL,
  `Mobile` VARCHAR(30) DEFAULT NULL,
  `BirthDate` DATE DEFAULT NULL,
  PRIMARY KEY (`ChildID`),
  KEY `fk_event_registration_child_registration` (`RegistrationID`),
  CONSTRAINT `fk_event_registration_child_registration` FOREIGN KEY (`RegistrationID`) REFERENCES `EventRegistration` (`RegistrationID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VipPaymentRequest` (
  `VipRequestID` INT NOT NULL AUTO_INCREMENT,
  `CustomerID` INT NOT NULL,
  `Years` INT NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `RequestType` ENUM('Register','Renew') NOT NULL DEFAULT 'Register',
  `Status` ENUM('PendingReview','Approved','Cancelled') NOT NULL DEFAULT 'PendingReview',
  `TransferContent` VARCHAR(255) NOT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`VipRequestID`),
  KEY `fk_vip_payment_customer` (`CustomerID`),
  CONSTRAINT `fk_vip_payment_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
