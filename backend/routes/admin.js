const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware to verify admin token
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // FIX: Check userType (not type) to match token payload from auth.js
    if (decoded.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== DASHBOARD STATS ==========
router.get('/dashboard', authenticateAdmin, (req, res) => {
  const { period = 'day' } = req.query;

  let dateFilter;
  switch(period) {
    case 'day':
      dateFilter = 'DATE(created_at) = CURDATE()';
      break;
    case 'week':
      dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    case 'year':
      dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
      break;
    default:
      dateFilter = 'DATE(created_at) = CURDATE()';
  }

  db.query(
    `SELECT 
      COUNT(CASE WHEN user_type = 'student' AND status = 'served' THEN 1 END) as students_served,
      COUNT(CASE WHEN user_type = 'guest' AND status = 'served' THEN 1 END) as guests_served,
      COUNT(CASE WHEN status = 'served' THEN 1 END) as total_served,
      AVG(CASE WHEN status = 'served' THEN estimated_wait_minutes END) as avg_wait
     FROM appointments 
     WHERE ${dateFilter}`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const stats = results[0];
      res.json({
        studentsToday: stats.students_served || 0,
        parentsToday: stats.guests_served || 0,
        totalToday: stats.total_served || 0,
        avgWaitTime: Math.round(stats.avg_wait || 0),
        period,
      });
    }
  );
});

