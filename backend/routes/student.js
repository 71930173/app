const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyStudent, generateToken, updateLastLogin } = require('../middleware/auth');

// ============================================================
// NOTIFICATION HELPERS — Bilingual (English + Arabic)
// ============================================================
const axios = require('axios');

const sendEmail = async (to, subject, htmlBody, lang = 'en') => {
  try {
    const encodedSubject = lang === 'ar'
      ? `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
      : subject;
    await axios.post('http://localhost:5000/api/send-email', {
      to, subject: encodedSubject, body: htmlBody, type: 'notification', lang
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};

const sendWhatsApp = async (to, message) => {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instanceId || !token) {
    console.error('UltraMsg not configured');
    return { success: false, error: 'UltraMsg not configured' };
  }
  let phone = to?.replace(/[\s\-()]/g, '');
  if (!phone) return { success: false, error: 'No phone number' };
  if (phone.startsWith('0')) phone = '+966' + phone.substring(1);
  else if (!phone.startsWith('+')) phone = '+' + phone;

  try {
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('to', phone);
    params.append('body', message);
    params.append('priority', '10');
    const { data } = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    return { success: true, data };
  } catch (err) {
    console.error('WhatsApp failed:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
};

// ── Email Templates ──
const buildConfirmEmail = (data) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;line-height:1.6;color:#333}
.wrap{max-width:600px;margin:auto;padding:20px}
.en{direction:ltr;text-align:left;margin-bottom:25px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
.ar{direction:rtl;text-align:right}
h2{color:#2563eb;margin:0}
.box{background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:15px 0;border-radius:8px}
.box-ar{background:#eff6ff;border-right:4px solid #3b82f6;padding:16px;margin:15px 0;border-radius:8px}
ul{list-style:none;padding:0}li{margin:6px 0}
.footer{color:#64748b;font-size:12px;margin-top:25px}
.label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
</style></head><body>
<div class="wrap">
  <div class="en">
    <div class="label">English</div>
    <h2>✅ Dawri — Appointment Confirmed</h2>
    <p>Hello ${data.firstName},</p>
    <div class="box"><p>Your appointment has been confirmed!</p></div>
    <ul>
      <li><strong>Ticket:</strong> #${data.ticket}</li>
      <li><strong>Wait Time:</strong> ${data.wait} minutes</li>
      <li><strong>Position:</strong> ${data.position}</li>
      <li><strong>Staff:</strong> ${data.staff || '—'}</li>
      <li><strong>Location:</strong> ${data.location || '—'}</li>
    </ul>
    <p>You will be notified when your turn is approaching.</p>
    <p class="footer">Dawri System</p>
  </div>
  <div class="ar">
    <div class="label">العربية</div>
    <h2>✅ Dawri — تم تأكيد الموعد</h2>
    <p>مرحباً ${data.firstName}،</p>
    <div class="box-ar"><p>تم تأكيد موعدك بنجاح!</p></div>
    <ul>
      <li><strong>التذكرة:</strong> #${data.ticket}</li>
      <li><strong>وقت الانتظار:</strong> ${data.wait} دقيقة</li>
      <li><strong>الموقع:</strong> ${data.position}</li>
      <li><strong>الموظف:</strong> ${data.staff || '—'}</li>
      <li><strong>الموقع:</strong> ${data.location || '—'}</li>
    </ul>
    <p>سيتم إعلامك عند اقتراب دورك.</p>
    <p class="footer">نظام Dawri</p>
  </div>
</div></body></html>`;

const build3MinEmail = (data) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;line-height:1.6;color:#333}
.wrap{max-width:600px;margin:auto;padding:20px}
.en{direction:ltr;text-align:left;margin-bottom:25px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
.ar{direction:rtl;text-align:right}
h2{color:#d97706;margin:0}
.alert{background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:15px 0;border-radius:8px}
.alert-ar{background:#fef3c7;border-right:4px solid #f59e0b;padding:16px;margin:15px 0;border-radius:8px}
.alert p{margin:0;font-weight:bold;color:#92400e;font-size:16px}
.footer{color:#64748b;font-size:12px;margin-top:25px}
.label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
</style></head><body>
<div class="wrap">
  <div class="en">
    <div class="label">English</div>
    <h2>⏰ Your Turn is Coming Soon!</h2>
    <p>Hello ${data.firstName},</p>
    <div class="alert"><p>You will be called in approximately 3 minutes. Please be ready!</p></div>
    <ul>
      <li><strong>Ticket:</strong> #${data.ticket}</li>
      <li><strong>Staff:</strong> ${data.staff || '—'}</li>
      <li><strong>Location:</strong> ${data.location || '—'}</li>
    </ul>
    <p>Please proceed to the office now.</p>
    <p class="footer">Dawri System</p>
  </div>
  <div class="ar">
    <div class="label">العربية</div>
    <h2>⏰ دورك قادم!</h2>
    <p>مرحباً ${data.firstName}،</p>
    <div class="alert-ar"><p>تبقى تقريباً 3 دقائق. يرجى الاستعداد!</p></div>
    <ul>
      <li><strong>التذكرة:</strong> #${data.ticket}</li>
      <li><strong>الموظف:</strong> ${data.staff || '—'}</li>
      <li><strong>الموقع:</strong> ${data.location || '—'}</li>
    </ul>
    <p>يرجى التوجه إلى المكتب الآن.</p>
    <p class="footer">نظام Dawri</p>
  </div>
</div></body></html>`;

// ── WhatsApp Messages ──
const confirmWhatsApp = (firstName, ticket, wait, position, staff, location) =>
`✅ *Dawri — Appointment Confirmed / تم تأكيد الموعد*

*English:*
Hello ${firstName}, your appointment is confirmed! 🎉
🎫 Ticket: #${ticket}
⏳ Wait: ${wait} min
📍 Position: ${position}
👤 Staff: ${staff || '—'}
📍 Location: ${location || '—'}

*العربية:*
مرحباً ${firstName}، تم تأكيد موعدك! 🎉
🎫 التذكرة: #${ticket}
⏳ الانتظار: ${wait} دقيقة
📍 الموقع: ${position}
👤 الموظف: ${staff || '—'}
📍 المكان: ${location || '—'}`;

const warn3MinWhatsApp = (firstName, ticket, staff, location) =>
`⏰ *Dawri — 3 Minutes Left / تبقى 3 دقائق*

*English:*
Hello ${firstName}, your turn is in ~3 minutes!
🎫 Ticket: #${ticket}
👤 Staff: ${staff || '—'}
📍 Location: ${location || '—'}
Please go to the office now.

*العربية:*
مرحباً ${firstName}، دورك خلال 3 دقائق!
🎫 التذكرة: #${ticket}
👤 الموظف: ${staff || '—'}
📍 المكان: ${location || '—'}
يرجى التوجه إلى المكتب الآن.`;

// ── Main Notification Sender ──
const notifyStudent = async (student, type, data) => {
  const results = { email: false, whatsapp: false };

  if (student.email && student.email.includes('@')) {
    const subject = type === 'confirm'
      ? 'Dawri — Appointment Confirmed / تم تأكيد الموعد'
      : '⏰ Dawri — 3 Minutes Left / تبقى 3 دقائق';
    const body = type === 'confirm' ? buildConfirmEmail(data) : build3MinEmail(data);
    results.email = await sendEmail(student.email, subject, body, 'en');
  }

  if (student.phone) {
    const msg = type === 'confirm'
      ? confirmWhatsApp(student.first_name, data.ticket, data.wait, data.position, data.staff, data.location)
      : warn3MinWhatsApp(student.first_name, data.ticket, data.staff, data.location);
    const wa = await sendWhatsApp(student.phone, msg);
    results.whatsapp = wa.success;
  }

  return results;
};




// Validation helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// ============================================================
// HELPER: Recalculate queue positions and dynamic waiting times
// ============================================================
function recalculateQueue(staffId, callback) {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Connection error in recalculateQueue:', err);
      if (callback) callback(err);
      return;
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        if (callback) callback(err);
        return;
      }

      connection.query(
        "SELECT id FROM appointments WHERE staff_id = ? AND status = 'serving' ORDER BY served_at ASC LIMIT 1",
        [staffId],
        (err, servingResults) => {
          if (err) {
            connection.rollback(() => { connection.release(); if (callback) callback(err); });
            return;
          }

          const hasServing = servingResults.length > 0;

          connection.query(
            `SELECT id, priority, created_at, user_type,
              CASE WHEN user_type = 'student' THEN student_id ELSE guest_id END as user_id
             FROM appointments 
             WHERE staff_id = ? AND status = 'waiting'
             ORDER BY priority ASC, created_at ASC`,
            [staffId],
            (err, waitingAppointments) => {
              if (err) {
                connection.rollback(() => { connection.release(); if (callback) callback(err); });
                return;
              }

              connection.query(
                'SELECT avg_service_time FROM staff WHERE id = ?',
                [staffId],
                (err, staffResults) => {
                  if (err) {
                    connection.rollback(() => { connection.release(); if (callback) callback(err); });
                    return;
                  }

                  const avgServiceTime = staffResults[0]?.avg_service_time || 5;

                  if (waitingAppointments.length === 0) {
                    connection.commit((err) => { connection.release(); if (callback) callback(err); });
                    return;
                  }

                  let updateQueries = 0;
                  let completedQueries = 0;
                  let updateError = null;

                  const checkComplete = () => {
                    completedQueries++;
                    if (completedQueries === updateQueries) {
                      if (updateError) {
                        connection.rollback(() => { connection.release(); if (callback) callback(updateError); });
                      } else {
                        connection.commit((err) => { connection.release(); if (callback) callback(err); });
                      }
                    }
                  };

                  waitingAppointments.forEach((appt, index) => {
                    const position = hasServing ? index + 2 : index + 1;
                    const estimatedWait = Math.max(5, position * avgServiceTime);

                    updateQueries++;
                    connection.query(
                      'UPDATE appointments SET queue_position = ?, estimated_wait_minutes = ? WHERE id = ?',
                      [position, estimatedWait, appt.id],
                      (err) => {
                        if (err && !updateError) updateError = err;
                        checkComplete();
                      }
                    );
                  });

                  if (updateQueries === 0) {
                    connection.commit((err) => { connection.release(); if (callback) callback(err); });
                  }
                }
              );
            }
          );
        }
      );
    });
  });
}

// ============================================================
// HELPER: Send priority update notifications to affected users
// ============================================================
function sendPriorityUpdateNotifications(staffId, excludeAppointmentId) {
  db.query(
    `SELECT a.id, a.user_type, a.student_id, a.guest_id, a.estimated_wait_minutes,
      CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as contact,
      CASE WHEN a.user_type = 'student' THEN s.phone ELSE p.contact_value END as phone
     FROM appointments a
     LEFT JOIN students s ON a.student_id = s.id
     LEFT JOIN guests p ON a.guest_id = p.id
     WHERE a.staff_id = ? AND a.status = 'waiting' AND a.id != ?`,
    [staffId, excludeAppointmentId || 0],
    (err, affectedUsers) => {
      if (err) {
        console.error('Priority update notification error:', err);
        return;
      }

      affectedUsers.forEach(user => {
        const recipientId = user.user_type === 'student' ? user.student_id : user.guest_id;
        const message = `Queue updated: Your estimated wait time is now ${user.estimated_wait_minutes} minutes due to priority queue changes.`;

        db.query(
          `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
           VALUES (?, ?, ?, 'in_app', ?, 'priority_update', 1)`,
          [user.id, user.user_type, recipientId, message],
          (err) => { if (err) console.error('Priority notification insert error:', err); }
        );
      });
    }
  );
}

// ==================== STUDENT SIGNUP - CRASH SAFE ====================
router.post('/signup',
  [
    body('studentId').trim().isLength({ min: 1, max: 50 }).withMessage('Student ID required'),
    body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name 2-100 chars'),
    body('lastName').trim().isLength({ min: 2, max: 100 }).withMessage('Last name 2-100 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('confirmPassword').notEmpty().withMessage('Confirm password required'),
    body('phone').optional().trim().isMobilePhone().withMessage('Valid phone optional'),
    validate
  ],
  async (req, res) => {
    try {
      const { studentId, firstName, lastName, email, phone, password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      db.query('SELECT id FROM students WHERE student_id = ? OR email = ?', 
        [studentId, email], 
        async (err, results) => {
          try {
            if (err) {
              console.error('Signup DB error:', err);
              return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (results.length > 0) {
              return res.status(409).json({ error: 'Student ID or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            db.query(
              `INSERT INTO students (student_id, first_name, last_name, email, phone, password) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [studentId, firstName, lastName, email, phone || null, hashedPassword],
              (err, result) => {
                if (err) {
                  console.error('Signup insert error:', err);
                  return res.status(500).json({ error: 'Registration failed', details: err.message });
                }

                const token = generateToken({ id: result.insertId, userType: 'student' });

                res.status(201).json({
                  success: true,
                  message: 'Student registered successfully',
                  token,
                  student: {
                    id: result.insertId,
                    studentId: studentId,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone || null
                  }
                });
              }
            );
          } catch (innerErr) {
            console.error('Signup inner error:', innerErr);
            return res.status(500).json({ error: 'Registration failed', details: innerErr.message });
          }
        }
      );
    } catch (error) {
      console.error('Student signup error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }
);

// ==================== STUDENT LOGIN - CRASH SAFE ====================
router.post('/login',
  [
    body('studentId').trim().notEmpty().withMessage('Student ID required'),
    body('password').notEmpty().withMessage('Password required'),
    validate
  ],
  async (req, res) => {
    try {
      const { studentId, password } = req.body;

      db.query('SELECT * FROM students WHERE student_id = ? AND is_active = 1', [studentId], async (err, results) => {
        try {
          if (err) {
            console.error('DB ERROR:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }

          if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid ID or password' });
          }

          const student = results[0];

          // Check if password hash exists and is valid
          if (!student.password || student.password.length < 10) {
            console.error('Invalid password hash for student:', studentId);
            return res.status(401).json({ error: 'Invalid ID or password' });
          }

          const isMatch = await bcrypt.compare(password, student.password);

          if (!isMatch) {
            return res.status(401).json({ error: 'Invalid ID or password' });
          }

          updateLastLogin('students', student.id);
          const token = generateToken({ id: student.id, userType: 'student' });

          res.json({
            success: true,
            message: 'Login successful',
            token,
            student: {
              id: student.id,
              studentId: student.student_id,
              firstName: student.first_name,
              lastName: student.last_name,
              email: student.email,
              phone: student.phone
            }
          });
        } catch (innerErr) {
          console.error('Login inner error:', innerErr);
          return res.status(401).json({ error: 'Invalid ID or password' });
        }
      });
    } catch (outerErr) {
      console.error('Login outer error:', outerErr);
      return res.status(500).json({ error: 'Server error, please try again' });
    }
  }
);

// ==================== CHECK DUPLICATE (for signup step 1) ====================
router.post('/check-duplicate', (req, res) => {
  const { studentId, email } = req.body;

  if (!studentId && !email) {
    return res.status(400).json({ error: 'Student ID or email required' });
  }

  let query = 'SELECT id, student_id, email FROM students WHERE ';
  let params = [];
  let conditions = [];

  if (studentId) {
    conditions.push('student_id = ?');
    params.push(studentId);
  }
  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }

  query += conditions.join(' OR ');

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Check duplicate error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      const existing = results[0];
      const field = existing.student_id === studentId ? 'Student ID' : 'Email';
      return res.status(409).json({ 
        exists: true, 
        error: `${field} already exists`,
        field: existing.student_id === studentId ? 'studentId' : 'email'
      });
    }

    res.json({ exists: false });
  });
});

