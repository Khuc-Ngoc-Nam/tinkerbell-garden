USE `tinkerbellgarden`;

DROP PROCEDURE IF EXISTS `AddColumnIfMissing`;

DELIMITER //

CREATE PROCEDURE `AddColumnIfMissing`(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = p_ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL `AddColumnIfMissing`('PlaySession', 'EventID',
  'ALTER TABLE `PlaySession` ADD COLUMN `EventID` INT DEFAULT NULL AFTER `TypeID`');
CALL `AddColumnIfMissing`('PlaySession', 'GuestName',
  'ALTER TABLE `PlaySession` ADD COLUMN `GuestName` VARCHAR(120) DEFAULT NULL AFTER `StaffID`');
CALL `AddColumnIfMissing`('PlaySession', 'Purpose',
  'ALTER TABLE `PlaySession` ADD COLUMN `Purpose` ENUM(''Play'',''Event'') NOT NULL DEFAULT ''Play'' AFTER `GuestName`');
CALL `AddColumnIfMissing`('PlaySession', 'PaymentMethod',
  'ALTER TABLE `PlaySession` ADD COLUMN `PaymentMethod` ENUM(''Tiền mặt'',''Chuyển khoản'') DEFAULT NULL AFTER `AdultsCount`');
CALL `AddColumnIfMissing`('PlaySession', 'PaidAmount',
  'ALTER TABLE `PlaySession` ADD COLUMN `PaidAmount` DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER `PaymentMethod`');
CALL `AddColumnIfMissing`('EventRegistration', 'PaidAt',
  'ALTER TABLE `EventRegistration` ADD COLUMN `PaidAt` DATETIME DEFAULT NULL AFTER `Status`');
CALL `AddColumnIfMissing`('EventRegistration', 'TransactionID',
  'ALTER TABLE `EventRegistration` ADD COLUMN `TransactionID` INT DEFAULT NULL AFTER `PaidAt`');

DROP PROCEDURE `AddColumnIfMissing`;

ALTER TABLE `PlaySession` MODIFY COLUMN `CustomerID` INT DEFAULT NULL;
ALTER TABLE `PlaySession` MODIFY COLUMN `TypeID` INT DEFAULT NULL;

SET @has_session_event_fk := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'PlaySession'
    AND CONSTRAINT_NAME = 'fk_session_event'
);
SET @event_fk_sql := IF(
  @has_session_event_fk = 0,
  'ALTER TABLE `PlaySession` ADD CONSTRAINT `fk_session_event` FOREIGN KEY (`EventID`) REFERENCES `EventCampaign` (`EventID`)',
  'SELECT 1'
);
PREPARE stmt FROM @event_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `Transactions` (
  `TransactionID` INT NOT NULL AUTO_INCREMENT,
  `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `Type` ENUM('Vé vào cửa','Dịch vụ lẻ','Phạt lố giờ','VIP','Sự kiện') NOT NULL,
  `PaymentMethod` ENUM('Tiền mặt','Chuyển khoản') NOT NULL,
  `Timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `StaffID` INT DEFAULT NULL,
  `CustomerID` INT DEFAULT NULL,
  `SessionID` INT DEFAULT NULL,
  `OrderID` INT DEFAULT NULL,
  `EventRegistrationID` INT DEFAULT NULL,
  `VIPTransactionID` INT DEFAULT NULL,
  `Note` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`TransactionID`),
  KEY `idx_transactions_timestamp` (`Timestamp`),
  KEY `idx_transactions_type` (`Type`),
  KEY `fk_transactions_staff` (`StaffID`),
  KEY `fk_transactions_customer` (`CustomerID`),
  KEY `fk_transactions_session` (`SessionID`),
  KEY `fk_transactions_order` (`OrderID`),
  KEY `fk_transactions_event_registration` (`EventRegistrationID`),
  KEY `fk_transactions_vip` (`VIPTransactionID`),
  CONSTRAINT `fk_transactions_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_transactions_event_registration` FOREIGN KEY (`EventRegistrationID`) REFERENCES `EventRegistration` (`RegistrationID`),
  CONSTRAINT `fk_transactions_order` FOREIGN KEY (`OrderID`) REFERENCES `RetailOrder` (`OrderID`),
  CONSTRAINT `fk_transactions_session` FOREIGN KEY (`SessionID`) REFERENCES `PlaySession` (`SessionID`),
  CONSTRAINT `fk_transactions_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`),
  CONSTRAINT `fk_transactions_vip` FOREIGN KEY (`VIPTransactionID`) REFERENCES `VIPTransaction` (`VIPTransactionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