// ========== RECENT ACTIVITY ==========
router.get('/recent-activity', authenticateAdmin, (req, res) => {
  const { limit = 10 } = req.query;

  db.query(
    `SELECT 
      a.id,
      a.ticket_number,
      a.user_type,
      a.status,
      a.created_at,
      CASE 
        WHEN a.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
        ELSE CONCAT(p.first_name, ' ', p.last_name)
      END as user_name,
      CONCAT(st.first_name, ' ', st.last_name) as staff_name,
      i.name as issue_name
     FROM appointments a
     LEFT JOIN students s ON a.student_id = s.id
     LEFT JOIN guests p ON a.guest_id = p.id
     JOIN staff st ON a.staff_id = st.id
     LEFT JOIN issue_types i ON a.issue_type_id = i.id
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ========== STAFF MANAGEMENT ==========

// Get all staff
router.get('/staff', authenticateAdmin, (req, res) => {
  db.query(
    `SELECT s.*, i.name as issue_type_name 
     FROM staff s
     LEFT JOIN issue_types i ON s.issue_type_id = i.id
     ORDER BY s.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Create staff
router.post('/staff', authenticateAdmin, async (req, res) => {
  const { firstName, lastName, email, password, roomNumber, block, floor, school, issueTypeId, maxQueueLimit, isAvailable } = req.body;

  if (!firstName || !lastName || !email || !password || !roomNumber || !block || !floor) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  try {
    db.query('SELECT * FROM staff WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        `INSERT INTO staff (first_name, last_name, email, password, room_number, block, floor, school, issue_type_id, max_queue_limit, is_available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, hashedPassword, roomNumber, block, floor, school || null, issueTypeId || null, maxQueueLimit || 20, isAvailable || 1],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });

          res.status(201).json({
            message: 'Staff created successfully',
            staffId: result.insertId,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff
router.put('/staff/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, roomNumber, block, floor, school, issueTypeId, maxQueueLimit, isAvailable } = req.body;

  try {
    let updateFields = [];
    let values = [];

    if (firstName) { updateFields.push('first_name = ?'); values.push(firstName); }
    if (lastName) { updateFields.push('last_name = ?'); values.push(lastName); }
    if (email) { updateFields.push('email = ?'); values.push(email); }
    if (roomNumber) { updateFields.push('room_number = ?'); values.push(roomNumber); }
    if (block) { updateFields.push('block = ?'); values.push(block); }
    if (floor) { updateFields.push('floor = ?'); values.push(floor); }
    if (school !== undefined) { updateFields.push('school = ?'); values.push(school); }
    if (issueTypeId !== undefined) { updateFields.push('issue_type_id = ?'); values.push(issueTypeId); }
    if (maxQueueLimit !== undefined) { updateFields.push('max_queue_limit = ?'); values.push(maxQueueLimit); }
    if (isAvailable !== undefined) { updateFields.push('is_available = ?'); values.push(isAvailable); }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    db.query(
      `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Staff updated successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Update staff status (availability/paused)
router.put('/staff/:id/status', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['available', 'unavailable', 'paused'].includes(status)) {
    return res.status(400).json({ error: 'Status must be available, unavailable, or paused' });
  }

  let updates = {};
  switch(status) {
    case 'available':
      updates = { is_available: 1, is_paused: 0 };
      break;
    case 'unavailable':
      updates = { is_available: 0, is_paused: 0 };
      break;
    case 'paused':
      updates = { is_available: 0, is_paused: 1 };
      break;
  }

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  db.query(
    `UPDATE staff SET ${fields} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `Staff status updated to ${status}` });
    }
  );
});

// Delete staff
router.delete('/staff/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM staff WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Staff deleted successfully' });
  });
});


// ========== ISSUE TYPES ==========

// Get all issue types
router.get('/issue-types', authenticateAdmin, (req, res) => {
  db.query('SELECT * FROM issue_types ORDER BY id', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Create issue type
router.post('/issue-types', authenticateAdmin, (req, res) => {
  const { name, nameAr, description, color, icon } = req.body;

  if (!name || !nameAr) {
    return res.status(400).json({ error: 'Name (EN) and Name (AR) are required' });
  }

  db.query(
    'INSERT INTO issue_types (name, name_ar, description, color, icon) VALUES (?, ?, ?, ?, ?)',
    [name, nameAr, description || null, color || '#2563eb', icon || 'FaQuestionCircle'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Issue type created', id: result.insertId });
    }
  );
});

// Update issue type
router.put('/issue-types/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, nameAr, description, color, icon } = req.body;

  let updates = [];
  let values = [];

  if (name) { updates.push('name = ?'); values.push(name); }
  if (nameAr) { updates.push('name_ar = ?'); values.push(nameAr); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (color) { updates.push('color = ?'); values.push(color); }
  if (icon) { updates.push('icon = ?'); values.push(icon); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  db.query(
    `UPDATE issue_types SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Issue type updated' });
    }
  );
});

// Delete issue type
router.delete('/issue-types/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM issue_types WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Issue type deleted' });
  });
});

// ========== PEAK HOURS ==========
router.get('/peak-hours', authenticateAdmin, (req, res) => {
  try {
    const { period = 'day' } = req.query;
    console.log('[PEAK-HOURS] Request received, period=' + period);
    console.log('[PEAK-HOURS] db object type:', typeof db);
    console.log('[PEAK-HOURS] db.query exists:', typeof db.query === 'function');

    // FIX: Separate date filters — sql1 has no table alias, sql2 uses alias 'a'
    let dateFilter, dateFilterAliased;
    switch(period) {
      case 'day':
        dateFilter = "DATE(created_at) = CURDATE()";
        dateFilterAliased = "DATE(a.created_at) = CURDATE()";
        break;
      case 'week':
        dateFilter = "created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        dateFilterAliased = "a.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case 'month':
        dateFilter = "created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        dateFilterAliased = "a.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      default:
        dateFilter = "DATE(created_at) = CURDATE()";
        dateFilterAliased = "DATE(a.created_at) = CURDATE()";
    }

    const sql1 = `SELECT 
        HOUR(created_at) as hour,
        COUNT(CASE WHEN user_type = 'student' THEN 1 END) as students,
        COUNT(CASE WHEN user_type = 'guest' THEN 1 END) as guests,
        COUNT(*) as total,
        AVG(estimated_wait_minutes) as avg_wait
      FROM appointments
      WHERE ${dateFilter}
      GROUP BY HOUR(created_at)
      ORDER BY hour`;

    console.log('[PEAK-HOURS] SQL1:', sql1);

    db.query(sql1, (err, results) => {
      console.log('[PEAK-HOURS] SQL1 callback executed');
      console.log('[PEAK-HOURS] err:', err ? err.message : 'null');
      console.log('[PEAK-HOURS] results type:', typeof results);
      console.log('[PEAK-HOURS] results isArray:', Array.isArray(results));
      console.log('[PEAK-HOURS] results length:', results ? results.length : 'N/A');

      if (err) {
        console.error('[PEAK-HOURS] SQL1 ERROR:', err);
        return res.status(500).json({ 
          error: 'SQL1 failed: ' + err.message,
          sql: sql1,
          code: err.code || 'UNKNOWN'
        });
      }

      if (!results) {
        console.error('[PEAK-HOURS] results is null');
        return res.status(500).json({ error: 'results is null' });
      }

      let peakHour = 'N/A';
      let maxTotal = 0;
      let avgWaitTotal = 0;

      const hourlyData = results.map(r => {
        const hourNum = parseInt(r.hour, 10);
        const hourLabel = isNaN(hourNum) ? 'N/A' : `${hourNum}:00`;
        const total = parseInt(r.total, 10) || 0;
        const students = parseInt(r.students, 10) || 0;
        const parents = parseInt(r.guests, 10) || 0;
        const avgWait = parseFloat(r.avg_wait) || 0;

        if (total > maxTotal) {
          maxTotal = total;
          peakHour = hourLabel;
        }
        avgWaitTotal += avgWait;
        return {
          hour: hourLabel,
          students,
          parents,
          total,
          avgWait: Math.round(avgWait),
        };
      });

      const avgWaitTime = results.length ? Math.round(avgWaitTotal / results.length) : 0;
      const totalAppointments = results.reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0);

      const sql2 = `SELECT i.name, COUNT(*) as count
        FROM appointments a
        JOIN issue_types i ON a.issue_type_id = i.id
        WHERE ${dateFilterAliased}
        GROUP BY a.issue_type_id
        ORDER BY count DESC
        LIMIT 1`;

      console.log('[PEAK-HOURS] SQL2:', sql2);

      db.query(sql2, (err2, sectionResults) => {
        console.log('[PEAK-HOURS] SQL2 callback executed');
        console.log('[PEAK-HOURS] err2:', err2 ? err2.message : 'null');

        if (err2) {
          console.error('[PEAK-HOURS] SQL2 ERROR:', err2);
          return res.status(500).json({ 
            error: 'SQL2 failed: ' + err2.message,
            sql: sql2,
            code: err2.code || 'UNKNOWN'
          });
        }

        const busiestSection = (sectionResults && sectionResults[0] && sectionResults[0].name) || 'N/A';
        const totalForCalc = totalAppointments > 0 ? totalAppointments : 1;
        const busiestPercentage = (sectionResults && sectionResults[0] && sectionResults[0].count)
          ? Math.round((parseInt(sectionResults[0].count, 10) / totalForCalc) * 100)
          : 0;

        console.log('[PEAK-HOURS] SUCCESS, sending response');
        return res.json({
          peakHour,
          busiestSection,
          busiestPercentage,
          avgWaitTime,
          hourlyData,
        });
      });
    });
  } catch (error) {
    console.error('[PEAK-HOURS] UNEXPECTED ERROR:', error);
    return res.status(500).json({ 
      error: 'Unexpected error: ' + error.message,
      stack: error.stack
    });
  }
});

// ========== ANALYTICS ==========
router.get('/analytics', authenticateAdmin, (req, res) => {
  const { period = 'week' } = req.query;

  let groupBy, dateFormat, interval;
  switch(period) {
    case 'day':
      groupBy = 'HOUR(created_at)';
      dateFormat = '%H:00';
      interval = 'DAY';
      break;
    case 'week':
      groupBy = 'DAYOFWEEK(created_at)';
      dateFormat = '%W';
      interval = 'WEEK';
      break;
    case 'month':
      groupBy = 'WEEK(created_at)';
      dateFormat = 'Week %U';
      interval = 'MONTH';
      break;
    case 'year':
      groupBy = 'MONTH(created_at)';
      dateFormat = '%M';
      interval = 'YEAR';
      break;
    default:
      groupBy = 'DAYOFWEEK(created_at)';
      dateFormat = '%W';
      interval = 'WEEK';
  }

  db.query(
    `SELECT 
      DATE_FORMAT(created_at, ?) as label,
      COUNT(CASE WHEN user_type = 'student' AND status = 'served' THEN 1 END) as students,
      COUNT(CASE WHEN user_type = 'guest' AND status = 'served' THEN 1 END) as guests
     FROM appointments
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 ${interval})
     GROUP BY ${groupBy}
     ORDER BY created_at`,
    [dateFormat],
    (err, servedResults) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query(
        `SELECT 
          CONCAT(s.first_name, ' ', s.last_name) as staff_name,
          COUNT(*) as served_count,
          AVG(a.estimated_wait_minutes) as avg_wait
         FROM appointments a
         JOIN staff s ON a.staff_id = s.id
         WHERE a.status = 'served'
         AND a.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)
         GROUP BY a.staff_id
         ORDER BY served_count DESC`,
        (err, staffResults) => {
          if (err) return res.status(500).json({ error: err.message });

          db.query(
            `SELECT 
              DATE_FORMAT(created_at, ?) as label,
              AVG(estimated_wait_minutes) as avg_wait,
              MAX(estimated_wait_minutes) as peak_wait
             FROM appointments
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 ${interval})
             GROUP BY ${groupBy}
             ORDER BY created_at`,
            [dateFormat],
            (err, waitResults) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                servedOverTime: {
                  labels: servedResults.map(r => r.label),
                  students: servedResults.map(r => r.students),
                  parents: servedResults.map(r => r.guests),
                },
                staffPerformance: {
                  labels: staffResults.map(r => r.staff_name),
                  served: staffResults.map(r => r.served_count),
                  avgTime: staffResults.map(r => Math.round(r.avg_wait || 0)),
                },
                waitTimeTrends: {
                  labels: waitResults.map(r => r.label),
                  avgWait: waitResults.map(r => Math.round(r.avg_wait || 0)),
                  peakWait: waitResults.map(r => Math.round(r.peak_wait || 0)),
                },
              });
            }
          );
        }
      );
    }
  );
});

// ========== STAFF PERFORMANCE ==========
router.get('/staff-performance', authenticateAdmin, (req, res) => {
  db.query(
    `SELECT 
      s.id,
      CONCAT(s.first_name, ' ', s.last_name) as name,
      s.room_number,
      s.block,
      COUNT(CASE WHEN a.status = 'served' THEN 1 END) as total_served,
      COUNT(CASE WHEN a.status = 'waiting' THEN 1 END) as current_queue,
      AVG(CASE WHEN a.status = 'served' THEN a.estimated_wait_minutes END) as avg_wait_time,
      s.is_available,
      s.is_paused
     FROM staff s
     LEFT JOIN appointments a ON s.id = a.staff_id
     GROUP BY s.id
     ORDER BY total_served DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ========== SYSTEM SETTINGS ==========
router.get('/settings', authenticateAdmin, (req, res) => {
  db.query('SELECT * FROM system_settings ORDER BY id', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Convert to key-value object
    const settings = {};
    results.forEach(row => {
      let value = row.setting_value;
      if (row.setting_type === 'number') value = parseFloat(value);
      if (row.setting_type === 'boolean') value = value === 'true' || value === '1';
      if (row.setting_type === 'json') {
        try { value = JSON.parse(value); } catch(e) {}
      }
      settings[row.setting_key] = value;
    });

    res.json(settings);
  });
});

router.put('/settings', authenticateAdmin, (req, res) => {
  const { key, value } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Setting key is required' });
  }

  db.query(
    'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
    [String(value), key],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Setting updated', key, value });
    }
  );
});

// ========== NOTIFICATIONS ==========
router.get('/notifications', authenticateAdmin, (req, res) => {
  const { limit = 20 } = req.query;

  db.query(
    `SELECT n.*, 
      CASE 
        WHEN n.recipient_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
        WHEN n.recipient_type = 'guest' THEN CONCAT(p.first_name, ' ', p.last_name)
        WHEN n.recipient_type = 'staff' THEN CONCAT(st.first_name, ' ', st.last_name)
      END as recipient_name,
      a.ticket_number
     FROM notifications n
     LEFT JOIN students s ON n.recipient_type = 'student' AND n.recipient_id = s.id
     LEFT JOIN guests p ON n.recipient_type = 'guest' AND n.recipient_id = p.id
     LEFT JOIN staff st ON n.recipient_type = 'staff' AND n.recipient_id = st.id
     LEFT JOIN appointments a ON n.appointment_id = a.id
     ORDER BY n.created_at DESC
     LIMIT ?`,
    [parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

router.put('/notifications/:id/read', authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// ========== EXPORT DATA ==========
router.get('/export/:type', authenticateAdmin, async (req, res) => {
  const { type } = req.params;
  const { format = 'json', startDate, endDate, staffId } = req.query;

  const allowedTypes = ['appointments', 'stats', 'staff', 'students', 'guests'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid export type' });
  }

  try {
    let query;
    let params = [];

    switch(type) {
      case 'appointments':
        query = `SELECT a.*, 
          CASE WHEN a.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name) 
               ELSE CONCAT(p.first_name, ' ', p.last_name) END as user_name,
          it.name as issue_type_name,
          CONCAT(st.first_name, ' ', st.last_name) as staff_name
         FROM appointments a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN guests p ON a.guest_id = p.id
         JOIN issue_types it ON a.issue_type_id = it.id
         JOIN staff st ON a.staff_id = st.id
         WHERE 1=1`;
        if (startDate) { query += ' AND DATE(a.created_at) >= ?'; params.push(startDate); }
        if (endDate) { query += ' AND DATE(a.created_at) <= ?'; params.push(endDate); }
        if (staffId) { query += ' AND a.staff_id = ?'; params.push(staffId); }
        query += ' ORDER BY a.created_at DESC';
        break;

      case 'stats':
        query = `SELECT ds.*, CONCAT(s.first_name, ' ', s.last_name) as staff_name, it.name as issue_type
         FROM daily_stats ds
         JOIN staff s ON ds.staff_id = s.id
         LEFT JOIN issue_types it ON s.issue_type_id = it.id
         WHERE 1=1`;
        if (startDate) { query += ' AND ds.stat_date >= ?'; params.push(startDate); }
        if (endDate) { query += ' AND ds.stat_date <= ?'; params.push(endDate); }
        if (staffId) { query += ' AND ds.staff_id = ?'; params.push(staffId); }
        query += ' ORDER BY ds.stat_date DESC';
        break;

      case 'staff':
        query = `SELECT s.id, s.first_name, s.last_name, s.email, s.room_number, s.block, s.floor, s.school,
          it.name as issue_type, s.is_available, s.is_paused, s.max_queue_limit, s.total_served_today,
          s.created_at
         FROM staff s
         LEFT JOIN issue_types it ON s.issue_type_id = it.id
         WHERE s.is_active = 1`;
        break;

      case 'students':
        query = `SELECT id, student_id, first_name, last_name, email, phone, is_active, created_at 
         FROM students WHERE is_active = 1 ORDER BY created_at DESC`;
        break;

      case 'guests':
        query = `SELECT id, first_name, last_name, contact_method, contact_value, language, is_active, created_at 
         FROM guests WHERE is_active = 1 ORDER BY created_at DESC`;
        break;
    }

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Export error:', err);
        return res.status(500).json({ error: 'Export failed', details: err.message });
      }

      // Log export
      db.query(
        'INSERT INTO export_logs (admin_id, export_type, filters, record_count, ip_address) VALUES (?, ?, ?, ?, ?)',
        [req.adminId, type, JSON.stringify(req.query), results.length, req.ip]
      );

      if (format === 'csv') {
        const { Parser } = require('json2csv');
        const parser = new Parser();
        const csv = parser.parse(results);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
      }

      res.json({
        type,
        format,
        count: results.length,
        exported_at: new Date().toISOString(),
        data: results
      });
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;