// ==================== GET STUDENT PROFILE ====================
router.get('/profile', verifyStudent, (req, res) => {
  db.query(
    'SELECT id, student_id, first_name, last_name, email, phone, is_active, created_at FROM students WHERE id = ?',
    [req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch profile' });
      if (results.length === 0) return res.status(404).json({ error: 'Student not found' });
      res.json(results[0]);
    }
  );
});

// ==================== UPDATE STUDENT PROFILE ====================
router.put('/profile', verifyStudent, (req, res) => {
  const { first_name, last_name, email, phone } = req.body;

  db.query(
    'UPDATE students SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
    [first_name, last_name, email, phone, req.studentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to update profile' });
      res.json({ success: true, message: 'Profile updated successfully' });
    }
  );
});

// ==================== GET ISSUE TYPES ====================
router.get('/issue-types', (req, res) => {
  db.query(
    'SELECT id, name, name_ar, description, color, icon FROM issue_types ORDER BY id',
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch issue types' });
      res.json(results);
    }
  );
});

// ==================== GET AVAILABLE STAFF FOR ISSUE TYPE ====================
// FIXED: Removed LIMIT 1 to return ALL available staff for the issue type
router.get('/available-staff', (req, res) => {
  const { issueTypeId } = req.query;

  if (!issueTypeId) {
    return res.status(400).json({ error: 'Issue type ID is required' });
  }

  db.query(
    `SELECT s.id, s.first_name, s.last_name, s.room_number, s.block, s.floor, 
      s.issue_type_id, s.is_available, s.max_queue_limit, s.avg_service_time,
      it.name as issue_type_name,
      (SELECT COUNT(*) FROM appointments WHERE staff_id = s.id AND status = 'waiting') as current_queue,
      (SELECT COUNT(*) FROM appointments WHERE staff_id = s.id AND status = 'serving') as currently_serving
     FROM staff s
     LEFT JOIN issue_types it ON s.issue_type_id = it.id
     WHERE s.issue_type_id = ? AND s.is_available = 1 AND s.is_active = 1 AND s.is_paused = 0
     ORDER BY current_queue ASC`,
    [issueTypeId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch staff' });
      if (results.length === 0) {
        return res.status(404).json({ error: 'No available staff for this issue type' });
      }
      // FIXED: Return array of ALL staff, not just first one
      res.json(results);
    }
  );
});

