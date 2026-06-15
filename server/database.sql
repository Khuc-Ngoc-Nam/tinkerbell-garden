CREATE DATABASE IF NOT EXISTS `tinkerbellgarden`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `tinkerbellgarden`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `EmailOutbox`;
DROP TABLE IF EXISTS `VIPTransaction`;
DROP TABLE IF EXISTS `Transactions`;
DROP TABLE IF EXISTS `VipPaymentRequest`;
DROP TABLE IF EXISTS `TicketInvoice`;
DROP TABLE IF EXISTS `SessionService`;
DROP TABLE IF EXISTS `PlaySession`;
DROP TABLE IF EXISTS `TicketReservation`;
DROP TABLE IF EXISTS `EventRegistrationChild`;
DROP TABLE IF EXISTS `EventRegistration`;
DROP TABLE IF EXISTS `EventBooking`;
DROP TABLE IF EXISTS `EventCampaign`;
DROP TABLE IF EXISTS `RetailOrderDetail`;
DROP TABLE IF EXISTS `RetailOrder`;
DROP TABLE IF EXISTS `Product`;
DROP TABLE IF EXISTS `PaidService`;
DROP TABLE IF EXISTS `StaffAreaAssignment`;
DROP TABLE IF EXISTS `FacilityCashier`;
DROP TABLE IF EXISTS `FacilityIssue`;
DROP TABLE IF EXISTS `Facility`;
DROP TABLE IF EXISTS `TicketType`;
DROP TABLE IF EXISTS `Customer`;
DROP TABLE IF EXISTS `Staff`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `Staff` (
  `StaffID` INT NOT NULL AUTO_INCREMENT,
  `FullName` VARCHAR(120) NOT NULL DEFAULT '',
  `Username` VARCHAR(50) NOT NULL,
  `PasswordHash` VARCHAR(255) NOT NULL,
  `Role` ENUM('Manager','Cashier') NOT NULL,
  `CCCD` VARCHAR(20) DEFAULT NULL,
  `Active` BOOLEAN NOT NULL DEFAULT TRUE,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`StaffID`),
  UNIQUE KEY `uk_staff_username` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Customer` (
  `CustomerID` INT NOT NULL AUTO_INCREMENT,
  `FullName` VARCHAR(120) NOT NULL,
  `Email` VARCHAR(120) DEFAULT NULL,
  `Phone` VARCHAR(20) NOT NULL,
  `PasswordHash` VARCHAR(255) DEFAULT NULL,
  `IsVIP` BOOLEAN NOT NULL DEFAULT FALSE,
  `VIPExpiryDate` DATETIME DEFAULT NULL,
  `AccumulatedHours` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `LoyaltyPoints` INT NOT NULL DEFAULT 0,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `uk_customer_phone` (`Phone`),
  UNIQUE KEY `uk_customer_email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TicketType` (
  `TypeID` INT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(30) NOT NULL,
  `TypeName` VARCHAR(80) NOT NULL,
  `BasePrice` DECIMAL(18,2) NOT NULL,
  `TimeLimit` INT DEFAULT NULL,
  `Active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`TypeID`),
  UNIQUE KEY `uk_ticket_code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Facility` (
  `FacilityID` INT NOT NULL AUTO_INCREMENT,
  `FacilityName` VARCHAR(120) NOT NULL,
  `Description` TEXT,
  `Status` ENUM('Normal','Broken','Maintenance') NOT NULL DEFAULT 'Normal',
  `AssetStatus` ENUM('Ok','Issue') NOT NULL DEFAULT 'Ok',
  `Capacity` INT NOT NULL DEFAULT 0,
  `ImageURL` VARCHAR(255) DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`FacilityID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `StaffAreaAssignment` (
  `StaffID` INT NOT NULL,
  `AreaType` ENUM('Gate','Facility') NOT NULL,
  `FacilityID` INT DEFAULT NULL,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`StaffID`),
  KEY `fk_staff_assignment_facility` (`FacilityID`),
  CONSTRAINT `fk_staff_assignment_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`),
  CONSTRAINT `fk_staff_assignment_facility` FOREIGN KEY (`FacilityID`) REFERENCES `Facility` (`FacilityID`),
  CONSTRAINT `ck_staff_assignment_area`
    CHECK ((`AreaType` = 'Gate' AND `FacilityID` IS NULL) OR (`AreaType` = 'Facility' AND `FacilityID` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FacilityCashier` (
  `FacilityID` INT NOT NULL,
  `StaffID` INT NOT NULL,
  `AssignedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`FacilityID`, `StaffID`),
  KEY `fk_facility_cashier_staff` (`StaffID`),
  CONSTRAINT `fk_facility_cashier_facility` FOREIGN KEY (`FacilityID`) REFERENCES `Facility` (`FacilityID`) ON DELETE CASCADE,
  CONSTRAINT `fk_facility_cashier_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FacilityIssue` (
  `IssueID` INT NOT NULL AUTO_INCREMENT,
  `FacilityID` INT NOT NULL,
  `Description` VARCHAR(255) NOT NULL,
  `IsResolved` BOOLEAN NOT NULL DEFAULT FALSE,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ResolvedAt` DATETIME DEFAULT NULL,
  PRIMARY KEY (`IssueID`),
  KEY `fk_facility_issue_facility` (`FacilityID`),
  CONSTRAINT `fk_facility_issue_facility` FOREIGN KEY (`FacilityID`) REFERENCES `Facility` (`FacilityID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PaidService` (
  `ServiceID` INT NOT NULL AUTO_INCREMENT,
  `FacilityID` INT NOT NULL,
  `ServiceName` VARCHAR(120) NOT NULL,
  `Description` TEXT,
  `ImageURL` VARCHAR(255) DEFAULT NULL,
  `Active` BOOLEAN NOT NULL DEFAULT TRUE,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ServiceID`),
  UNIQUE KEY `uk_paid_service_facility_name` (`FacilityID`, `ServiceName`),
  KEY `fk_paid_service_facility` (`FacilityID`),
  CONSTRAINT `fk_paid_service_facility` FOREIGN KEY (`FacilityID`) REFERENCES `Facility` (`FacilityID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Product` (
  `ProductID` INT NOT NULL AUTO_INCREMENT,
  `FacilityID` INT DEFAULT NULL,
  `ServiceID` INT DEFAULT NULL,
  `ProductName` VARCHAR(120) NOT NULL,
  `Category` VARCHAR(80) NOT NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `Stock` INT NOT NULL DEFAULT 0,
  `ImageURL` VARCHAR(255) DEFAULT NULL,
  `Active` BOOLEAN NOT NULL DEFAULT TRUE,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProductID`),
  KEY `fk_product_facility` (`FacilityID`),
  KEY `fk_product_paid_service` (`ServiceID`),
  CONSTRAINT `fk_product_facility` FOREIGN KEY (`FacilityID`) REFERENCES `Facility` (`FacilityID`),
  CONSTRAINT `fk_product_paid_service` FOREIGN KEY (`ServiceID`) REFERENCES `PaidService` (`ServiceID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RetailOrder` (
  `OrderID` INT NOT NULL AUTO_INCREMENT,
  `CustomerID` INT DEFAULT NULL,
  `StaffID` INT DEFAULT NULL,
  `TotalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `Source` ENUM('Service','VipMembership') NOT NULL DEFAULT 'Service',
  `Status` ENUM('Paid','Cancelled') NOT NULL DEFAULT 'Paid',
  `OrderDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`OrderID`),
  KEY `idx_retail_order_date` (`OrderDate`),
  KEY `fk_retail_customer` (`CustomerID`),
  KEY `fk_retail_staff` (`StaffID`),
  CONSTRAINT `fk_retail_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_retail_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RetailOrderDetail` (
  `OrderID` INT NOT NULL,
  `ProductID` INT NOT NULL,
  `Quantity` INT NOT NULL DEFAULT 1,
  `UnitPrice` DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (`OrderID`,`ProductID`),
  KEY `fk_retail_detail_product` (`ProductID`),
  CONSTRAINT `fk_retail_detail_order` FOREIGN KEY (`OrderID`) REFERENCES `RetailOrder` (`OrderID`),
  CONSTRAINT `fk_retail_detail_product` FOREIGN KEY (`ProductID`) REFERENCES `Product` (`ProductID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `EventCampaign` (
  `EventID` INT NOT NULL AUTO_INCREMENT,
  `EventName` VARCHAR(120) NOT NULL,
  `EventType` VARCHAR(80) NOT NULL DEFAULT 'Khác',
  `Description` TEXT,
  `ScaleText` VARCHAR(120) DEFAULT NULL,
  `EstimatedCost` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `Sponsor` VARCHAR(160) DEFAULT NULL,
  `PlannedDate` DATE DEFAULT NULL,
  `StartTime` TIME DEFAULT NULL,
  `EndTime` TIME DEFAULT NULL,
  `RegistrationDeadline` DATE DEFAULT NULL,
  `DeliveryMode` ENUM('Online','Offline','Hybrid') NOT NULL DEFAULT 'Offline',
  `StartDate` DATETIME NOT NULL,
  `EndDate` DATETIME NOT NULL,
  `TicketPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `DiscountRate` DECIMAL(5,4) NOT NULL DEFAULT 0.2,
  `OnlineDiscountPercent` DECIMAL(5,2) NOT NULL DEFAULT 20,
  `MarketingHtml` LONGTEXT,
  `Capacity` INT NOT NULL DEFAULT 0,
  `Status` ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Published',
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`EventID`),
  KEY `idx_event_dates` (`StartDate`, `EndDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `EventBooking` (
  `BookingID` INT NOT NULL AUTO_INCREMENT,
  `EventID` INT NOT NULL,
  `CustomerID` INT NOT NULL,
  `ChildName` VARCHAR(120) DEFAULT NULL,
  `ChildAge` INT DEFAULT NULL,
  `Quantity` INT NOT NULL DEFAULT 1,
  `UnitPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `DiscountAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `FinalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `BookingDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `QRCode` VARCHAR(80) NOT NULL,
  `Status` ENUM('PendingPayment','Paid','CheckedIn','Cancelled') NOT NULL DEFAULT 'PendingPayment',
  `PaidAt` DATETIME DEFAULT NULL,
  `CheckedInAt` DATETIME DEFAULT NULL,
  PRIMARY KEY (`BookingID`),
  UNIQUE KEY `uk_booking_qr` (`QRCode`),
  KEY `fk_booking_event` (`EventID`),
  KEY `fk_booking_customer` (`CustomerID`),
  CONSTRAINT `fk_booking_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_booking_event` FOREIGN KEY (`EventID`) REFERENCES `EventCampaign` (`EventID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `EventRegistration` (
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
  `PaidAt` DATETIME DEFAULT NULL,
  `TransactionID` INT DEFAULT NULL,
  `SubmittedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RegistrationID`),
  KEY `fk_event_registration_event` (`EventID`),
  KEY `fk_event_registration_customer` (`CustomerID`),
  CONSTRAINT `fk_event_registration_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_event_registration_event` FOREIGN KEY (`EventID`) REFERENCES `EventCampaign` (`EventID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `EventRegistrationChild` (
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

CREATE TABLE `TicketReservation` (
  `ReservationID` INT NOT NULL AUTO_INCREMENT,
  `TypeID` INT NOT NULL,
  `CustomerID` INT NOT NULL,
  `ChildrenCount` INT NOT NULL DEFAULT 1,
  `AdultsCount` INT NOT NULL DEFAULT 1,
  `VisitDate` DATE NOT NULL,
  `ChildrenJson` JSON DEFAULT NULL,
  `SpecialRequests` TEXT DEFAULT NULL,
  `UnitPrice` DECIMAL(18,2) NOT NULL,
  `DiscountAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `FinalAmount` DECIMAL(18,2) NOT NULL,
  `QRCode` VARCHAR(80) NOT NULL,
  `Status` ENUM('PendingPayment','Paid','Cancelled') NOT NULL DEFAULT 'PendingPayment',
  `PaidAt` DATETIME DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ReservationID`),
  UNIQUE KEY `uk_ticket_reservation_qr` (`QRCode`),
  KEY `fk_reservation_ticket_type` (`TypeID`),
  KEY `fk_reservation_customer` (`CustomerID`),
  KEY `idx_reservation_visit` (`VisitDate`),
  CONSTRAINT `fk_reservation_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_reservation_ticket_type` FOREIGN KEY (`TypeID`) REFERENCES `TicketType` (`TypeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PlaySession` (
  `SessionID` INT NOT NULL AUTO_INCREMENT,
  `CustomerID` INT DEFAULT NULL,
  `TypeID` INT DEFAULT NULL,
  `EventID` INT DEFAULT NULL,
  `StaffID` INT DEFAULT NULL,
  `GuestName` VARCHAR(120) DEFAULT NULL,
  `Purpose` ENUM('Play','Event') NOT NULL DEFAULT 'Play',
  `Source` ENUM('Counter','EventBooking') NOT NULL DEFAULT 'Counter',
  `EventBookingID` INT DEFAULT NULL,
  `EventRegistrationID` INT DEFAULT NULL,
  `PrepaidOnline` BOOLEAN NOT NULL DEFAULT FALSE,
  `ChildrenCount` INT NOT NULL DEFAULT 1,
  `AdultsCount` INT NOT NULL DEFAULT 1,
  `PaymentMethod` ENUM('Tiền mặt','Chuyển khoản') DEFAULT NULL,
  `PaidAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `CheckinTime` DATETIME DEFAULT NULL,
  `CheckoutTime` DATETIME DEFAULT NULL,
  `Status` ENUM('Pending','Playing','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`SessionID`),
  KEY `idx_session_checkin` (`CheckinTime`),
  KEY `fk_session_customer` (`CustomerID`),
  KEY `fk_session_ticket_type` (`TypeID`),
  KEY `fk_session_event` (`EventID`),
  KEY `fk_session_staff` (`StaffID`),
  KEY `fk_session_booking` (`EventBookingID`),
  KEY `fk_session_event_registration` (`EventRegistrationID`),
  CONSTRAINT `fk_session_booking` FOREIGN KEY (`EventBookingID`) REFERENCES `EventBooking` (`BookingID`),
  CONSTRAINT `fk_session_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_session_event` FOREIGN KEY (`EventID`) REFERENCES `EventCampaign` (`EventID`),
  CONSTRAINT `fk_session_event_registration` FOREIGN KEY (`EventRegistrationID`) REFERENCES `EventRegistration` (`RegistrationID`),
  CONSTRAINT `fk_session_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`),
  CONSTRAINT `fk_session_ticket_type` FOREIGN KEY (`TypeID`) REFERENCES `TicketType` (`TypeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SessionService` (
  `ServiceLineID` INT NOT NULL AUTO_INCREMENT,
  `SessionID` INT NOT NULL,
  `ProductID` INT NOT NULL,
  `Quantity` INT NOT NULL DEFAULT 1,
  `UnitPrice` DECIMAL(18,2) NOT NULL,
  `LineTotal` DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (`ServiceLineID`),
  KEY `fk_session_service_session` (`SessionID`),
  KEY `fk_session_service_product` (`ProductID`),
  CONSTRAINT `fk_session_service_product` FOREIGN KEY (`ProductID`) REFERENCES `Product` (`ProductID`),
  CONSTRAINT `fk_session_service_session` FOREIGN KEY (`SessionID`) REFERENCES `PlaySession` (`SessionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TicketInvoice` (
  `InvoiceID` INT NOT NULL AUTO_INCREMENT,
  `SessionID` INT NOT NULL,
  `StaffID` INT DEFAULT NULL,
  `TicketFee` DECIMAL(18,2) NOT NULL,
  `OvertimePenalty` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `ServiceAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `VIPDiscount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `FinalAmount` DECIMAL(18,2) NOT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`InvoiceID`),
  KEY `idx_invoice_created` (`CreatedAt`),
  KEY `fk_invoice_session` (`SessionID`),
  KEY `fk_invoice_staff` (`StaffID`),
  CONSTRAINT `fk_invoice_session` FOREIGN KEY (`SessionID`) REFERENCES `PlaySession` (`SessionID`),
  CONSTRAINT `fk_invoice_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `VIPTransaction` (
  `VIPTransactionID` INT NOT NULL AUTO_INCREMENT,
  `CustomerID` INT NOT NULL,
  `StaffID` INT DEFAULT NULL,
  `Amount` DECIMAL(18,2) NOT NULL DEFAULT 400000,
  `Channel` ENUM('Online','Counter') NOT NULL DEFAULT 'Counter',
  `TransactionType` ENUM('Register','Renew') NOT NULL DEFAULT 'Register',
  `Status` ENUM('Paid','Cancelled') NOT NULL DEFAULT 'Paid',
  `PaidAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`VIPTransactionID`),
  KEY `idx_vip_paid_at` (`PaidAt`),
  KEY `fk_vip_customer` (`CustomerID`),
  KEY `fk_vip_staff` (`StaffID`),
  CONSTRAINT `fk_vip_customer` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`),
  CONSTRAINT `fk_vip_staff` FOREIGN KEY (`StaffID`) REFERENCES `Staff` (`StaffID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Transactions` (
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

CREATE TABLE `VipPaymentRequest` (
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

CREATE TABLE `EmailOutbox` (
  `EmailID` INT NOT NULL AUTO_INCREMENT,
  `RecipientEmail` VARCHAR(120) NOT NULL,
  `Subject` VARCHAR(200) NOT NULL,
  `HtmlBody` TEXT NOT NULL,
  `Status` ENUM('PendingConfiguration','Sent','Failed') NOT NULL,
  `ProviderMessageID` VARCHAR(255) DEFAULT NULL,
  `ErrorMessage` TEXT DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`EmailID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Staff` (`FullName`, `Username`, `PasswordHash`, `Role`) VALUES
  ('Quản lý', 'admin', 'pbkdf2$120000$1126e2f184f3a8162d0bdeba04e2bd8c$1b208f88aad5712edcaa668757beba8d34cb705e107e4285312d946056439974', 'Manager'),
  ('Thu ngân mặc định', 'cashier', 'pbkdf2$120000$98cdc5563eddb43857b4f35acc0f6cf8$8fe9057c73310ecc49e647bdc2951a946c7b01d3df12b70251983df2585c5b04', 'Cashier'),
  ('Nam', 'cashier_nam', 'pbkdf2$120000$7213cd0e743bd764fd97c1a51673589b$42063e16cb03c72d5deb5bd3384d29f4327bc3f0ee6e8f03b649376ef0e45b43', 'Cashier'),
  ('Quân', 'cashier_quan', 'pbkdf2$120000$d5d6e7f2000d50ea8ea04efd5888678d$c667dfff7f69192c3fb063269a2322040a1204559052801757f58fd4f5901cb1', 'Cashier'),
  ('Vinh', 'cashier_vinh', 'pbkdf2$120000$d057ddb521c20f7754a724a7a4152ebe$e657cecb7c21e28ad0cf8b421c805729baa58b147bf09735df5ec560059d2ad6', 'Cashier'),
  ('Hùng Anh', 'cashier_ha', 'pbkdf2$120000$80179ef1216f646b553ec4e8aaf262bc$f10986cac951c66613eb252b93f46e37912e4ee1f8fdbf286d6d59324606aa66', 'Cashier'),
  ('Hiếu', 'cashier_sex', 'pbkdf2$120000$72cd9d1b7ef4ce5fffc961cd47bbd1cd$8db465d185d6ef1cf9480d8a7cea72d1427cbc9d3f95469e7facaa682eebc9a3', 'Cashier');

INSERT INTO `Customer` (`FullName`, `Email`, `Phone`, `PasswordHash`) VALUES
  ('Nguyễn Minh Anh', 'parent@example.com', '0900000001', 'pbkdf2$120000$aceba21435b3c01d65ef02deeed37aa5$ce945220b8ec0dbb45878f0374ea2d7de186b6ea5754838a170b4c3d84e16084'),
  ('Nam', 'nam195', 'nam195-phone', 'pbkdf2$120000$90938304de4b46138dca545deffdad0c$3f7ef587424322591bdede891897ddc244b07565be969ebbd7dd1ec70f3a2da1');

INSERT INTO `TicketType` (`Code`, `TypeName`, `BasePrice`, `TimeLimit`) VALUES
  ('TWO_HOUR', 'Vé 2 giờ', 150000, 120),
  ('DAY_PASS', 'Vé không giới hạn trong ngày', 250000, NULL);

INSERT INTO `Facility` (`FacilityName`, `Description`, `Status`, `AssetStatus`, `Capacity`) VALUES
  ('Nhà bóng', 'Khu bóng nhựa, cầu chui và vận động mềm cho bé dưới 8 tuổi.', 'Normal', 'Ok', 45),
  ('Cầu trượt liên hoàn', 'Khu vận động có đệm bảo hộ và lan can mềm.', 'Normal', 'Ok', 30),
  ('Game điện tử', 'Khu máy gắp quà, đua xe và trò chơi tương tác.', 'Normal', 'Ok', 20),
  ('Góc sáng tạo', 'Khu tô tượng, tranh cát và thủ công theo chủ đề.', 'Normal', 'Ok', 25);

INSERT INTO `StaffAreaAssignment` (`StaffID`, `AreaType`, `FacilityID`) VALUES
  ((SELECT StaffID FROM Staff WHERE Username = 'cashier'), 'Gate', NULL),
  ((SELECT StaffID FROM Staff WHERE Username = 'cashier_nam'), 'Gate', NULL);

INSERT INTO `FacilityCashier` (`FacilityID`, `StaffID`) VALUES
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Góc sáng tạo'), (SELECT StaffID FROM Staff WHERE Username = 'cashier_quan')),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Nhà bóng'), (SELECT StaffID FROM Staff WHERE Username = 'cashier_vinh')),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Cầu trượt liên hoàn'), (SELECT StaffID FROM Staff WHERE Username = 'cashier_ha')),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Game điện tử'), (SELECT StaffID FROM Staff WHERE Username = 'cashier_sex'));

INSERT INTO `Product` (`FacilityID`, `ProductName`, `Category`, `Price`, `Stock`) VALUES
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Góc sáng tạo'), 'Tô tượng size nhỏ', 'Tô tượng', 50000, 80),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Góc sáng tạo'), 'Tô tượng size lớn', 'Tô tượng', 80000, 50),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Góc sáng tạo'), 'Tranh cát sáng tạo', 'Tô tranh', 35000, 100),
  ((SELECT FacilityID FROM Facility WHERE FacilityName = 'Game điện tử'), 'Vé game điện tử', 'Game điện tử', 30000, 120);

INSERT INTO `PaidService` (`FacilityID`, `ServiceName`, `Description`)
SELECT DISTINCT p.`FacilityID`, p.`Category`, NULL
FROM `Product` p
WHERE p.`FacilityID` IS NOT NULL
ON DUPLICATE KEY UPDATE `Description` = `PaidService`.`Description`;

UPDATE `Product` p
JOIN `PaidService` ps
  ON ps.`FacilityID` = p.`FacilityID`
 AND ps.`ServiceName` = p.`Category`
SET p.`ServiceID` = ps.`ServiceID`
WHERE p.`ServiceID` IS NULL;

INSERT INTO `EventCampaign`
  (`EventName`, `EventType`, `Description`, `ScaleText`, `EstimatedCost`, `Sponsor`, `PlannedDate`,
   `StartTime`, `EndTime`, `RegistrationDeadline`, `DeliveryMode`, `StartDate`, `EndDate`,
   `TicketPrice`, `DiscountRate`, `OnlineDiscountPercent`, `MarketingHtml`, `Capacity`, `Status`)
VALUES
  ('Đêm hội Trung Thu', 'Lễ hội', 'Rước đèn, phá cỗ và sân khấu thiếu nhi theo chủ đề Trung Thu.', '120 khách', 25000000, NULL, '2026-09-24', '17:30:00', '21:30:00', '2026-09-20', 'Offline', '2026-09-24 17:30:00', '2026-09-24 21:30:00', 180000, 0.2, 20, '<h2>Đêm hội Trung Thu</h2><p>Rước đèn, phá cỗ và sân khấu thiếu nhi theo chủ đề Trung Thu tại TinkerBell Garden.</p>', 120, 'Published'),
  ('Halloween Candy Hunt', 'Lễ hội', 'Trò chơi tìm kẹo, hóa trang nhẹ nhàng và góc chụp ảnh gia đình.', '100 khách', 20000000, NULL, '2026-10-31', '16:00:00', '21:00:00', '2026-10-27', 'Offline', '2026-10-31 16:00:00', '2026-10-31 21:00:00', 200000, 0.2, 20, '<h2>Halloween Candy Hunt</h2><p>Trò chơi tìm kẹo, hóa trang nhẹ nhàng và góc chụp ảnh gia đình.</p>', 100, 'Published'),
  ('Giáng Sinh TinkerBell', 'Workshop', 'Workshop làm thiệp, sân khấu âm nhạc và quà tặng Noel.', '120 khách', 28000000, NULL, '2026-12-24', '16:00:00', '21:30:00', '2026-12-20', 'Offline', '2026-12-24 16:00:00', '2026-12-24 21:30:00', 220000, 0.2, 20, '<h2>Giáng Sinh TinkerBell</h2><p>Workshop làm thiệp, sân khấu âm nhạc và quà tặng Noel.</p>', 120, 'Published');
