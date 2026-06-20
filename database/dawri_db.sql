-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 07, 2026 at 08:25 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dawri_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'admin',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `first_name`, `last_name`, `email`, `password`, `role`, `last_login`, `created_at`, `updated_at`) VALUES
(2, 'Admin', 'User', 'admin@university.com', '$2b$10$BMtmZzDAMPDCqSKYikW38OpW7IjyWwfOXpOg8o3pOCb4T6vpHHYy6', 'superadmin', NULL, '2026-05-20 18:02:56', '2026-05-20 18:02:56');

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `ticket_number` int(11) NOT NULL,
  `user_type` enum('student','guest') NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `guest_id` int(11) DEFAULT NULL,
  `staff_id` int(11) NOT NULL,
  `issue_type_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `resolution_note` text DEFAULT NULL,
  `status` enum('waiting','serving','served','cancelled','paused','no_show','resolved_remotely') NOT NULL DEFAULT 'waiting',
  `queue_position` int(11) NOT NULL DEFAULT 0,
  `estimated_wait_minutes` int(11) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 2,
  `is_guest_priority` tinyint(1) NOT NULL DEFAULT 0,
  `actual_service_minutes` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `served_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_stats`
--

CREATE TABLE `daily_stats` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `stat_date` date NOT NULL,
  `students_served` int(11) NOT NULL DEFAULT 0,
  `guests_served` int(11) NOT NULL DEFAULT 0,
  `total_served` int(11) NOT NULL DEFAULT 0,
  `avg_wait_time` int(11) DEFAULT 0,
  `avg_service_time` int(11) DEFAULT 0,
  `peak_hour` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `export_logs`
--

CREATE TABLE `export_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `export_type` varchar(50) NOT NULL,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`filters`)),
  `file_name` varchar(255) DEFAULT NULL,
  `record_count` int(11) DEFAULT 0,
  `exported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `issue_types`
--

CREATE TABLE `issue_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_ar` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(20) DEFAULT '#2563eb',
  `icon` varchar(50) DEFAULT 'FaQuestionCircle',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issue_types`
--