// ==================== CREATE APPOINTMENT (STUDENT) ====================
router.post('/appointments', verifyStudent, (req, res) => {
  const { staff_id, issue_type_id, description } = req.body;

  if (!staff_id || !issue_type_id) {
    return res.status(400).json({ error: 'Staff ID and issue type ID are required' });
  }

  db.query(
    "SELECT id, status FROM appointments WHERE student_id = ? AND status IN ('waiting', 'serving')",
    [req.studentId],
    (err, activeResults) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (activeResults.length > 0) {
        return res.status(400).json({ 
          error: 'You already have an active appointment.',
          appointment: activeResults[0]
        });
      }

      db.query(
        'SELECT is_available, max_queue_limit, is_paused, avg_service_time FROM staff WHERE id = ? AND is_active = 1',
        [staff_id],
        (err, staffResults) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          if (staffResults.length === 0) return res.status(404).json({ error: 'Staff not found' });

          const staff = staffResults[0];
          if (!staff.is_available || staff.is_paused) {
            return res.status(400).json({ error: 'Staff is currently unavailable' });
          }

          db.query(
            "SELECT COUNT(*) as count FROM appointments WHERE staff_id = ? AND status = 'waiting'",
            [staff_id],
            (err, queueResults) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              if (queueResults[0].count >= staff.max_queue_limit) {
                return res.status(400).json({ error: 'Queue is full for this staff member' });
              }

              db.query(
                'SELECT COALESCE(MAX(ticket_number), 0) + 1 as next_ticket FROM appointments WHERE DATE(created_at) = CURDATE()',
                (err, ticketResults) => {
                  if (err) return res.status(500).json({ error: 'Database error' });
                  const ticketNumber = ticketResults[0].next_ticket;

                  db.query(
                    `INSERT INTO appointments 
                     (ticket_number, user_type, student_id, staff_id, issue_type_id, description, 
                      status, queue_position, estimated_wait_minutes, priority, is_guest_priority) 
                     VALUES (?, 'student', ?, ?, ?, ?, 'waiting', 0, 0, 2, 0)`,
                    [ticketNumber, req.studentId, staff_id, issue_type_id, description || ''],
                    (err, insertResult) => {
                      if (err) return res.status(500).json({ error: 'Failed to create appointment' });

                      const appointmentId = insertResult.insertId;

                      recalculateQueue(staff_id, (err) => {
                        if (err) console.error('Queue recalculation error:', err);

                        db.query(
                          'SELECT queue_position, estimated_wait_minutes FROM appointments WHERE id = ?',
                          [appointmentId],
                          (err, positionResults) => {
                            const position = positionResults?.[0]?.queue_position || 1;
                            const waitTime = positionResults?.[0]?.estimated_wait_minutes || 0;

                            // In-app notification
                            db.query(
                              `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) VALUES (?, 'student', ?, 'in_app', ?, 'confirmation', 1)`,
                              [appointmentId, req.studentId, `Queue #${ticketNumber} confirmed. Wait: ${waitTime} min. Position: ${position}.`],
                              (err) => { if (err) console.error('Notification error:', err); }
                            );

                            // Bilingual Email + WhatsApp notification (with DB duplicate check)
                            // FIXED: Fetch staff name and location to include in confirmation notification
                            db.query(
                              `SELECT s.email, s.phone, s.first_name, s.last_name,
                                CONCAT(st.first_name, ' ', st.last_name) as staff_name,
                                st.room_number, st.block, st.floor
                               FROM students s
                               JOIN appointments a ON a.student_id = s.id
                               JOIN staff st ON a.staff_id = st.id
                               WHERE s.id = ? AND a.id = ?`,
                              [req.studentId, appointmentId],
                              async (err, results) => {
                                if (!err && results.length > 0) {
                                  const s = results[0];
                                  // Check if confirmation already sent for this appointment
                                  db.query(
                                    `SELECT id FROM notifications WHERE appointment_id = ? AND recipient_type = 'student' AND recipient_id = ? AND notification_type = 'confirmation' AND channel IN ('email', 'whatsapp') LIMIT 1`,
                                    [appointmentId, req.studentId],
                                    async (err2, existing) => {
                                      if (!err2 && existing.length === 0) {
                                        await notifyStudent(s, 'confirm', {
                                          firstName: s.first_name,
                                          ticket: ticketNumber,
                                          wait: waitTime,
                                          position: position,
                                          staff: s.staff_name,
                                          location: `${s.block}, ${s.floor}, Room ${s.room_number}`
                                        });
                                      }
                                    }
                                  );
                                }
                              }
                            );

                            res.status(201).json({
                              id: appointmentId,
                              ticket_number: ticketNumber,
                              queue_position: position,
                              estimated_wait_minutes: waitTime,
                              status: 'waiting',
                              priority: 2,
                              is_guest_priority: 0,
                              created_at: new Date().toISOString(),
                              message: 'Appointment created successfully'
                            });
                          }
                        );
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// ==================== GET STUDENT APPOINTMENTS ====================
router.get('/my-appointments', verifyStudent, (req, res) => {
  db.query(
    `SELECT a.*, 
      it.name as issue_type_name, it.name_ar as issue_type_name_ar,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor
     FROM appointments a
     JOIN issue_types it ON a.issue_type_id = it.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.student_id = ?
     ORDER BY a.created_at DESC
     LIMIT 20`,
    [req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch appointments' });
      res.json(results);
    }
  );
});

// ==================== GET ACTIVE APPOINTMENT ====================
router.get('/active-appointment', verifyStudent, (req, res) => {
  db.query(
    `SELECT a.*, 
      it.name as issue_type_name, it.name_ar as issue_type_name_ar,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor, s.avg_service_time
     FROM appointments a
     JOIN issue_types it ON a.issue_type_id = it.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.student_id = ? AND a.status IN ('waiting', 'serving')
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch active appointment' });
      if (results.length === 0) return res.json(null);
      res.json(results[0]);
    }
  );
});

// ==================== CANCEL APPOINTMENT ====================
router.post('/appointments/:id/cancel', verifyStudent, (req, res) => {
  const { id } = req.params;
  const appointmentId = parseInt(id, 10);
  if (isNaN(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ error: 'Invalid appointment ID' });
  }

  db.query(
    "SELECT id, status, staff_id, queue_position FROM appointments WHERE id = ? AND student_id = ?",
    [appointmentId, req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'Appointment not found' });

      const appointment = results[0];
      if (appointment.status === 'served' || appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot cancel completed or already cancelled appointment' });
      }

      db.query(
        "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ? AND student_id = ?",
        [appointmentId, req.studentId],
        (err, updateResult) => {
          if (err) return res.status(500).json({ error: 'Failed to cancel appointment' });
          if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Appointment not found' });

          recalculateQueue(appointment.staff_id, (err) => {
            if (err) console.error('Queue recalculation after cancel error:', err);
          });

          sendPriorityUpdateNotifications(appointment.staff_id, appointmentId);

          db.query(
            `INSERT INTO notifications 
             (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
             VALUES (?, 'student', ?, 'in_app', ?, 'cancelled', 1)`,
            [appointmentId, req.studentId, `Appointment #${appointmentId} cancelled.`],
            (err) => { if (err) console.error('Notification error:', err); }
          );

          res.json({ success: true, message: 'Appointment cancelled successfully' });
        }
      );
    }
  );
});

// ==================== GET QUEUE STATUS ====================
// FIXED: Removed auto-promote logic. Student stays 'waiting' until staff calls.
// Position 1 student gets 5 min wait (1 * 5 * 60 = 300 seconds).
router.get('/queue-status/:appointmentId', verifyStudent, (req, res) => {
  const { appointmentId } = req.params;
  const appointmentIdNum = parseInt(appointmentId, 10);
  if (isNaN(appointmentIdNum) || appointmentIdNum <= 0) {
    return res.status(400).json({ error: 'Invalid appointment ID' });
  }

  db.query(
    `SELECT a.*, 
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor, s.avg_service_time,
      TIMESTAMPDIFF(SECOND, a.created_at, NOW()) as elapsed_seconds
     FROM appointments a
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.student_id = ?`,
    [appointmentIdNum, req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch queue status' });
      if (results.length === 0) return res.status(404).json({ error: 'Appointment not found' });

      const status = results[0];

      db.query(
        "SELECT id, served_at FROM appointments WHERE staff_id = ? AND status = 'serving' ORDER BY served_at ASC LIMIT 1",
        [status.staff_id],
        (err, servingResults) => {
          if (err) console.error('Serving check error:', err);

          const currentlyServing = servingResults && servingResults.length > 0 ? servingResults[0] : null;
          const hasServing = currentlyServing !== null;

          // Count people before this appointment using priority-based ordering
          db.query(
            `SELECT COUNT(*) as people_before
             FROM appointments 
             WHERE staff_id = ? 
               AND status = 'waiting' 
               AND (priority < ? OR (priority = ? AND created_at < ?))`,
            [status.staff_id, status.priority, status.priority, status.created_at],
            (err, countResults) => {
              if (err) {
                const peopleBefore = Math.max(0, status.queue_position - 1);
                const avgTime = status.avg_service_time || 5;
                const elapsedSeconds = status.elapsed_seconds || 0;
                const remainingSeconds = status.status === 'serving' ? 0 : peopleBefore * avgTime * 60;

                return res.json({
                  id: status.id,
                  ticket_number: status.ticket_number,
                  status: status.status,
                  queue_position: status.queue_position,
                  people_before: peopleBefore,
                  guests_before: 0,
                  students_before: peopleBefore,
                  estimated_wait_minutes: status.estimated_wait_minutes,
                  remaining_seconds: remainingSeconds,
                  elapsed_seconds: elapsedSeconds,
                  created_at: status.created_at,
                  avg_service_time: avgTime,
                  staff_name: status.staff_name,
                  room: status.room_number,
                  block: status.block,
                  floor: status.floor,
                  priority: status.priority,
                  is_guest_priority: status.is_guest_priority,
                  description: status.description
                });
              }

              const peopleBefore = countResults[0].people_before || 0;
              const avgTime = status.avg_service_time || 5;

              // FIXED: Calculate position and wait time properly
              // Position: serving person = 0, first waiting = 1, second = 2, etc.
              let dynamicPosition;
              let remainingSeconds;

              if (status.status === 'serving') {
                dynamicPosition = 0;
                remainingSeconds = 0;
              } else {
                // If someone is serving, this student's position is peopleBefore + 2
                // (serving=0, then peopleBefore people, then this student)
                // If no one serving, position is peopleBefore + 1
                dynamicPosition = hasServing ? peopleBefore + 2 : peopleBefore + 1;

                // Base remaining time = position * avg service time in seconds
                // Position 1 = 5 min, Position 2 = 10 min, etc.
                const baseRemaining = dynamicPosition * avgTime * 60;

                // Elapsed time since creation (for persistence across refresh)
                const elapsedSeconds = status.elapsed_seconds || 0;

                // Calculate remaining: base - elapsed, but never below 0
                remainingSeconds = Math.max(0, baseRemaining - elapsedSeconds);

                // If elapsed time exceeds base (serving took longer than expected),
                // add 1-minute extensions that cycle: when each minute ends, add another 1 min
                if (elapsedSeconds > baseRemaining) {
                  const overdueSeconds = elapsedSeconds - baseRemaining;
                  // Cycle through 60-second chunks: show 60,59,58...1, then reset to 60
                  remainingSeconds = 60 - (overdueSeconds % 60);
                  if (remainingSeconds === 0) remainingSeconds = 60;
                }
              }

              // FIXED: Removed auto-promote logic - student stays 'waiting' until staff calls them
              // This ensures 5-minute wait screen shows for position 1
              let effectiveStatus = status.status;

              // Count guests before (for display purposes)
              db.query(
                `SELECT COUNT(*) as guests_before
                 FROM appointments 
                 WHERE staff_id = ? AND status = 'waiting' AND priority < ?`,
                [status.staff_id, status.priority],
                (err, guestCountResults) => {
                  const guestsBefore = guestCountResults?.[0]?.guests_before || 0;
                  const studentsBefore = peopleBefore - guestsBefore;

                  res.json({
                    id: status.id,
                    ticket_number: status.ticket_number,
                    status: effectiveStatus,
                    queue_position: dynamicPosition,
                    people_before: peopleBefore,
                    guests_before: guestsBefore,
                    students_before: studentsBefore,
                    estimated_wait_minutes: Math.ceil(remainingSeconds / 60),
                    remaining_seconds: remainingSeconds,
                    elapsed_seconds: status.elapsed_seconds || 0,
                    created_at: status.created_at,
                    avg_service_time: avgTime,
                    staff_name: status.staff_name,
                    room: status.room_number,
                    block: status.block,
                    floor: status.floor,
                    priority: status.priority,
                    is_guest_priority: status.is_guest_priority,
                    description: status.description,
                    currently_serving_id: currentlyServing?.id || null
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// ==================== GET STUDENT NOTIFICATIONS ====================
router.get('/notifications', verifyStudent, (req, res) => {
  db.query(
    `SELECT n.*, a.ticket_number
     FROM notifications n
     LEFT JOIN appointments a ON n.appointment_id = a.id
     WHERE n.recipient_type = 'student' AND n.recipient_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch notifications' });
      res.json(results);
    }
  );
});

// ==================== MARK NOTIFICATION AS READ ====================
router.put('/notifications/:id/read', verifyStudent, (req, res) => {
  const { id } = req.params;
  db.query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND recipient_id = ? AND recipient_type = "student"',
    [id, req.studentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to update notification' });
      res.json({ success: true });
    }
  );
});

// ==================== GET STUDENT STATS ====================
router.get('/stats', verifyStudent, (req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as total_visits,
      SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as completed,
      AVG(CASE WHEN status = 'served' THEN estimated_wait_minutes END) as avg_wait
     FROM appointments
     WHERE student_id = ?`,
    [req.studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
      const stats = results[0] || { total_visits: 0, completed: 0, avg_wait: 0 };
      res.json({
        total_visits: stats.total_visits || 0,
        completed: stats.completed || 0,
        avg_wait: Math.round(stats.avg_wait || 0)
      });
    }
  );
});


// ============================================================
// 3-MINUTE WARNING — Bilingual Email + WhatsApp + In-App
// ============================================================

// POST /api/student/queue-status/:appointmentId/send-3min-warning
router.post('/queue-status/:appointmentId/send-3min-warning', verifyStudent, (req, res) => {
  const { appointmentId } = req.params;

  // Check DB first — prevent duplicate sends even if frontend spams
  db.query(
    `SELECT id FROM notifications WHERE appointment_id = ? AND recipient_type = 'student' AND recipient_id = ? AND notification_type = '3min_warning' AND channel = 'email' LIMIT 1`,
    [appointmentId, req.studentId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (existing.length > 0) {
        return res.json({ success: true, sent: false, message: 'Already sent', duplicate: true });
      }

      db.query(
        `SELECT a.*, s.email, s.phone, s.first_name,
          CONCAT(st.first_name, ' ', st.last_name) as staff_name,
          st.room_number, st.block, st.floor
         FROM appointments a
         JOIN students s ON a.student_id = s.id
         JOIN staff st ON a.staff_id = st.id
         WHERE a.id = ? AND a.student_id = ? AND a.status = 'waiting'`,
        [appointmentId, req.studentId],
        async (err, results) => {
          if (err) return res.status(500).json({ error: 'DB error' });
          if (results.length === 0) return res.status(404).json({ error: 'Not found or not waiting' });

          const appt = results[0];

          // STRICT GUARD: Only send if remaining time is actually around 3 minutes (±2 min tolerance)
          // This prevents sending if user is at position 10 with 50 min wait
          if (appt.estimated_wait_minutes > 5 || appt.estimated_wait_minutes < 1) {
            return res.json({ 
              success: true, 
              sent: false, 
              message: 'Not within 3-minute window',
              reason: 'wait_time_not_3min'
            });
          }

          // FIXED: Save in-app notification FIRST (so it appears in notification page)
          const inAppMessage = `⏰ 3 Minutes Warning / تنبيه 3 دقائق\nYour turn is in ~3 minutes! Please be ready. / دورك خلال 3 دقائق! يرجى الاستعداد.\nTicket: #${appt.ticket_number}`;

          db.query(
            `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent, sent_at) 
             VALUES (?, 'student', ?, 'in_app', ?, '3min_warning', 1, NOW())`,
            [appointmentId, req.studentId, inAppMessage],
            (err) => {
              if (err) console.error('3min in-app notification insert error:', err);
            }
          );

          if (!appt.email) return res.json({ success: true, sent: false, message: 'No email' });

          const body = build3MinEmail({
            firstName: appt.first_name,
            ticket: appt.ticket_number,
            staff: appt.staff_name,
            location: `${appt.block}, ${appt.floor}, Room ${appt.room_number}`
          });

          const sent = await sendEmail(appt.email, '⏰ 3 Minutes Left / تبقى 3 دقائق', body, 'en');

          res.json({ success: true, sent, message: sent ? 'Sent' : 'Failed' });
        }
      );
    }
  );
});

// POST /api/student/queue-status/:appointmentId/send-3min-whatsapp
router.post('/queue-status/:appointmentId/send-3min-whatsapp', verifyStudent, (req, res) => {
  const { appointmentId } = req.params;

  // Check DB first — prevent duplicate sends
  db.query(
    `SELECT id FROM notifications WHERE appointment_id = ? AND recipient_type = 'student' AND recipient_id = ? AND notification_type = '3min_warning' AND channel = 'whatsapp' LIMIT 1`,
    [appointmentId, req.studentId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (existing.length > 0) {
        return res.json({ success: true, sent: false, message: 'Already sent', duplicate: true });
      }

      db.query(
        `SELECT a.*, s.phone, s.first_name,
          CONCAT(st.first_name, ' ', st.last_name) as staff_name,
          st.room_number, st.block, st.floor
         FROM appointments a
         JOIN students s ON a.student_id = s.id
         JOIN staff st ON a.staff_id = st.id
         WHERE a.id = ? AND a.student_id = ? AND a.status = 'waiting'`,
        [appointmentId, req.studentId],
        async (err, results) => {
          if (err) return res.status(500).json({ error: 'DB error' });
          if (results.length === 0) return res.status(404).json({ error: 'Not found' });

          const appt = results[0];
          if (!appt.phone) return res.json({ success: true, sent: false, message: 'No phone' });

          const msg = warn3MinWhatsApp(appt.first_name, appt.ticket_number, appt.staff_name, `${appt.block}, ${appt.floor}, Room ${appt.room_number}`);
          const wa = await sendWhatsApp(appt.phone, msg);
          res.json({ success: wa.success, sent: wa.success, message: wa.success ? 'Sent' : 'Failed', error: wa.error });
        }
      );
    }
  );
});


// ============================================================
// YOUR TURN NOW — Bilingual Email + WhatsApp + In-App
// ============================================================

const buildTurnNowEmail = (data) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;line-height:1.6;color:#333}
.wrap{max-width:600px;margin:auto;padding:20px}
.en{direction:ltr;text-align:left;margin-bottom:25px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
.ar{direction:rtl;text-align:right}
h2{color:#059669;margin:0}
.box{background:#d1fae5;border-left:4px solid #10b981;padding:16px;margin:15px 0;border-radius:8px}
.box-ar{background:#d1fae5;border-right:4px solid #10b981;padding:16px;margin:15px 0;border-radius:8px}
.box p{margin:0;font-weight:bold;color:#065f46;font-size:16px}
.footer{color:#64748b;font-size:12px;margin-top:25px}
.label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
</style></head><body>
<div class="wrap">
  <div class="en">
    <div class="label">English</div>
    <h2>🎉 It is Your Turn Now!</h2>
    <p>Hello ${data.firstName},</p>
    <div class="box"><p>Please go to the office now, the Dr. is waiting for you!</p></div>
    <ul>
      <li><strong>Ticket:</strong> #${data.ticket}</li>
      <li><strong>Dr.:</strong> ${data.staff || '—'}</li>
      <li><strong>Location:</strong> ${data.location || '—'}</li>
    </ul>
    <p>Please proceed to the office immediately.</p>
    <p class="footer">Dawri System</p>
  </div>
  <div class="ar">
    <div class="label">العربية</div>
    <h2>🎉 دورك الآن!</h2>
    <p>مرحباً ${data.firstName}،</p>
    <div class="box-ar"><p>اذهب إلى المكتب الآن، Dr. في انتظارك!</p></div>
    <ul>
      <li><strong>التذكرة:</strong> #${data.ticket}</li>
      <li><strong>Dr.:</strong> ${data.staff || '—'}</li>
      <li><strong>الموقع:</strong> ${data.location || '—'}</li>
    </ul>
    <p>يرجى التوجه إلى المكتب فوراً.</p>
    <p class="footer">نظام Dawri</p>
  </div>
</div></body></html>`;

const turnNowWhatsApp = (firstName, ticket, staff, location) =>
`🎉 *It is Your Turn Now / دورك الآن!*

*English:*
Hello ${firstName},
*Please go to the office now, the Dr. is waiting for you!*
🎫 Ticket: #${ticket}
👨‍🏫 Dr.: ${staff || '—'}
📍 Location: ${location || '—'}

*العربية:*
مرحباً ${firstName}،
*اذهب إلى المكتب الآن، Dr. في انتظارك!*
🎫 التذكرة: #${ticket}
👨‍🏫 Dr.: ${staff || '—'}
📍 الموقع: ${location || '—'}

Thank you! / شكراً!`;

// POST /api/student/queue-status/:appointmentId/send-turn-now
router.post('/queue-status/:appointmentId/send-turn-now', verifyStudent, (req, res) => {
  const { appointmentId } = req.params;

  // Check DB first — prevent duplicate sends
  db.query(
    `SELECT id FROM notifications WHERE appointment_id = ? AND recipient_type = 'student' AND recipient_id = ? AND notification_type = 'turn_now' LIMIT 1`,
    [appointmentId, req.studentId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (existing.length > 0) {
        return res.json({ success: true, sent: false, message: 'Already sent', duplicate: true });
      }

      db.query(
        `SELECT a.*, s.email, s.phone, s.first_name,
          CONCAT(st.first_name, ' ', st.last_name) as staff_name,
          st.room_number, st.block, st.floor
         FROM appointments a
         JOIN students s ON a.student_id = s.id
         JOIN staff st ON a.staff_id = st.id
         WHERE a.id = ? AND a.student_id = ? AND a.status = 'serving'`,
        [appointmentId, req.studentId],
        async (err, results) => {
          if (err) return res.status(500).json({ error: 'DB error' });
          if (results.length === 0) return res.status(404).json({ error: 'Not found' });

          const appt = results[0];

          // FIXED: Save in-app notification FIRST (so it appears in notification page)
          const notifMessage = `🎉 It is Your Turn Now! / دورك الآن!\nPlease go to the office, the Dr. is waiting for you! / اذهب إلى المكتب، Dr. في انتظارك!\nTicket: #${appt.ticket_number}`;

          db.query(
            `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent, sent_at) 
             VALUES (?, 'student', ?, 'in_app', ?, 'turn_now', 1, NOW())`,
            [appointmentId, req.studentId, notifMessage],
            (err) => {
              if (err) console.error('Turn now in-app notification insert error:', err);
            }
          );

          const results2 = { email: false, whatsapp: false };

          if (appt.email && appt.email.includes('@')) {
            const body = buildTurnNowEmail({
              firstName: appt.first_name,
              ticket: appt.ticket_number,
              staff: appt.staff_name,
              location: `${appt.block}, ${appt.floor}, Room ${appt.room_number}`
            });
            results2.email = await sendEmail(appt.email, '🎉 Your Turn Now / دورك الآن!', body, 'en');
          }

          if (appt.phone) {
            const msg = turnNowWhatsApp(appt.first_name, appt.ticket_number, appt.staff_name, `${appt.block}, ${appt.floor}, Room ${appt.room_number}`);
            const wa = await sendWhatsApp(appt.phone, msg);
            results2.whatsapp = wa.success;
          }

          res.json({ success: true, email: results2.email, whatsapp: results2.whatsapp });
        }
      );
    }
  );
});

// POST /api/student/queue-status/:appointmentId/send-turn-now-whatsapp
router.post('/queue-status/:appointmentId/send-turn-now-whatsapp', verifyStudent, (req, res) => {
  const { appointmentId } = req.params;

  // Check DB first — prevent duplicate sends
  db.query(
    `SELECT id FROM notifications WHERE appointment_id = ? AND recipient_type = 'student' AND recipient_id = ? AND notification_type = 'turn_now' AND channel = 'whatsapp' LIMIT 1`,
    [appointmentId, req.studentId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (existing.length > 0) {
        return res.json({ success: true, sent: false, message: 'Already sent', duplicate: true });
      }

      db.query(
        `SELECT a.*, s.phone, s.first_name,
          CONCAT(st.first_name, ' ', st.last_name) as staff_name,
          st.room_number, st.block, st.floor
         FROM appointments a
         JOIN students s ON a.student_id = s.id
         JOIN staff st ON a.staff_id = st.id
         WHERE a.id = ? AND a.student_id = ? AND a.status = 'serving'`,
        [appointmentId, req.studentId],
        async (err, results) => {
          if (err) return res.status(500).json({ error: 'DB error' });
          if (results.length === 0) return res.status(404).json({ error: 'Not found' });

          const appt = results[0];
          if (!appt.phone) return res.json({ success: true, sent: false, message: 'No phone' });

          const msg = turnNowWhatsApp(appt.first_name, appt.ticket_number, appt.staff_name, `${appt.block}, ${appt.floor}, Room ${appt.room_number}`);
          const wa = await sendWhatsApp(appt.phone, msg);

          res.json({ success: wa.success, sent: wa.success, message: wa.success ? 'Sent' : 'Failed', error: wa.error });
        }
      );
    }
  );
});

module.exports = router;