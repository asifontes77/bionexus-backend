-- BIO NEXUS - BORRADOR DE LINEA BASE UNICA
-- Identificador: 20260918-175510
-- Estado: BORRADOR PARA VALIDACION EN BASE VACIA
-- Fuente: estado real normalizado capturado en copia temporal
-- Respaldo integral protegido: C:\Users\Alexis\Desktop\BioNexus-Aux\reports\3-baseline-safety-20260918-173938.sql
-- SHA256 respaldo: C29CDD60BC076345486E8E4CC16E63963F2F0C57F2B07451E5D391BEAF9624A9
-- IMPORTANTE: este archivo NO fue ejecutado sobre bionexus.
-- IMPORTANTE: no contiene usuarios, pacientes, auditoria, laboratorio ni transacciones.
-- IMPORTANTE: contiene solo 58 permisos vigentes; los 21 permisos retirados no se crean.
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: baseline
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `antibiotic`
--

DROP TABLE IF EXISTS `antibiotic`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `antibiotic` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `siglas` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_settings`
--

DROP TABLE IF EXISTS `application_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `laboratory_id` int NOT NULL,
  `session_timeout_minutes` int NOT NULL DEFAULT '30',
  `inactivity_timeout_minutes` int NOT NULL DEFAULT '20',
  `countdown_seconds` int NOT NULL DEFAULT '120',
  `voucher_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `receipt_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `head_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `body_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `page_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `maximum_rows_report` int NOT NULL DEFAULT '38',
  `workshee_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `printer_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `printer_interface` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `locale` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'es-VE',
  `time_zone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'America/Caracas',
  `date_format` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'dd/MM/yyyy',
  `hour_cycle` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'h12',
  `first_day_of_week` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'monday',
  `decimal_separator` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT ',',
  `financial_primary_currency_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_application_settings_laboratory` (`laboratory_id`),
  KEY `IX_application_settings_financial_primary_currency` (`financial_primary_currency_id`),
  CONSTRAINT `FK_application_settings_financial_primary_currency` FOREIGN KEY (`financial_primary_currency_id`) REFERENCES `currencies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_application_settings_laboratory` FOREIGN KEY (`laboratory_id`) REFERENCES `laboratory` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `banks`
--

DROP TABLE IF EXISTS `banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `short_name` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_banks_code` (`code`),
  UNIQUE KEY `UQ_banks_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cash_register`
--

DROP TABLE IF EXISTS `cash_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_register` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT '0',
  `deposits` json DEFAULT NULL,
  `totals` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admission_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_cash_register_user_id` (`user_id`),
  CONSTRAINT `FK_cash_register_user_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(100) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `person_charge` varchar(60) DEFAULT NULL,
  `discount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `rif` varchar(20) DEFAULT NULL,
  `Print_invoice` tinyint NOT NULL DEFAULT '0',
  `hide_client` tinyint NOT NULL DEFAULT '0',
  `tariff` smallint NOT NULL DEFAULT '1',
  `tariff_id` int NOT NULL,
  `credit` tinyint NOT NULL DEFAULT '1',
  `charge_dollars` tinyint NOT NULL DEFAULT '0',
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_client_tariff_id` (`tariff_id`),
  CONSTRAINT `FK_client_tariff_id` FOREIGN KEY (`tariff_id`) REFERENCES `tariffs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `currencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `symbol` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `symbol_position` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'before',
  `decimal_places` tinyint unsigned NOT NULL DEFAULT '2',
  `is_local` tinyint NOT NULL DEFAULT '0',
  `is_base` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_currencies_code` (`code`),
  CONSTRAINT `CK_currencies_decimal_places` CHECK ((`decimal_places` <= 4)),
  CONSTRAINT `CK_currencies_symbol_position` CHECK ((`symbol_position` in (_utf8mb4'before',_utf8mb4'after')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_accounts_receivable`
--

DROP TABLE IF EXISTS `customer_accounts_receivable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_accounts_receivable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL DEFAULT '0',
  `invoice` varchar(250) DEFAULT NULL,
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_dollars` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_canceled` decimal(18,2) NOT NULL DEFAULT '0.00',
  `user_id_canceled` int NOT NULL DEFAULT '0',
  `date_canceled` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dollar_value`
--

DROP TABLE IF EXISTS `dollar_value`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dollar_value` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `value` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dollar_value_automation`
--