INSERT INTO `issue_types` (`id`, `name`, `name_ar`, `description`, `color`, `icon`, `created_at`) VALUES
(1, 'Admission', 'القبول', 'New student admission, transfer, documents', '#2563eb', 'FaUserPlus', '2026-05-08 11:56:56'),
(2, 'Financial', 'المالية', 'Tuition fees, payments, scholarships', '#10b981', 'FaDollarSign', '2026-05-08 11:56:56'),
(3, 'Academic', 'الأكاديمية', 'Grades, courses, registration', '#f59e0b', 'FaGraduationCap', '2026-05-08 11:56:56'),
(4, 'IT Support', 'دعم تقني', 'Portal issues, email, technical problems', '#8b5cf6', 'FaLaptopCode', '2026-05-08 11:56:56'),
(5, 'Student Affairs', 'شؤون الطلاب', 'Student activities, complaints, certificates', '#ec4899', 'FaUsers', '2026-05-08 11:56:56'),
(6, 'Other', 'أخرى', 'Other issues not listed above', '#64748b', 'FaQuestionCircle', '2026-05-08 11:56:56');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `recipient_type` enum('student','guest','staff') NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `channel` enum('sms','email','push','in_app') NOT NULL DEFAULT 'in_app',
  `message` text NOT NULL,
  `message_ar` text DEFAULT NULL,
  `notification_type` enum('confirmation','3min_warning','turn_now','queue_paused','queue_resumed','queue_full','served','cancelled','resolved_remotely') NOT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guests`
--

CREATE TABLE `guests` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `contact_method` enum('email','phone') NOT NULL DEFAULT 'phone',
  `contact_value` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `language` enum('en','ar') NOT NULL DEFAULT 'en',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `block` varchar(50) NOT NULL,
  `floor` varchar(20) NOT NULL,
  `school` varchar(100) DEFAULT NULL,
  `issue_type_id` int(11) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `max_queue_limit` int(11) NOT NULL DEFAULT 20,
  `is_paused` tinyint(1) NOT NULL DEFAULT 0,
  `current_serving` int(11) DEFAULT NULL,
  `total_served_today` int(11) NOT NULL DEFAULT 0,
  `avg_service_time` int(11) DEFAULT 5,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `first_name`, `last_name`, `email`, `password`, `room_number`, `block`, `floor`, `school`, `issue_type_id`, `is_available`, `max_queue_limit`, `is_paused`, `current_serving`, `total_served_today`, `avg_service_time`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(9, 'ahmad', 'khaled', 'ahmad@gmail.com', '$2a$10$cFAr5cxdOPluo6.vLhhiu.cUXkTV2hNpjZ3JIMP9F1tLaVmSXj6KK', 'A-101', 'Block A', '1st Floor', NULL, 1, 1, 20, 0, 0, 0, 5, 1, '2026-05-21 13:35:52', '2026-05-21 13:28:03', '2026-05-21 13:36:07'),
(10, 'Sarah', 'Smith', 'sarah@uni.com', '...', 'B-202', 'Block B', '2nd Floor', NULL, 2, 1, 20, 0, NULL, 0, 5, 1, NULL, '2026-05-31 15:03:23', '2026-05-31 15:03:23'),
(11, 'John', 'Doe', 'john@uni.com', '...', 'C-303', 'Block C', '3rd Floor', NULL, 3, 1, 20, 0, NULL, 0, 5, 1, NULL, '2026-05-31 15:03:23', '2026-05-31 15:03:23'),
(12, 'Mike', 'Tech', 'mike@uni.com', '...', 'D-404', 'Block D', '4th Floor', NULL, 4, 1, 20, 0, NULL, 0, 5, 1, NULL, '2026-05-31 15:03:23', '2026-05-31 15:03:23'),
(13, 'leya', 'man', 'leya@gmail.com', '$2a$10$HQwK/g27DBNLSsSwbT6w.uSrpjHGrDeDTCk.gnwCVKuz4TBIsYY6q', 'A-205', 'Block A', '2nd floor', NULL, 1, 1, 20, 0, NULL, 6, 5, 1, '2026-06-06 17:11:55', '2026-05-31 15:52:54', '2026-06-07 12:37:35');

-- --------------------------------------------------------

--
-- Table structure for table `staff_availability_log`
--

CREATE TABLE `staff_availability_log` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `status` enum('available','unavailable','paused') NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `description`, `updated_at`) VALUES
(1, 'guest_priority_enabled', 'true', 'boolean', 'Enable guest priority in queue', '2026-05-20 20:00:00'),
(2, 'max_queue_per_staff', '20', 'number', 'Maximum queue size per staff member', '2026-05-20 20:00:00'),
(3, 'auto_cancel_minutes', '30', 'number', 'Auto-cancel appointments after N minutes', '2026-05-20 20:00:00'),
(4, 'notification_enabled', 'true', 'boolean', 'Enable notifications system', '2026-05-20 20:00:00'),
(5, 'theme_primary_color', '#2563eb', 'string', 'Primary theme color', '2026-05-20 20:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `user_issues`
--

CREATE TABLE `user_issues` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `issue_type_id` int(11) DEFAULT NULL,
  `custom_description` text NOT NULL,
  `submitted_by` enum('guest','student') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_admins_role` (`role`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointments_ibfk_1` (`student_id`),
  ADD KEY `appointments_ibfk_2` (`guest_id`),
  ADD KEY `appointments_ibfk_3` (`staff_id`),
  ADD KEY `appointments_ibfk_4` (`issue_type_id`),
  ADD KEY `idx_appointments_priority_created` (`priority`,`created_at`);

--
-- Indexes for table `daily_stats`
--
ALTER TABLE `daily_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_staff_date` (`staff_id`,`stat_date`),
  ADD KEY `idx_stats_date` (`stat_date`);

--
-- Indexes for table `export_logs`
--
ALTER TABLE `export_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_export_type` (`export_type`),
  ADD KEY `idx_exported_at` (`exported_at`);

--
-- Indexes for table `issue_types`
--
ALTER TABLE `issue_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `idx_notifications_sent` (`is_sent`),
  ADD KEY `idx_notifications_recipient` (`recipient_type`,`recipient_id`),
  ADD KEY `idx_notifications_type` (`notification_type`);

--
-- Indexes for table `guests`
--
ALTER TABLE `guests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `contact_value` (`contact_value`),
  ADD KEY `idx_guests_active` (`is_active`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_staff_available` (`is_available`),
  ADD KEY `idx_staff_issue` (`issue_type_id`),
  ADD KEY `idx_staff_active` (`is_active`);

--
-- Indexes for table `staff_availability_log`
--
ALTER TABLE `staff_availability_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `idx_availability_time` (`changed_at`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_students_active` (`is_active`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `user_issues`
--
ALTER TABLE `user_issues`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `issue_type_id` (`issue_type_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=123;

--
-- AUTO_INCREMENT for table `daily_stats`
--
ALTER TABLE `daily_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `export_logs`
--
ALTER TABLE `export_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `issue_types`
--
ALTER TABLE `issue_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=209;

--
-- AUTO_INCREMENT for table `guests`
--
ALTER TABLE `guests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `staff_availability_log`
--
ALTER TABLE `staff_availability_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_issues`
--
ALTER TABLE `user_issues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`issue_type_id`) REFERENCES `issue_types` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