DROP TABLE IF EXISTS `dollar_value_automation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dollar_value_automation` (
  `id` int NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '0',
  `run_time` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '18:00',
  `time_zone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'America/Caracas',
  `bcv_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'https://www.bcv.org.ve/',
  `fallback_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'https://ve.dolarapi.com/v1/dolares/oficial',
  `last_started_at` datetime DEFAULT NULL,
  `last_finished_at` datetime DEFAULT NULL,
  `last_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_source` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_error` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dollar_value_automation_runs`
--

DROP TABLE IF EXISTS `dollar_value_automation_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dollar_value_automation_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `started_at` datetime NOT NULL,
  `finished_at` datetime DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `source` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `value` decimal(18,2) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `error` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_dollar_automation_runs_started` (`started_at`),
  KEY `IX_dollar_automation_runs_status` (`status`),
  KEY `FK_dollar_automation_run_user` (`requested_by_user_id`),
  CONSTRAINT `FK_dollar_automation_run_user` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_catalog`
--

DROP TABLE IF EXISTS `exam_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL DEFAULT '0',
  `position` int NOT NULL DEFAULT '0',
  `description` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `size` smallint NOT NULL DEFAULT '1',
  `annulled` tinyint NOT NULL DEFAULT '0',
  `abbreviation` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `special_test` tinyint NOT NULL DEFAULT '0',
  `work_sheet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `tax_id` int NOT NULL DEFAULT '0',
  `format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `cost1` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cost2` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cost3` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cost4` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cost5` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cost6` decimal(18,2) NOT NULL DEFAULT '0.00',
  `format_grid` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_e553c51e5f324b1e706abcb8053` (`group_id`),
  KEY `IDX_exam_lists_tax_id` (`tax_id`),
  CONSTRAINT `FK_e553c51e5f324b1e706abcb8053` FOREIGN KEY (`group_id`) REFERENCES `exam_group` (`id`),
  CONSTRAINT `FK_exam_lists_tax_id_tax` FOREIGN KEY (`tax_id`) REFERENCES `tax` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_group`
--

DROP TABLE IF EXISTS `exam_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `annulled` tinyint NOT NULL DEFAULT '1',
  `position` int NOT NULL,
  `its_exam` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_routine_items`
--

DROP TABLE IF EXISTS `exam_routine_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_routine_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `routine_id` int NOT NULL,
  `exam_catalog_id` int NOT NULL,
  `position` int NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `legacy_active_present` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_exam_routine_items_routine_catalog` (`routine_id`,`exam_catalog_id`),
  UNIQUE KEY `UQ_exam_routine_items_routine_position` (`routine_id`,`position`),
  KEY `IDX_exam_routine_items_exam_catalog_id` (`exam_catalog_id`),
  CONSTRAINT `FK_exam_routine_items_exam_catalog` FOREIGN KEY (`exam_catalog_id`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_exam_routine_items_routine` FOREIGN KEY (`routine_id`) REFERENCES `exam_routines` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_routines`
--

DROP TABLE IF EXISTS `exam_routines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_routines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `registered_exams` json DEFAULT NULL,
  `details` varchar(200) NOT NULL,
  `description` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_tariff_prices`
--

DROP TABLE IF EXISTS `exam_tariff_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_tariff_prices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_catalog_id` int NOT NULL,
  `tariff_id` int NOT NULL,
  `price` decimal(18,2) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_exam_tariff_prices_exam_tariff` (`exam_catalog_id`,`tariff_id`),
  KEY `IX_exam_tariff_prices_tariff` (`tariff_id`),
  KEY `IX_exam_tariff_prices_active` (`is_active`),
  CONSTRAINT `FK_exam_tariff_prices_exam` FOREIGN KEY (`exam_catalog_id`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_exam_tariff_prices_tariff` FOREIGN KEY (`tariff_id`) REFERENCES `tariffs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `CK_exam_tariff_prices_price` CHECK ((`price` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `group_ht`
--

DROP TABLE IF EXISTS `group_ht`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_ht` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `details` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `group_ht_items`
--

DROP TABLE IF EXISTS `group_ht_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_ht_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `groupHtId` int NOT NULL DEFAULT '0',
  `examId` int NOT NULL DEFAULT '0',
  `description` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_e76c7c681058bb14b2c5da3fcd8` (`groupHtId`),
  KEY `IDX_group_ht_items_examId` (`examId`),
  CONSTRAINT `FK_e76c7c681058bb14b2c5da3fcd8` FOREIGN KEY (`groupHtId`) REFERENCES `group_ht` (`id`),
  CONSTRAINT `FK_group_ht_items_examId_exam_lists` FOREIGN KEY (`examId`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `id` int NOT NULL AUTO_INCREMENT,
  `no_invoice` int NOT NULL DEFAULT '0',
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_patients` int NOT NULL DEFAULT '0',
  `business_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rif` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `id_users` int NOT NULL DEFAULT '0',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `iva` decimal(18,2) NOT NULL DEFAULT '0.00',
  `iva_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_base` decimal(18,2) NOT NULL DEFAULT '0.00',
  `deleted` tinyint NOT NULL DEFAULT '0',
  `paying` tinyint NOT NULL DEFAULT '1',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `document_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Factura',
  `foot_payments` json DEFAULT NULL,
  `id_client` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_invoice` int NOT NULL DEFAULT '0',
  `quantity` int NOT NULL DEFAULT '0',
  `description` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `id_exams` int NOT NULL DEFAULT '0',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `FK_fbeff5dc2e2ca6355daaab275cb` (`id_invoice`),
  KEY `IDX_invoice_items_id_exams` (`id_exams`),
  CONSTRAINT `FK_fbeff5dc2e2ca6355daaab275cb` FOREIGN KEY (`id_invoice`) REFERENCES `invoice` (`id`),
  CONSTRAINT `FK_invoice_items_id_exams_exam_lists` FOREIGN KEY (`id_exams`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `laboratory`
--

DROP TABLE IF EXISTS `laboratory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `laboratory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rif` char(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `logo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `print_invoice` tinyint DEFAULT '0',
  `print_sample_take` tinyint DEFAULT '0',
  `url` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `invoice_number` int NOT NULL DEFAULT '0',
  `voucher_number` int NOT NULL DEFAULT '0',
  `mask_phone` char(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `voucher_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rows_description_invoices` int NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `business_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `max_height_logo` int NOT NULL DEFAULT '170',
  `max_width_logo` int NOT NULL DEFAULT '170',
  `head_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `body_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `page_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `maximum_rows_report` int NOT NULL DEFAULT '38',
  `settingQR` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `sendEmail` json DEFAULT NULL,
  `workshee_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone_1` char(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone_2` char(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `creditnote_number` int NOT NULL DEFAULT '0',
  `printer_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `printer_interface` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `license` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `receipt_format` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rows_description_receipt` int NOT NULL DEFAULT '10',
  `receipt_number` int NOT NULL DEFAULT '0',
  `print_receipt` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `license`
--

DROP TABLE IF EXISTS `license`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `license` (
  `id` int NOT NULL AUTO_INCREMENT,
  `licenseKey` varchar(255) NOT NULL,
  `isActive` tinyint NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `list_germs`
--

DROP TABLE IF EXISTS `list_germs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `list_germs` (
  `germen` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--


--
-- Table structure for table `parasiticforms`
--

DROP TABLE IF EXISTS `parasiticforms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parasiticforms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_parasiticforms_description` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_admissions`
--

DROP TABLE IF EXISTS `patient_admissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_admissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_profile_id` int NOT NULL,
  `patient_position` int NOT NULL DEFAULT '0',
  `admission_date` date NOT NULL,
  `admission_time` time NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `document_number` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `verification_code` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `age` smallint NOT NULL,
  `month_year` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'a??os',
  `sex` tinyint DEFAULT '0',
  `birth_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `suggested` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `urgent` tinyint DEFAULT '0',
  `client_id` int NOT NULL DEFAULT '0',
  `tariff_id` int DEFAULT NULL,
  `process` tinyint NOT NULL DEFAULT '0',
  `observation` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `approved` tinyint NOT NULL DEFAULT '0',
  `canceled` tinyint DEFAULT '0',
  `cancellation_date` datetime DEFAULT NULL,
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_dollars` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_canceled` decimal(18,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `iva` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_base` decimal(18,2) NOT NULL DEFAULT '0.00',
  `iva_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `dollar_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `dollar_price_date` datetime DEFAULT NULL,
  `business_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rif` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invoice` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `deliver_date` datetime DEFAULT NULL,
  `delivery_id` int DEFAULT NULL,
  `receive` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sample_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sample` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email_sent` tinyint NOT NULL DEFAULT '0',
  `email_status` tinyint NOT NULL DEFAULT '0',
  `user_id` int NOT NULL DEFAULT '0',
  `user_id_canceled` int NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `result_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `creditnote` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '',
  `foot_payments` json DEFAULT NULL,
  `way_pay_dollars` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `IDX_patients_delivery_id` (`delivery_id`),
  KEY `IDX_patients_client_id` (`client_id`),
  KEY `IDX_patients_user_id` (`user_id`),
  KEY `IDX_patient_admissions_profile_id` (`patient_profile_id`),
  KEY `IX_patient_admissions_tariff_id` (`tariff_id`),
  CONSTRAINT `FK_patient_admissions_profile_id` FOREIGN KEY (`patient_profile_id`) REFERENCES `patient_profiles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patient_admissions_tariff_id` FOREIGN KEY (`tariff_id`) REFERENCES `tariffs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patients_client_id_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patients_delivery_id_users` FOREIGN KEY (`delivery_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patients_user_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_exams`
--

DROP TABLE IF EXISTS `patient_exams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patientsId` int NOT NULL DEFAULT '0',
  `exam_catalog_id` int NOT NULL DEFAULT '0',
  `description` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `group_id` int NOT NULL DEFAULT '0',
  `position` int NOT NULL,
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status` int NOT NULL DEFAULT '0',
  `result` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `size` int NOT NULL DEFAULT '0',
  `processed_id` int DEFAULT NULL,
  `approved_id` int DEFAULT NULL,
  `tax_description` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Exo',
  `tax_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `email_status` smallint NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_0c9a7ff18287a0aabb2bec81282` (`patientsId`),
  KEY `FK_cc0d6d8a6fa812009c7bfbf70b8` (`group_id`),
  KEY `IDX_exams_examlistsId` (`exam_catalog_id`),
  KEY `IDX_exams_processed_id` (`processed_id`),
  KEY `IDX_exams_approved_id` (`approved_id`),
  CONSTRAINT `FK_0c9a7ff18287a0aabb2bec81282` FOREIGN KEY (`patientsId`) REFERENCES `patient_admissions` (`id`),
  CONSTRAINT `FK_cc0d6d8a6fa812009c7bfbf70b8` FOREIGN KEY (`group_id`) REFERENCES `exam_group` (`id`),
  CONSTRAINT `FK_exams_approved_id_users` FOREIGN KEY (`approved_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_exams_examlistsId_exam_lists` FOREIGN KEY (`exam_catalog_id`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_exams_processed_id_users` FOREIGN KEY (`processed_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_profiles`
--

DROP TABLE IF EXISTS `patient_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `verification_code` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `document_number` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `normalized_document` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `birth_date` date DEFAULT NULL,
  `sex` tinyint DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_admission_id` int NOT NULL,
  `identity_review_required` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UX_patient_profiles_source_admission` (`source_admission_id`),
  UNIQUE KEY `UX_patient_profiles_document` (`verification_code`,`normalized_document`),
  CONSTRAINT `CK_patient_profiles_document_pair` CHECK ((((`normalized_document` is null) and (`document_number` is null)) or ((`normalized_document` is not null) and (`document_number` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patient_results_email_history`
--

DROP TABLE IF EXISTS `patient_results_email_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_results_email_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `requested_by_user_id` int NOT NULL,
  `completed_by_user_id` int DEFAULT NULL,
  `recipient_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `delivery_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `requested_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` datetime(6) DEFAULT NULL,
  `error_code` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pdf_size_bytes` int unsigned DEFAULT NULL,
  `result_html_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_patient_results_email_history_patient_requested` (`patient_id`,`requested_at`),
  KEY `IX_patient_results_email_history_requester_requested` (`requested_by_user_id`,`requested_at`),
  KEY `IX_patient_results_email_history_status_requested` (`status`,`requested_at`),
  KEY `FK_patient_results_email_history_completed_user` (`completed_by_user_id`),
  CONSTRAINT `FK_patient_results_email_history_completed_user` FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patient_results_email_history_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_admissions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_patient_results_email_history_requested_user` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `CK_patient_results_email_history_delivery_type` CHECK ((`delivery_type` in (_utf8mb4'send',_utf8mb4'resend'))),
  CONSTRAINT `CK_patient_results_email_history_status` CHECK ((`status` in (_utf8mb4'started',_utf8mb4'success',_utf8mb4'failed')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_item_field_values`
--

DROP TABLE IF EXISTS `payment_item_field_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_item_field_values` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `payment_item_id` int NOT NULL,
  `field_id` int DEFAULT NULL,
  `field_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `field_label` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `field_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `value_text` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_payment_item_field_value` (`payment_item_id`,`field_code`),
  KEY `IX_payment_item_field_values_field` (`field_id`),
  KEY `IX_payment_item_field_values_bank` (`bank_id`),
  CONSTRAINT `FK_payment_item_field_values_bank` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_payment_item_field_values_field` FOREIGN KEY (`field_id`) REFERENCES `payment_method_fields` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `FK_payment_item_field_values_item` FOREIGN KEY (`payment_item_id`) REFERENCES `way_pay_items` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_method_currencies`
--

DROP TABLE IF EXISTS `payment_method_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_method_currencies` (
  `payment_method_id` int NOT NULL,
  `currency_id` int NOT NULL,
  `is_default` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`payment_method_id`,`currency_id`),
  KEY `IX_payment_method_currencies_currency` (`currency_id`),
  CONSTRAINT `FK_payment_method_currencies_currency` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_payment_method_currencies_method` FOREIGN KEY (`payment_method_id`) REFERENCES `type_payment` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_method_fields`
--

DROP TABLE IF EXISTS `payment_method_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_method_fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_method_id` int NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `field_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_required` tinyint NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `min_length` int DEFAULT NULL,
  `max_length` int DEFAULT NULL,
  `input_mask` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `validation_pattern` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `help_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `catalog_source` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_payment_method_fields_code` (`payment_method_id`,`code`),
  KEY `IX_payment_method_fields_order` (`payment_method_id`,`display_order`),
  CONSTRAINT `FK_payment_method_fields_method` FOREIGN KEY (`payment_method_id`) REFERENCES `type_payment` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `CK_payment_method_fields_lengths` CHECK ((((`min_length` is null) or (`min_length` >= 0)) and ((`max_length` is null) or (`max_length` >= `min_length`)))),
  CONSTRAINT `CK_payment_method_fields_type` CHECK ((`field_type` in (_utf8mb4'text',_utf8mb4'number',_utf8mb4'date',_utf8mb4'phone',_utf8mb4'reference',_utf8mb4'select',_utf8mb4'bank',_utf8mb4'boolean')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sample_type`
--

DROP TABLE IF EXISTS `sample_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sample_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_audit_logs`
--

DROP TABLE IF EXISTS `security_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `occurred_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `actor_user_id` int DEFAULT NULL,
  `action` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `entity_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `outcome` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'success',
  `summary` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `metadata_json` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_security_audit_logs_occurred_at` (`occurred_at`),
  KEY `IX_security_audit_logs_actor_occurred` (`actor_user_id`,`occurred_at`),
  KEY `IX_security_audit_logs_entity_occurred` (`entity_type`,`entity_id`,`occurred_at`),
  KEY `IX_security_audit_logs_action_occurred` (`action`,`occurred_at`),
  CONSTRAINT `FK_security_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_permissions`
--

DROP TABLE IF EXISTS `security_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `module` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_security_permissions_code` (`code`),
  KEY `IX_security_permissions_module` (`module`),
  KEY `IX_security_permissions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_role_permissions`
--

DROP TABLE IF EXISTS `security_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `IX_security_role_permissions_permission` (`permission_id`),
  CONSTRAINT `FK_security_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `security_permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_security_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `security_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_roles`
--

DROP TABLE IF EXISTS `security_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_system` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_security_roles_code` (`code`),
  KEY `IX_security_roles_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_user_permission_overrides`
--

DROP TABLE IF EXISTS `security_user_permission_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_user_permission_overrides` (
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `effect` enum('allow','deny') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`permission_id`),
  KEY `IX_security_user_permission_overrides_permission` (`permission_id`),
  KEY `IX_security_user_permission_overrides_effect` (`effect`),
  CONSTRAINT `FK_security_user_permission_overrides_permission` FOREIGN KEY (`permission_id`) REFERENCES `security_permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_security_user_permission_overrides_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_user_roles`
--

DROP TABLE IF EXISTS `security_user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `IX_security_user_roles_role` (`role_id`),
  CONSTRAINT `FK_security_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `security_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_security_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `special_test_items`
--

DROP TABLE IF EXISTS `special_test_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_test_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `specialTestLabId` int NOT NULL DEFAULT '0',
  `exam_list_Id` int NOT NULL DEFAULT '0',
  `description` char(60) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_a8fbc122373babe78428d68a6df` (`specialTestLabId`),
  KEY `IDX_special_test_items_exam_list_Id` (`exam_list_Id`),
  CONSTRAINT `FK_a8fbc122373babe78428d68a6df` FOREIGN KEY (`specialTestLabId`) REFERENCES `special_test_lab` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_special_test_items_exam_list_Id_exam_lists` FOREIGN KEY (`exam_list_Id`) REFERENCES `exam_catalog` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `special_test_lab`
--

DROP TABLE IF EXISTS `special_test_lab`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_test_lab` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(60) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone_1` varchar(30) NOT NULL,
  `phone_2` varchar(30) NOT NULL,
  `email` varchar(100) NOT NULL,
  `annulled` tinyint DEFAULT '0',
  `details` varchar(200) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tariffs`
--

DROP TABLE IF EXISTS `tariffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tariffs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `currency_id` int NOT NULL,
  `position` int NOT NULL,
  `is_default` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tariffs_code` (`code`),
  UNIQUE KEY `UQ_tariffs_position` (`position`),
  KEY `IX_tariffs_active_position` (`is_active`,`position`),
  KEY `IX_tariffs_currency` (`currency_id`),
  CONSTRAINT `FK_tariffs_currency` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `CK_tariffs_default_active` CHECK (((`is_default` = 0) or (`is_active` = 1))),
  CONSTRAINT `CK_tariffs_position` CHECK ((`position` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax`
--

DROP TABLE IF EXISTS `tax`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `value` decimal(18,2) NOT NULL DEFAULT '0.00',
  `only_dollars` tinyint DEFAULT '0',
  `always_subtotal` tinyint DEFAULT '0',
  `hide` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `type_payment`
--

DROP TABLE IF EXISTS `type_payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `type_payment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `annulled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_type_payment_code` (`code`),
  UNIQUE KEY `UQ_type_payment_description` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `user_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `college_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `telephone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `key_signing` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url_photo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url_signature` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `direction` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `position` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `key_recover` int DEFAULT '0',
  `request_password` tinyint DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `passwordSignature` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `roles` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user',
  `hide_user` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_074a1f262efaca6aba16f7ed92` (`user_name`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=CURRENT_USER*/ /*!50003 TRIGGER `users_trigger` BEFORE UPDATE ON `users` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `way_pay`
--

DROP TABLE IF EXISTS `way_pay`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `way_pay` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_users` int NOT NULL,
  `id_patients` int NOT NULL,
  `id_client` int NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_patients` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `annulment` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `way_pay_items`
--

DROP TABLE IF EXISTS `way_pay_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `way_pay_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_way_pay` int NOT NULL,
  `id_type_payment` int NOT NULL DEFAULT '0',
  `currency_id` int NOT NULL,
  `entered_amount` decimal(18,2) NOT NULL,
  `base_amount` decimal(18,2) NOT NULL,
  `exchange_rate` decimal(18,6) DEFAULT NULL,
  `exchange_rate_date` datetime DEFAULT NULL,
  `exchange_rate_decimal_places` tinyint unsigned DEFAULT NULL,
  `local_equivalent_amount` decimal(18,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_3b93a82990069b9e281608fa2b0` (`id_way_pay`),
  KEY `IX_way_pay_items_type_payment` (`id_type_payment`),
  KEY `IX_way_pay_items_currency` (`currency_id`),
  CONSTRAINT `FK_3b93a82990069b9e281608fa2b0` FOREIGN KEY (`id_way_pay`) REFERENCES `way_pay` (`id`),
  CONSTRAINT `FK_way_pay_items_currency` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_way_pay_items_type_payment` FOREIGN KEY (`id_type_payment`) REFERENCES `type_payment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'bionexus_baseline_source_20260918_175156'
--

--
-- Dumping routines for database 'bionexus_baseline_source_20260918_175156'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed: normalized baseline source

-- ===== SEMILLAS ESTRUCTURALES VIGENTES =====
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: bionexus_baseline_source_20260918_175156
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `security_permissions`
--

/*!40000 ALTER TABLE `security_permissions` DISABLE KEYS */;
INSERT INTO `security_permissions` (`id`, `code`, `name`, `description`, `module`, `is_active`, `created_at`, `updated_at`) VALUES (1,'security.roles.read','Consultar roles','Permite consultar roles y sus permisos','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(2,'security.roles.create','Crear roles','Permite crear roles configurables','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(3,'security.roles.update','Actualizar roles','Permite actualizar roles existentes','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(4,'security.roles.assign-permissions','Asignar permisos a roles','Permite modificar los permisos de un rol','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(5,'security.permissions.read','Consultar permisos','Permite consultar el catalogo de permisos','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(6,'security.users.read','Consultar usuarios','Permite consultar usuarios y sus asignaciones','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(7,'security.users.create','Crear usuarios','Permite crear usuarios','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(8,'security.users.update','Actualizar usuarios','Permite actualizar usuarios','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(9,'security.users.assign-roles','Asignar roles a usuarios','Permite modificar los roles de un usuario','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(10,'security.users.assign-permissions','Asignar excepciones a usuarios','Permite conceder o negar permisos directos','security',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(11,'parasiticforms.read','Consultar formas parasitarias','Permite consultar formas parasitarias','parasiticforms',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(12,'parasiticforms.create','Crear formas parasitarias','Permite crear formas parasitarias','parasiticforms',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(13,'parasiticforms.update','Actualizar formas parasitarias','Permite editar formas parasitarias','parasiticforms',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(15,'patients.cancel','Anular pacientes','Permite autorizar la anulacion de pacientes','patients',1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(16,'typepayment.read','Consultar tipos de pago','Permite consultar tipos de pago','typepayment',1,'2026-08-13 13:56:13','2026-08-13 13:56:13'),(17,'typepayment.create','Crear tipos de pago','Permite crear tipos de pago','typepayment',1,'2026-08-13 13:56:13','2026-08-13 13:56:13'),(18,'typepayment.update','Actualizar tipos de pago','Permite editar tipos de pago','typepayment',1,'2026-08-13 13:56:13','2026-08-13 13:56:13'),(20,'exam-catalog.read','Consultar catalogo de examenes','Permite consultar grupos y examenes','exam-catalog',1,'2026-08-18 20:45:24','2026-08-18 20:45:24'),(21,'exam-catalog.create','Crear grupos y examenes','Permite crear grupos y examenes','exam-catalog',1,'2026-08-18 20:45:24','2026-08-18 20:45:24'),(22,'exam-catalog.update','Actualizar grupos y examenes','Permite editar grupos, examenes y tarifas','exam-catalog',1,'2026-08-18 20:45:24','2026-08-18 20:45:24'),(24,'laboratory.read','Consultar configuracion de laboratorio','Permite consultar la configuracion del laboratorio','laboratory',1,'2026-08-27 18:10:12','2026-08-27 18:10:12'),(25,'laboratory.update','Actualizar configuracion de laboratorio','Permite actualizar la configuracion del laboratorio','laboratory',1,'2026-08-27 18:10:12','2026-08-27 18:10:12'),(26,'laboratory.upload-logo','Actualizar logo del laboratorio','Permite cargar o reemplazar el logo del laboratorio','laboratory',1,'2026-08-27 18:10:12','2026-08-27 18:10:12'),(27,'tax.read','Consultar impuestos','Permite consultar la configuracion de impuestos','tax',1,'2026-08-27 20:00:35','2026-08-27 20:00:35'),(28,'tax.create','Crear impuestos','Permite crear impuestos','tax',1,'2026-08-27 20:00:35','2026-08-27 20:00:35'),(29,'tax.update','Actualizar impuestos','Permite actualizar impuestos','tax',1,'2026-08-27 20:00:35','2026-08-27 20:00:35'),(31,'application-settings.read','Consultar configuracion de la aplicacion','Permite consultar la configuracion global de la aplicacion','application-settings',1,'2026-08-28 00:16:05','2026-08-28 00:16:05'),(32,'application-settings.update','Actualizar configuracion de la aplicacion','Permite actualizar la configuracion global de la aplicacion','application-settings',1,'2026-08-28 00:16:05','2026-08-28 00:16:05'),(33,'patient-results-email.read','Consultar entrega de resultados por correo','Permite consultar pacientes habilitados para entrega de resultados por correo','patient-results-email',1,'2026-08-31 08:19:22','2026-08-31 08:19:22'),(34,'patient-results-email.send','Enviar resultados por correo','Permite enviar resultados aprobados por correo y registrar su trazabilidad','patient-results-email',1,'2026-08-31 08:19:22','2026-08-31 08:19:22'),(35,'routines.read','Consultar rutinas de examenes','Permite consultar rutinas y sus examenes','routines',1,'2026-09-02 18:07:29','2026-09-02 18:07:29'),(36,'routines.create','Crear rutinas de examenes','Permite crear rutinas y asignar examenes','routines',1,'2026-09-02 18:07:29','2026-09-02 18:07:29'),(37,'routines.update','Actualizar rutinas de examenes','Permite editar rutinas y sustituir sus examenes','routines',1,'2026-09-02 18:07:29','2026-09-02 18:07:29'),(38,'routines.delete','Eliminar rutinas de examenes','Permite eliminar rutinas y sus relaciones','routines',1,'2026-09-02 18:07:29','2026-09-02 18:07:29'),(39,'antibiotic.read','Consultar antibioticos','Permite consultar el catalogo de antibioticos','antibiotic',1,'2026-09-02 22:27:15','2026-09-02 22:27:15'),(40,'antibiotic.create','Crear antibioticos','Permite crear antibioticos','antibiotic',1,'2026-09-02 22:27:15','2026-09-02 22:27:15'),(41,'antibiotic.update','Actualizar antibioticos','Permite editar descripcion y siglas de antibioticos','antibiotic',1,'2026-09-02 22:27:15','2026-09-02 22:27:15'),(43,'germs.read','Consultar germenes','Permite consultar el catalogo de germenes','germs',1,'2026-09-03 09:45:43','2026-09-03 09:45:43'),(44,'germs.create','Crear germenes','Permite crear germenes','germs',1,'2026-09-03 09:45:43','2026-09-03 09:45:43'),(45,'germs.update','Actualizar germenes','Permite editar germenes','germs',1,'2026-09-03 09:45:43','2026-09-03 09:45:43'),(51,'sample-types.read','Consultar tipos de muestra','Permite consultar el catalogo de tipos de muestra','sample-types',1,'2026-09-03 14:14:18','2026-09-03 14:14:18'),(52,'sample-types.create','Crear tipos de muestra','Permite crear tipos de muestra','sample-types',1,'2026-09-03 14:14:18','2026-09-03 14:14:18'),(53,'sample-types.update','Actualizar tipos de muestra','Permite editar tipos de muestra','sample-types',1,'2026-09-03 14:14:18','2026-09-03 14:14:18'),(54,'worksheet-groups.read','Consultar grupos de hojas de trabajo','Permite consultar grupos de hojas de trabajo','worksheet-groups',1,'2026-09-03 20:44:47','2026-09-03 20:44:47'),(55,'worksheet-groups.create','Crear grupos de hojas de trabajo','Permite crear grupos de hojas de trabajo','worksheet-groups',1,'2026-09-03 20:44:47','2026-09-03 20:44:47'),(56,'worksheet-groups.update','Actualizar grupos de hojas de trabajo','Permite editar grupos de hojas de trabajo','worksheet-groups',1,'2026-09-03 20:44:47','2026-09-03 20:44:47'),(63,'special-tests.read','Consultar pruebas especiales','Permite consultar laboratorios de pruebas especiales','special-tests',1,'2026-09-05 17:22:19','2026-09-05 17:22:19'),(64,'special-tests.create','Crear pruebas especiales','Permite crear laboratorios de pruebas especiales','special-tests',1,'2026-09-05 17:22:19','2026-09-05 17:22:19'),(65,'special-tests.update','Actualizar pruebas especiales','Permite editar laboratorios de pruebas especiales','special-tests',1,'2026-09-05 17:22:19','2026-09-05 17:22:19'),(71,'dollar-value.read','Consultar valor del dolar','Permite consultar el valor vigente y su historial','dollar-value',1,'2026-09-06 10:20:39','2026-09-06 10:20:39'),(72,'dollar-value.update','Publicar valor del dolar','Permite publicar una nueva cotizacion','dollar-value',1,'2026-09-06 10:20:39','2026-09-06 10:20:39'),(73,'tariffs.read','Consultar tarifas','Permite consultar tarifas y sus estadisticas','tariffs',1,'2026-09-10 12:39:29','2026-09-10 12:39:29'),(74,'tariffs.create','Crear tarifas','Permite crear tarifas configurables','tariffs',1,'2026-09-10 12:39:29','2026-09-10 12:39:29'),(75,'tariffs.update','Actualizar tarifas','Permite editar codigo, nombre, descripcion y posicion de tarifas','tariffs',1,'2026-09-10 12:39:29','2026-09-10 12:39:29'),(78,'patient-admission.close','Cerrar ingresos de pacientes','Permite registrar atomicamente paciente, examenes y formas de pago','patient-admission',1,'2026-09-11 00:39:34','2026-09-11 00:39:34'),(79,'currencies.read','Consultar monedas','Permite consultar el catalogo de monedas','currencies',1,'2026-09-13 22:19:44','2026-09-13 22:19:44'),(80,'currencies.create','Crear monedas','Permite crear monedas adicionales','currencies',1,'2026-09-13 22:19:44','2026-09-13 22:19:44'),(81,'currencies.update','Actualizar monedas','Permite editar la presentacion de monedas','currencies',1,'2026-09-13 22:19:44','2026-09-13 22:19:44');
/*!40000 ALTER TABLE `security_permissions` ENABLE KEYS */;

--
-- Dumping data for table `security_roles`
--

/*!40000 ALTER TABLE `security_roles` DISABLE KEYS */;
INSERT INTO `security_roles` (`id`, `code`, `name`, `description`, `is_system`, `is_active`, `created_at`, `updated_at`) VALUES (1,'admin','Administrador','Administracion completa del sistema',1,1,'2026-08-07 00:20:17','2026-08-07 00:20:17'),(2,'user','Usuario','Acceso operativo general',1,1,'2026-08-07 00:20:17','2026-08-10 00:22:52'),(3,'annular','Autorizador de anulaciones','Autoriza la anulacion de registros operativos',1,1,'2026-08-07 00:20:17','2026-08-16 12:51:41');
/*!40000 ALTER TABLE `security_roles` ENABLE KEYS */;

--
-- Dumping data for table `security_role_permissions`
--

/*!40000 ALTER TABLE `security_role_permissions` DISABLE KEYS */;
INSERT INTO `security_role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (1,1,'2026-08-07 00:20:17'),(1,2,'2026-08-07 00:20:17'),(1,3,'2026-08-07 00:20:17'),(1,4,'2026-08-07 00:20:17'),(1,5,'2026-08-07 00:20:17'),(1,6,'2026-08-07 00:20:17'),(1,7,'2026-08-07 00:20:17'),(1,8,'2026-08-07 00:20:17'),(1,9,'2026-08-07 00:20:17'),(1,10,'2026-08-07 00:20:17'),(1,11,'2026-08-07 00:20:17'),(1,12,'2026-08-07 00:20:17'),(1,13,'2026-08-07 00:20:17'),(1,15,'2026-08-07 00:20:17'),(1,16,'2026-08-13 13:56:13'),(1,17,'2026-08-13 13:56:13'),(1,18,'2026-08-13 13:56:13'),(1,20,'2026-08-18 20:45:24'),(1,21,'2026-08-18 20:45:24'),(1,22,'2026-08-18 20:45:24'),(1,24,'2026-08-27 18:10:12'),(1,25,'2026-08-27 18:10:12'),(1,26,'2026-08-27 18:10:12'),(1,27,'2026-08-27 20:00:35'),(1,28,'2026-08-27 20:00:35'),(1,29,'2026-08-27 20:00:35'),(1,31,'2026-08-28 00:16:05'),(1,32,'2026-08-28 00:16:05'),(1,33,'2026-08-31 08:19:22'),(1,34,'2026-08-31 08:19:22'),(1,35,'2026-09-02 18:07:29'),(1,36,'2026-09-02 18:07:29'),(1,37,'2026-09-02 18:07:29'),(1,38,'2026-09-02 18:07:29'),(1,39,'2026-09-02 22:27:15'),(1,40,'2026-09-02 22:27:15'),(1,41,'2026-09-02 22:27:15'),(1,43,'2026-09-03 09:45:43'),(1,44,'2026-09-03 09:45:43'),(1,45,'2026-09-03 09:45:43'),(1,51,'2026-09-03 14:14:18'),(1,52,'2026-09-03 14:14:18'),(1,53,'2026-09-03 14:14:18'),(1,54,'2026-09-03 20:44:47'),(1,55,'2026-09-03 20:44:47'),(1,56,'2026-09-03 20:44:47'),(1,63,'2026-09-05 17:22:19'),(1,64,'2026-09-05 17:22:19'),(1,65,'2026-09-05 17:22:19'),(1,71,'2026-09-06 10:20:39'),(1,72,'2026-09-06 10:20:39'),(1,73,'2026-09-10 12:39:30'),(1,74,'2026-09-10 12:39:30'),(1,75,'2026-09-10 12:39:30'),(1,78,'2026-09-11 00:39:34'),(1,79,'2026-09-13 22:19:44'),(1,80,'2026-09-13 22:19:44'),(1,81,'2026-09-13 22:19:44'),(2,11,'2026-08-07 00:20:17'),(3,15,'2026-08-07 00:20:17');
/*!40000 ALTER TABLE `security_role_permissions` ENABLE KEYS */;

--
-- Dumping data for table `currencies`
--

/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` (`id`, `code`, `name`, `symbol`, `symbol_position`, `decimal_places`, `is_local`, `is_base`, `is_active`, `display_order`) VALUES (1,'VES','BolÃ­var venezolano','Bs.','after',2,1,0,1,10),(2,'USD','DÃ³lar estadounidense','USD','before',2,0,1,1,20),(3,'EUR','Euro','â‚¬','before',2,0,0,1,21);
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;

--
-- Dumping data for table `tariffs`
--

/*!40000 ALTER TABLE `tariffs` DISABLE KEYS */;
INSERT INTO `tariffs` (`id`, `code`, `name`, `description`, `currency_id`, `position`, `is_default`, `is_active`, `created_at`, `updated_at`) VALUES (1,'LEGACY_1','Ambulatorio','Tarifa migrada desde cost1',2,1,1,1,'2026-09-10 12:39:29','2026-09-16 18:06:50'),(2,'LEGACY_2','Tarifa 2','Tarifa migrada desde cost2',2,2,0,1,'2026-09-10 12:39:29','2026-09-14 00:24:11'),(3,'LEGACY_3','Tarifa 3','Tarifa migrada desde cost3',2,3,0,1,'2026-09-10 12:39:29','2026-09-14 00:24:11'),(4,'LEGACY_4','Tarifa 4','Tarifa migrada desde cost4',2,4,0,1,'2026-09-10 12:39:29','2026-09-14 00:24:11'),(5,'LEGACY_5','Tarifa 5','Tarifa migrada desde cost5',2,5,0,1,'2026-09-10 12:39:29','2026-09-14 00:24:11'),(6,'LEGACY_6','Tarifa 6','Tarifa migrada desde cost6',2,6,0,1,'2026-09-10 12:39:29','2026-09-16 01:20:23');
/*!40000 ALTER TABLE `tariffs` ENABLE KEYS */;

--
-- Dumping data for table `type_payment`
--

/*!40000 ALTER TABLE `type_payment` DISABLE KEYS */;
INSERT INTO `type_payment` (`id`, `code`, `description`, `display_order`, `annulled`) VALUES (1,'cash','Efectivo',10,0),(3,'debit-card','T. dÃ©bito',30,0),(4,'mobile-payment','Pago MÃ³vil',40,0),(5,'credit-card','T. crÃ©dito',50,0);
/*!40000 ALTER TABLE `type_payment` ENABLE KEYS */;

--
-- Dumping data for table `payment_method_currencies`
--

/*!40000 ALTER TABLE `payment_method_currencies` DISABLE KEYS */;
INSERT INTO `payment_method_currencies` (`payment_method_id`, `currency_id`, `is_default`, `is_active`, `display_order`) VALUES (1,1,1,1,10),(1,2,0,1,20),(1,3,0,1,30),(3,1,1,1,10),(4,1,1,1,10),(5,1,1,1,10);
/*!40000 ALTER TABLE `payment_method_currencies` ENABLE KEYS */;

--
-- Dumping data for table `payment_method_fields`
--

/*!40000 ALTER TABLE `payment_method_fields` DISABLE KEYS */;
INSERT INTO `payment_method_fields` (`id`, `payment_method_id`, `code`, `label`, `field_type`, `is_required`, `display_order`, `min_length`, `max_length`, `input_mask`, `validation_pattern`, `help_text`, `catalog_source`, `is_active`) VALUES (9,3,'reference-number','NÃºmero','reference',1,10,NULL,50,NULL,NULL,NULL,NULL,1),(10,3,'terminal','Terminal','text',1,20,NULL,50,NULL,NULL,NULL,NULL,1),(11,4,'reference-number','NÃºmero','reference',1,10,NULL,50,NULL,NULL,NULL,NULL,1),(12,4,'bank','Banco','bank',1,20,NULL,50,NULL,NULL,NULL,'banks',1),(13,5,'reference-number','NÃºmero','reference',1,10,NULL,50,NULL,NULL,NULL,NULL,1),(14,5,'terminal','Terminal','text',1,20,NULL,50,NULL,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `payment_method_fields` ENABLE KEYS */;

--
-- Dumping data for table `banks`
--

/*!40000 ALTER TABLE `banks` DISABLE KEYS */;
/*!40000 ALTER TABLE `banks` ENABLE KEYS */;

--
-- Dumping data for table `tax`
--

/*!40000 ALTER TABLE `tax` DISABLE KEYS */;
INSERT INTO `tax` (`id`, `description`, `value`, `only_dollars`, `always_subtotal`, `hide`) VALUES (1,'Exonerado',0.00,0,0,0),(2,'IVA 16',16.00,0,0,0),(3,'IVA 8',8.00,0,0,0);
/*!40000 ALTER TABLE `tax` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-18 17:52:08