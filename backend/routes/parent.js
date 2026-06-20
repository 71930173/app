const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const axios = require('axios');

// ============================================
// POST /api/parent/login - Parent login
// ============================================
router.post('/login', async (req, res) => {
  const { contactValue, password } = req.body;

  if (!contactValue || !password) {
    return res.status(400).json({ error: 'Contact value and password are required' });
  }

  try {
    // Find parent by contact_value (phone or email)
    db.query(
      'SELECT id, first_name, last_name, contact_method, contact_value, language, password FROM parents WHERE contact_value = ? AND is_active = 1',
      [contactValue],
      async (err, results) => {
        if (err) {
          console.error('Parent login DB error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const parent = results[0];

        // Verify password
        const bcrypt = require('bcrypt');
        const isMatch = await bcrypt.compare(password, parent.password);

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
          { id: parent.id, userType: 'parent', firstName: parent.first_name },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          token,
          parent: {
            id: parent.id,
            firstName: parent.first_name,
            lastName: parent.last_name,
            contactMethod: parent.contact_method,
            contactValue: parent.contact_value,
            language: parent.language
          }
        });
      }
    );
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// NEW: Email helper with Arabic/English support
// ============================================
const buildEmailTemplate = (lang, type, data) => {
  

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .section-en { direction: ltr; text-align: left; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .section-ar { direction: rtl; text-align: right; }
    h2 { color: ${type === 'warning3min' ? '#d97706' : type === 'turn_now' ? '#059669' : '#2563eb'}; margin-top: 0; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    .alert-box p { margin: 0; font-weight: bold; color: #92400e; }
    .alert-box-ar { background: #fef3c7; border-right: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    .alert-box-ar p { margin: 0; font-weight: bold; color: #92400e; }
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
    .footer { color: #64748b; font-size: 12px; margin-top: 30px; }
    .lang-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- English Section -->
    <div class="section-en">
      <div class="lang-label">English</div>
      <h2>${type === 'warning3min' ? '⏰ Smart Queue - Your Turn is Coming Soon!' : type === 'turn_now' ? "🎉 Smart Queue - It's Your Turn Now!" : 'Smart Queue - Appointment Confirmed'}</h2>
      <p>${type === 'warning3min' ? 'Your appointment is approaching! ⏳' : type === 'turn_now' ? 'Please go to the office now!' : 'Your appointment details:'}</p>
      <p>Hello ${data.firstName},</p>
      ${type === 'warning3min' ? `
      <div class="alert-box">
        <p>You will be called in approximately 3 minutes</p>
      </div>` : type === 'turn_now' ? `
      <div class="alert-box" style="background: #d1fae5; border-left-color: #10b981;">
        <p style="color: #065f46;">It's your turn now! Please go to the office!</p>
      </div>` : ''}
      <ul>
        <li><strong>Ticket Number:</strong> ${data.ticketNumber ? '#' + data.ticketNumber : ''}</li>
        ${data.waitTime ? `<li><strong>Estimated Wait:</strong> ${data.waitTime} minutes</li>` : ''}
        ${data.priority ? `<li><strong>Priority:</strong> Parent Priority (Highest)</li>` : ''}
        ${data.position ? `<li><strong>Queue Position:</strong> ${data.position}</li>` : ''}
        ${data.staffName ? `<li><strong>Staff:</strong> ${data.staffName}</li>` : ''}
        ${data.location ? `<li><strong>Location:</strong> ${data.location}</li>` : ''}
      </ul>
      ${type === 'turn_now' ? `<p><strong>Please proceed to the office immediately! The staff is waiting for you.</strong></p>` : type === 'confirmation' ? `<p>You will receive a notification when your turn is approaching.</p>` : `<p>Please make your way to the office now to ensure you don't miss your turn.</p>`}
      <p class="footer">This is an automated notification from Smart Queue System.</p>
    </div>

    <!-- Arabic Section -->
    <div class="section-ar">
      <div class="lang-label">العربية</div>
      <h2>${type === 'warning3min' ? '⏰ Smart Queue - دورك قادم!' : type === 'turn_now' ? '🎉 Smart Queue - دورك الآن!' : 'Smart Queue - تم تأكيد الموعد'}</h2>
      <p>${type === 'warning3min' ? 'دورك يقترب! ⏳' : type === 'turn_now' ? 'اذهب إلى المكتب الآن!' : 'تفاصيل الموعد:'}</p>
      <p>مرحباً ${data.firstName}،</p>
      ${type === 'warning3min' ? `
      <div class="alert-box-ar">
        <p>تبقى تقريباً 3 دقائق</p>
      </div>` : type === 'turn_now' ? `
      <div class="alert-box-ar" style="background: #d1fae5; border-right-color: #10b981;">
        <p style="color: #065f46;">دورك الآن! اذهب إلى المكتب!</p>
      </div>` : ''}
      <ul>
        <li><strong>رقم التذكرة:</strong> ${data.ticketNumber ? '#' + data.ticketNumber : ''}</li>
        ${data.waitTime ? `<li><strong>وقت الانتظار المتوقع:</strong> ${data.waitTime} دقيقة</li>` : ''}
        ${data.priority ? `<li><strong>الأولوية:</strong> أولوية ولي الأمر (الأعلى)</li>` : ''}
        ${data.position ? `<li><strong>موقعك في الطابور:</strong> ${data.position}</li>` : ''}
        ${data.staffName ? `<li><strong>الموظف:</strong> ${data.staffName}</li>` : ''}
        ${data.location ? `<li><strong>الموقع:</strong> ${data.location}</li>` : ''}
      </ul>
      ${type === 'turn_now' ? `<p><strong>يرجى التوجه إلى المكتب فوراً! الموظف في انتظارك.</strong></p>` : type === 'confirmation' ? `<p>سيتم إعلامك عند اقتراب دورك.</p>` : `<p>يرجى التوجه إلى المكتب الآن للتأكد من عدم تفويت دورك.</p>`}
      <p class="footer">إشعار آلي من نظام Smart Queue.</p>
    </div>
  </div>
</body>
</html>`;
};

// Email helper using existing axios approach (no new dependencies)
const sendEmail = async (to, subject, htmlBody, lang = 'en') => {
  try {
    // Encode Arabic subject with Base64 to prevent garbled text
    const encodedSubject = lang === 'ar' 
      ? `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=` 
      : subject;

    await axios.post('http://localhost:5000/api/send-email', {
      to,
      subject: encodedSubject,
      body: htmlBody,
      type: 'notification',
      lang
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};

// Track sent warnings in-memory to prevent duplicates per appointment
const sentWarnings = new Set();

// ============================================
// NEW: WhatsApp helper using UltraMsg
// ============================================
const sendWhatsApp = async (to, message) => {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('❌ UltraMsg not configured. ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN missing.');
    return { success: false, error: 'UltraMsg not configured' };
  }

  // Format phone number
  let formattedPhone = to;
  if (!formattedPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  // Remove spaces, dashes, parentheses
  formattedPhone = formattedPhone.replace(/[\s\-()]/g, '');

  // If starts with 0, replace with +966 (Saudi)
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+966' + formattedPhone.substring(1);
  }
  // If no + prefix, add it
  else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }
  // If already starts with +, keep as-is (handles +961, +966, etc.)

  console.log('📱 WhatsApp formatting:', { original: to, formatted: formattedPhone });

  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', formattedPhone);
  params.append('body', message);
  params.append('priority', '10');  // High priority

  try {
    console.log('📤 Sending WhatsApp to UltraMsg:', { url, to: formattedPhone });
    const response = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000  // 15 second timeout
    });

    console.log('✅ WhatsApp sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (err) {
    console.error('❌ WhatsApp send failed:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    return { success: false, error: err.response?.data || err.message };
  }
};

// Middleware to verify parent token
const verifyParentToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'parent') {
      return res.status(403).json({ error: 'Access denied. Not a parent account.' });
    }
    req.parentId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// ============================================================
// HELPER: Get the single currently serving appointment for a staff
// Only ONE person can be serving at a time
// ============================================================
// HELPER: Recalculate queue positions and dynamic waiting times
// Position: serving person = position 0, first waiting = 1, etc.
// Estimated wait: position * avg_service_time (computed on the fly)
// Updates DB with new positions and estimated_wait_minutes
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

      // Step 1: Get currently serving (only ONE)
      connection.query(
        "SELECT id FROM appointments WHERE staff_id = ? AND status = 'serving' ORDER BY served_at ASC LIMIT 1",
        [staffId],
        (err, servingResults) => {
          if (err) {
            connection.rollback(() => {
              connection.release();
              if (callback) callback(err);
            });
            return;
          }

          const hasServing = servingResults.length > 0;

          // Step 2: Get waiting appointments sorted by priority ASC, created_at ASC
          connection.query(
            `SELECT id, priority, created_at, user_type,
              CASE WHEN user_type = 'student' THEN student_id ELSE parent_id END as user_id
             FROM appointments 
             WHERE staff_id = ? AND status = 'waiting'
             ORDER BY priority ASC, created_at ASC`,
            [staffId],
            (err, waitingAppointments) => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  if (callback) callback(err);
                });
                return;
              }

              // Step 3: Get staff avg_service_time
              connection.query(
                'SELECT avg_service_time FROM staff WHERE id = ?',
                [staffId],
                (err, staffResults) => {
                  if (err) {
                    connection.rollback(() => {
                      connection.release();
                      if (callback) callback(err);
                    });
                    return;
                  }

                  const avgServiceTime = staffResults[0]?.avg_service_time || 5;

                  if (waitingAppointments.length === 0) {
                    connection.commit((err) => {
                      connection.release();
                      if (callback) callback(err);
                    });
                    return;
                  }

                  let updateQueries = 0;
                  let completedQueries = 0;
                  let updateError = null;

                  const checkComplete = () => {
                    completedQueries++;
                    if (completedQueries === updateQueries) {
                      if (updateError) {
                        connection.rollback(() => {
                          connection.release();
                          if (callback) callback(updateError);
                        });
                      } else {
                        connection.commit((err) => {
                          connection.release();
                          if (callback) callback(err);
                        });
                      }
                    }
                  };

                  waitingAppointments.forEach((appt, index) => {
                    // Position: if someone serving, first waiting = 2, else = 1
                    const position = hasServing ? index + 2 : index + 1;
                    // Estimated wait: position * avg_service_time minutes (min 5 min for position 1)
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
                    connection.commit((err) => {
                      connection.release();
                      if (callback) callback(err);
                    });
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
    `SELECT a.id, a.user_type, a.student_id, a.parent_id, a.estimated_wait_minutes,
      CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as contact,
      CASE WHEN a.user_type = 'student' THEN s.phone ELSE p.contact_value END as phone
     FROM appointments a
     LEFT JOIN students s ON a.student_id = s.id
     LEFT JOIN parents p ON a.parent_id = p.id
     WHERE a.staff_id = ? AND a.status = 'waiting' AND a.id != ?`,
    [staffId, excludeAppointmentId || 0],
    (err, affectedUsers) => {
      if (err) {
        console.error('Priority update notification error:', err);
        return;
      }

      affectedUsers.forEach(user => {
        const recipientId = user.user_type === 'student' ? user.student_id : user.parent_id;
        // BILINGUAL: English + Arabic
        const message = `Queue updated / تم تحديث الطابور:
Your estimated wait time is now ${user.estimated_wait_minutes} minutes due to priority queue changes.
وقت الانتظار المتوقع الآن ${user.estimated_wait_minutes} دقيقة بسبب تغييرات الأولوية.`;

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

// GET /api/parent/profile - Get parent profile
router.get('/profile', verifyParentToken, (req, res) => {
  db.query(
    'SELECT id, first_name, last_name, contact_method, contact_value, language, is_active, created_at FROM parents WHERE id = ?',
    [req.parentId],
    (err, results) => {
      if (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Parent not found' });
      }
      res.json(results[0]);
    }
  );
});

// PUT /api/parent/profile - Update parent profile
router.put('/profile', verifyParentToken, (req, res) => {
  const { first_name, last_name, contact_method, contact_value, language } = req.body;

  db.query(
    'UPDATE parents SET first_name = ?, last_name = ?, contact_method = ?, contact_value = ?, language = ? WHERE id = ?',
    [first_name, last_name, contact_method, contact_value, language, req.parentId],
    (err, result) => {
      if (err) {
        console.error('Profile update error:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      res.json({ success: true, message: 'Profile updated successfully' });
    }
  );
});

// GET /api/parent/issue-types - Get all issue types
router.get('/issue-types', (req, res) => {
  db.query(
    'SELECT id, name, name_ar, description, color, icon FROM issue_types ORDER BY id',
    (err, results) => {
      if (err) {
        console.error('Issue types fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch issue types' });
      }
      res.json(results);
    }
  );
});

// GET /api/parent/available-staff - Get available staff for issue type
// FIXED: Returns LIST of all staff matching the issue type, not just one
// GET /api/parent/available-staff - Get available staff for issue type
// FIXED: Returns LIST of all staff matching the issue type, not just one
router.get('/available-staff', verifyParentToken, (req, res) => {
  const { issueTypeId } = req.query;

  if (!issueTypeId) {
    return res.status(400).json({ error: 'Issue type ID is required' });
  }

  db.query(
    `SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.room_number,
      s.block,
      s.floor,
      s.school,
      s.issue_type_id,
      s.max_queue_limit,
      s.avg_service_time,
      s.is_available,
      s.is_paused,
      it.name as issue_type_name,
      it.color as issue_type_color,
      (SELECT COUNT(*) FROM appointments a 
       WHERE a.staff_id = s.id AND a.status = 'waiting') as current_queue
     FROM staff s
     LEFT JOIN issue_types it ON s.issue_type_id = it.id
     WHERE s.issue_type_id = ? 
       AND s.is_available = 1 
       AND s.is_active = 1 
       AND s.is_paused = 0
     ORDER BY current_queue ASC, s.first_name ASC`,
    [issueTypeId],
    (err, results) => {
      if (err) {
        console.error('Available staff fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch available staff', details: err.message });
      }

      res.json({
        success: true,
        staff: results.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          room_number: s.room_number,
          block: s.block,
          floor: s.floor,
          school: s.school,
          issue_type: s.issue_type_name,
          issue_type_color: s.issue_type_color,
          current_queue: s.current_queue || 0,
          max_queue_limit: s.max_queue_limit || 20,
          avg_service_time: s.avg_service_time || 5,
          is_available: s.is_available === 1,
          is_paused: s.is_paused === 1
        }))
      });
    }
  );
});

// POST /api/parent/appointments - Create new appointment
// PRIORITY: Parent = 1 (highest priority)
router.post('/appointments', verifyParentToken, (req, res) => {
  const { staff_id, issue_type_id, description } = req.body;

  if (!staff_id || !issue_type_id) {
    return res.status(400).json({ error: 'Staff ID and issue type ID are required' });
  }

  // Check if parent already has an active appointment
  db.query(
    "SELECT id, status FROM appointments WHERE parent_id = ? AND status IN ('waiting', 'serving')",
    [req.parentId],
    (err, activeResults) => {
      if (err) {
        console.error('Active appointment check error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (activeResults.length > 0) {
        return res.status(400).json({ 
          error: 'You already have an active appointment. Please wait for it to complete or cancel it first.',
          appointment: activeResults[0]
        });
      }

      // Check staff availability and queue limit
      db.query(
        'SELECT is_available, max_queue_limit, is_paused, avg_service_time FROM staff WHERE id = ? AND is_active = 1',
        [staff_id],
        (err, staffResults) => {
          if (err) {
            console.error('Staff check error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          if (staffResults.length === 0) {
            return res.status(404).json({ error: 'Staff not found' });
          }

          const staff = staffResults[0];
          if (!staff.is_available || staff.is_paused) {
            return res.status(400).json({ error: 'Staff is currently unavailable' });
          }

          // Check current queue count
          db.query(
            "SELECT COUNT(*) as count FROM appointments WHERE staff_id = ? AND status = 'waiting'",
            [staff_id],
            (err, queueResults) => {
              if (err) {
                console.error('Queue check error:', err);
                return res.status(500).json({ error: 'Database error' });
              }

              if (queueResults[0].count >= staff.max_queue_limit) {
                return res.status(400).json({ error: 'Queue is full for this staff member' });
              }

              // Get next ticket number
              db.query(
                'SELECT COALESCE(MAX(ticket_number), 0) + 1 as next_ticket FROM appointments WHERE DATE(created_at) = CURDATE()',
                (err, ticketResults) => {
                  if (err) {
                    console.error('Ticket number error:', err);
                    return res.status(500).json({ error: 'Database error' });
                  }

                  const ticketNumber = ticketResults[0].next_ticket;

                  // PARENT: priority = 1 (highest), is_parent_priority = 1
                  db.query(
                    `INSERT INTO appointments 
                     (ticket_number, user_type, parent_id, staff_id, issue_type_id, description, 
                      status, queue_position, estimated_wait_minutes, priority, is_parent_priority) 
                     VALUES (?, 'parent', ?, ?, ?, ?, 'waiting', 0, 0, 1, 1)`,
                    [ticketNumber, req.parentId, staff_id, issue_type_id, description || ''],
                    (err, insertResult) => {
                      if (err) {
                        console.error('Appointment creation error:', err);
                        return res.status(500).json({ error: 'Failed to create appointment' });
                      }

                      const appointmentId = insertResult.insertId;

                      // Recalculate the entire queue for this staff
                      recalculateQueue(staff_id, (err) => {
                        if (err) {
                          console.error('Queue recalculation error:', err);
                        }

                        // Send priority update notifications to affected students
                        sendPriorityUpdateNotifications(staff_id, appointmentId);

                        // Get the updated position and wait time for this appointment
                        db.query(
                          'SELECT queue_position, estimated_wait_minutes FROM appointments WHERE id = ?',
                          [appointmentId],
                          (err, positionResults) => {
                            const position = positionResults?.[0]?.queue_position || 1;
                            const waitTime = positionResults?.[0]?.estimated_wait_minutes || 0;

                            // Create notification
                            db.query(
                              `INSERT INTO notifications 
                               (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
                               VALUES (?, 'parent', ?, 'in_app', ?, 'confirmation', 1)`,
                              [appointmentId, req.parentId, `✅ Queue Confirmed / تم تأكيد الطابور:
Ticket #${ticketNumber} | Estimated wait: ${waitTime} minutes | Priority: Parent
تذكرة #${ticketNumber} | الوقت المتوقع: ${waitTime} دقيقة | الأولوية: ولي أمر`],
                              (err) => {
                                if (err) console.error('Notification error:', err);
                              }
                            );

                            // Send email notification if parent has email
                            db.query(
                              'SELECT contact_method, contact_value, language, first_name FROM parents WHERE id = ?',
                              [req.parentId],
                              (err, parentResults) => {
                                if (!err && parentResults.length > 0) {
                                  const parent = parentResults[0];
                                  const parentLang = parent.language || 'en';

                                  // Email confirmation
                                  if (parent.contact_method === 'email' || (parent.contact_value && parent.contact_value.includes('@'))) {
                                    const emailData = {
                                      firstName: parent.first_name,
                                      ticketNumber: ticketNumber,
                                      waitTime: waitTime,
                                      priority: true,
                                      position: position
                                    };

                                    const emailBody = buildEmailTemplate(parentLang, 'confirmation', emailData);
                                    const subject = parentLang === 'ar' 
                                      ? `=?UTF-8?B?${Buffer.from('تم تأكيد موعدك - Smart Queue').toString('base64')}?=`
                                      : 'Smart Queue - Appointment Confirmed';

                                    sendEmail(parent.contact_value, subject, emailBody, parentLang);
                                  }

                                  // WhatsApp confirmation via UltraMsg
                                  let phoneTo = null;
                                  if (['phone', 'mobile', 'whatsapp'].includes(parent.contact_method)) {
                                    phoneTo = parent.contact_value;
                                  }
                                  if (!phoneTo && parent.contact_value && /^[+\d]/.test(parent.contact_value)) {
                                    phoneTo = parent.contact_value;
                                  }

                                  if (phoneTo) {
                                    const waMessage = `✅ *Smart Queue - Appointment Confirmed / تم تأكيد الموعد*\n\n*English:*\nHello ${parent.first_name},\nYour appointment has been confirmed! 🎉\n\n*Appointment Details:*\n🎫 Ticket Number: #${ticketNumber}\n⏳ Estimated Wait: ${waitTime} minutes\n⭐ Priority: Parent Priority (Highest)\n📍 Queue Position: ${position}\nYou will be notified when your turn is approaching.\n\n*العربية:*\nمرحباً ${parent.first_name}،\nتم تأكيد موعدك بنجاح! 🎉\n\n*تفاصيل الموعد:*\n🎫 رقم التذكرة: #${ticketNumber}\n⏳ الوقت المتوقع: ${waitTime} دقيقة\n⭐ الأولوية: أولوية ولي الأمر (الأعلى)\n📍 موقعك في الطابور: ${position}\nسيتم إعلامك عند اقتراب دورك.`;

                                    sendWhatsApp(phoneTo, waMessage);
                                  }
                                }
                              }
                            );
                            res.status(201).json({
                              id: appointmentId,
                              ticket_number: ticketNumber,
                              queue_position: position,
                              estimated_wait_minutes: waitTime,
                              status: 'waiting',
                              priority: 1,
                              is_parent_priority: 1,
                              created_at: new Date().toISOString(),
                              message: 'Appointment created successfully with Parent Priority'
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

// GET /api/parent/my-appointments - Get parent's appointments
router.get('/my-appointments', verifyParentToken, (req, res) => {
  db.query(
    `SELECT a.*, 
      it.name as issue_type_name, it.name_ar as issue_type_name_ar,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor,
      a.resolution_note
     FROM appointments a
     JOIN issue_types it ON a.issue_type_id = it.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.parent_id = ?
     ORDER BY a.created_at DESC
     LIMIT 20`,
    [req.parentId],
    (err, results) => {
      if (err) {
        console.error('Appointments fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch appointments' });
      }
      res.json(results);
    }
  );
});

// GET /api/parent/active-appointment - Get parent's active appointment
router.get('/active-appointment', verifyParentToken, (req, res) => {
  db.query(
    `SELECT a.*, 
      it.name as issue_type_name, it.name_ar as issue_type_name_ar,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor,
      a.resolution_note
     FROM appointments a
     JOIN issue_types it ON a.issue_type_id = it.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.parent_id = ? AND a.status IN ('waiting', 'serving')
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [req.parentId],
    (err, results) => {
      if (err) {
        console.error('Active appointment fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch active appointment' });
      }
      if (results.length === 0) {
        return res.json(null);
      }
      res.json(results[0]);
    }
  );
});

// POST /api/parent/appointments/:id/cancel - Cancel appointment
router.post('/appointments/:id/cancel', verifyParentToken, (req, res) => {
  const { id } = req.params;

  const appointmentId = parseInt(id, 10);
  if (isNaN(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ error: 'Invalid appointment ID' });
  }

  db.query(
    "SELECT id, status, staff_id, queue_position FROM appointments WHERE id = ? AND parent_id = ?",
    [appointmentId, req.parentId],
    (err, results) => {
      if (err) {
        console.error('Cancel check error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const appointment = results[0];
      if (appointment.status === 'served' || appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot cancel completed or already cancelled appointment' });
      }

      db.query(
        "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ? AND parent_id = ?",
        [appointmentId, req.parentId],
        (err, updateResult) => {
          if (err) {
            console.error('Cancel error:', err);
            return res.status(500).json({ error: 'Failed to cancel appointment' });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found or already cancelled' });
          }

          // Recalculate queue for this staff (automatic - no manual position updates)
          recalculateQueue(appointment.staff_id, (err) => {
            if (err) console.error('Queue recalculation after cancel error:', err);
          });

          // Send priority update notifications to affected users
          sendPriorityUpdateNotifications(appointment.staff_id, appointmentId);

          // BILINGUAL: English + Arabic cancel notification
          db.query(
            `INSERT INTO notifications 
             (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
             VALUES (?, 'parent', ?, 'in_app', ?, 'cancelled', 1)`,
            [appointmentId, req.parentId, `Your appointment #${appointmentId} has been cancelled / تم إلغاء موعدك #${appointmentId}.`],
            (err) => {
              if (err) console.error('Notification error:', err);
            }
          );

          res.json({ success: true, message: 'Appointment cancelled successfully' });
        }
      );
    }
  );
});

// GET /api/parent/queue-status/:appointmentId - Get queue status for appointment
// DYNAMIC waiting time that:
// 1. Decreases smoothly every second
// 2. Extends by avgTime when queue changes (not resets)
// 3. Persists across refresh using elapsed time
// 4. Sends 3-min warning email to whoever has email
router.get('/queue-status/:appointmentId', verifyParentToken, (req, res) => {
  const { appointmentId } = req.params;

  db.query(
    `SELECT a.*, 
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor,
      s.avg_service_time,
      a.resolution_note,
      TIMESTAMPDIFF(SECOND, a.created_at, NOW()) as elapsed_seconds
     FROM appointments a
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.parent_id = ?`,
    [appointmentId, req.parentId],
    (err, results) => {
      if (err) {
        console.error('Queue status error:', err);
        return res.status(500).json({ error: 'Failed to fetch queue status' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const status = results[0];

      // Get the currently serving appointment (only ONE person can be serving)
      db.query(
        "SELECT id, served_at FROM appointments WHERE staff_id = ? AND status = 'serving' ORDER BY served_at ASC LIMIT 1",
        [status.staff_id],
        (err, servingResults) => {
          if (err) {
            console.error('Serving check error:', err);
          }

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
                console.error('Count error:', err);
                // Fallback
                const fallbackPosition = status.queue_position || 1;
                const avgTime = status.avg_service_time || 5;
                const remainingSeconds = status.status === 'serving' ? 0 : fallbackPosition * avgTime * 60;

                return res.json({
                  id: status.id,
                  ticket_number: status.ticket_number,
                  status: status.status,
                  queue_position: fallbackPosition,
                  people_before: Math.max(0, fallbackPosition - 1),
                  estimated_wait_minutes: status.estimated_wait_minutes,
                  remaining_seconds: remainingSeconds,
                  elapsed_seconds: status.elapsed_seconds || 0,
                  created_at: status.created_at,
                  avg_service_time: avgTime,
                  staff_name: status.staff_name,
                  room: status.room_number,
                  block: status.block,
                  floor: status.floor,
                  priority: status.priority,
                  is_parent_priority: status.is_parent_priority,
                  description: status.description
                });
              }

              const peopleBefore = countResults[0].people_before || 0;
              const avgTime = status.avg_service_time || 5;

              // DYNAMIC WAIT TIME calculation
              // Position: serving person = 0, first waiting = position 1, etc.
              // Wait time = position * avg_service_time minutes
              let dynamicPosition;
              let remainingSeconds;

              if (status.status === 'serving') {
                dynamicPosition = 0;
                remainingSeconds = 0;
              } else {
                // Position includes yourself: 1st waiting = position 1, 2nd = position 2
                // If someone is serving, add 1 more to account for current service
                dynamicPosition = hasServing ? peopleBefore + 2 : peopleBefore + 1;

                // Base remaining time = position * avg service time in seconds
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

              let effectiveStatus = status.status;

              // Count parents before (for display purposes)
              db.query(
                `SELECT COUNT(*) as parents_before
                 FROM appointments 
                 WHERE staff_id = ? AND status = 'waiting' AND priority < ?`,
                [status.staff_id, status.priority],
                (err, parentCountResults) => {
                  const parentsBefore = parentCountResults?.[0]?.parents_before || 0;
                  const studentsBefore = peopleBefore - parentsBefore;

                  res.json({
                    id: status.id,
                    ticket_number: status.ticket_number,
                    status: effectiveStatus,
                    queue_position: dynamicPosition,
                    people_before: Math.max(0, dynamicPosition - 1),
                    parents_before: parentsBefore,
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
                    is_parent_priority: status.is_parent_priority,
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

// POST /api/parent/queue-status/:appointmentId/send-3min-warning
// FIXED: Sends email to whoever has email registered (parent or student)
// FIXED: Prevents duplicate sends for same appointment
// FIXED: If staff is paused, sends modified "staff paused" message instead
router.post('/queue-status/:appointmentId/send-3min-warning', verifyParentToken, (req, res) => {
  const { appointmentId } = req.params;

  // Prevent duplicate sends for same appointment
  if (sentWarnings.has(String(appointmentId))) {
    return res.json({
      success: true,
      sent: false,
      message: '3-minute warning already sent for this appointment'
    });
  }

  db.query(
    `SELECT a.*, p.contact_method, p.contact_value, p.first_name, p.language,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor, s.is_paused as staff_is_paused
     FROM appointments a
     JOIN parents p ON a.parent_id = p.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.parent_id = ? AND a.status = 'waiting'`,
    [appointmentId, req.parentId],
    async (err, results) => {
      if (err) {
        console.error('3min warning check error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not in waiting status' });
      }

      const appt = results[0];
      const isStaffPaused = appt.staff_is_paused === 1;

      // FIXED: Determine email to use - parents table has no email column, only contact_method + contact_value
      let emailTo = null;
      if (appt.contact_method === 'email' && appt.contact_value && appt.contact_value.includes('@')) {
        emailTo = appt.contact_value;
      }
      // Also check if contact_value looks like an email even if method isn't 'email'
      if (!emailTo && appt.contact_value && appt.contact_value.includes('@')) {
        emailTo = appt.contact_value;
      }

      if (!emailTo) {
        return res.json({ 
          success: true, 
          sent: false, 
          message: 'No email on file for this user' 
        });
      }

      let emailBody, subject, notifMessage;
      const lang = appt.language || 'en';
      const isAr = lang === 'ar';

      if (isStaffPaused) {
        // Staff is paused — send modified bilingual message
        subject = isAr
          ? `=?UTF-8?B?${Buffer.from('⏰ دورك يقترب لكن الموظف متوقف - Smart Queue').toString('base64')}?=`
          : '⏰ Smart Queue - Your Turn Approaching but Staff Paused';

        emailBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .section-en { direction: ltr; text-align: left; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .section-ar { direction: rtl; text-align: right; }
    h2 { color: #f59e0b; margin-top: 0; }
    .box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    .box-ar { background: #fef3c7; border-right: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    .footer { color: #64748b; font-size: 12px; margin-top: 30px; }
    .lang-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="section-en">
      <div class="lang-label">English</div>
      <h2>⏰ Your Turn is Approaching</h2>
      <p>Hello ${appt.first_name},</p>
      <div class="box">
        <p><strong>Your turn is approaching, but the staff member is temporarily paused.</strong></p>
        <p>Please wait — you will be notified when service resumes.</p>
      </div>
      <p class="footer">Automated notification from Smart Queue System.</p>
    </div>
    <div class="section-ar">
      <div class="lang-label">العربية</div>
      <h2>⏰ دورك يقترب</h2>
      <p>مرحباً ${appt.first_name}،</p>
      <div class="box-ar">
        <p><strong>دورك يقترب، لكن الموظف متوقف مؤقتاً.</strong></p>
        <p>يرجى الانتظار — سيتم إعلامك عند استئناف الخدمة.</p>
      </div>
      <p class="footer">إشعار آلي من نظام Smart Queue.</p>
    </div>
  </div>
</body>
</html>`;

        notifMessage = `⏰ 3-Minute Warning / تنبيه 3 دقائق:
Your turn is approaching, but the staff member is temporarily paused. Please wait — you will be notified when service resumes.
دورك يقترب، لكن الموظف متوقف مؤقتاً. يرجى الانتظار — سيتم إعلامك عند استئناف الخدمة.`;
      } else {
        // Normal 3-min warning
        const emailData = {
          firstName: appt.first_name,
          ticketNumber: appt.ticket_number,
          staffName: appt.staff_name,
          location: `${appt.block}, ${appt.floor}, Room ${appt.room_number}`
        };

        emailBody = buildEmailTemplate(lang, 'warning3min', emailData);
        subject = isAr
          ? `=?UTF-8?B?${Buffer.from('⏰ دورك قادم خلال 3 دقائق - Smart Queue').toString('base64')}?=`
          : '⏰ Smart Queue - Your Turn in 3 Minutes!';

        notifMessage = `⏰ 3-Minute Warning / تنبيه 3 دقائق:
Your turn is coming up in about 3 minutes! Please be ready.
دورك قادم خلال 3 دقائق! يرجى الاستعداد.`;
      }

      const sent = await sendEmail(emailTo, subject, emailBody, lang);

      // Mark as sent to prevent duplicates
      if (sent) {
        sentWarnings.add(String(appointmentId));
      }

      db.query(
        `INSERT INTO notifications 
         (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
         VALUES (?, 'parent', ?, 'email', ?, '3min_warning', ?)`,
        [appointmentId, req.parentId, notifMessage, sent ? 1 : 0],
        (err) => {
          if (err) console.error('Notification log error:', err);
        }
      );

      res.json({
        success: true,
        sent: sent,
        message: sent ? (isStaffPaused ? '3-minute pause notice sent successfully' : '3-minute warning email sent successfully') : 'Failed to send email'
      });
    }
  );
});


// ============================================
// FIXED: POST /api/parent/queue-status/:appointmentId/send-3min-whatsapp
// Sends WhatsApp message via UltraMsg when ~3 minutes remaining
// Supports both English and Arabic based on parent language
// FIXED: If staff is paused, sends modified "staff paused" message instead
// ============================================
router.post('/queue-status/:appointmentId/send-3min-whatsapp', verifyParentToken, (req, res) => {
  const { appointmentId } = req.params;

  console.log('📥 WhatsApp 3-min warning requested:', { appointmentId, parentId: req.parentId });

  db.query(
    `SELECT a.*, p.contact_method, p.contact_value, p.first_name, p.language,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor, s.is_paused as staff_is_paused
     FROM appointments a
     JOIN parents p ON a.parent_id = p.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.parent_id = ? AND a.status = 'waiting'`,
    [appointmentId, req.parentId],
    async (err, results) => {
      if (err) {
        console.error('❌ 3min WhatsApp DB error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      console.log('📋 DB query results:', { count: results.length });

      if (results.length === 0) {
        console.log('❌ Appointment not found or not waiting');
        return res.status(404).json({ error: 'Appointment not found or not in waiting status' });
      }

      const appt = results[0];
      const isStaffPaused = appt.staff_is_paused === 1;
      console.log('📋 Appointment data:', { 
        id: appt.id, 
        contact_method: appt.contact_method, 
        contact_value: appt.contact_value,
        status: appt.status,
        staff_is_paused: isStaffPaused
      });

      // Check if parent has phone number
      // FIXED: Accept phone, mobile, whatsapp as contact methods
      let phoneTo = null;
      if (['phone', 'mobile', 'whatsapp'].includes(appt.contact_method)) {
        phoneTo = appt.contact_value;
      }

      // Also try contact_value if it looks like a phone number
      if (!phoneTo && appt.contact_value && /^[+\d]/.test(appt.contact_value)) {
        phoneTo = appt.contact_value;
      }

      console.log('📱 Phone extracted:', { phoneTo });

      if (!phoneTo) {
        console.log('❌ No phone number found for parent');
        return res.json({ 
          success: true, 
          sent: false, 
          message: 'No phone number on file for this user',
          debug: { contact_method: appt.contact_method, contact_value: appt.contact_value }
        });
      }

      // WhatsApp message - BILINGUAL (English + Arabic in one message)
      const message = isStaffPaused
        ? `⏰ *Smart Queue Alert / تنبيه Smart Queue*

*English:*
Hello ${appt.first_name},
Your turn is approaching! ⏳
However, the staff member is temporarily paused.
Please wait — you will be notified when service resumes.
Ticket: #${appt.ticket_number}
Staff: ${appt.staff_name}

*العربية:*
مرحباً ${appt.first_name}،
دورك يقترب! ⏳
لكن الموظف متوقف مؤقتاً.
يرجى الانتظار — سيتم إعلامك عند استئناف الخدمة.
رقم التذكرة: #${appt.ticket_number}
الموظف: ${appt.staff_name}`
        : `⏰ *Smart Queue Alert / تنبيه Smart Queue*

*English:*
Hello ${appt.first_name},
Your turn is coming up! ⏳
Approximately 3 minutes remaining.
Ticket: #${appt.ticket_number}
Staff: ${appt.staff_name}
Location: ${appt.block}, ${appt.floor}, Room ${appt.room_number}
Please proceed to the office now.

*العربية:*
مرحباً ${appt.first_name}،
دورك قادم! ⏳
تبقى تقريباً 3 دقائق.
رقم التذكرة: #${appt.ticket_number}
الموظف: ${appt.staff_name}
الموقع: ${appt.block}, ${appt.floor}, Room ${appt.room_number}
يرجى التوجه إلى المكتب الآن.`;

      console.log('📤 Sending WhatsApp message...');
      const waResult = await sendWhatsApp(phoneTo, message);
      console.log('📤 WhatsApp result:', waResult);

      if (waResult.success) {
        // Log notification in database
        const notifMsg = isStaffPaused
          ? `⏰ 3-Minute Warning / تنبيه 3 دقائق:
Your turn is approaching, but the staff member is temporarily paused. Please wait — you will be notified when service resumes.
دورك يقترب، لكن الموظف متوقف مؤقتاً. يرجى الانتظار — سيتم إعلامك عند استئناف الخدمة.`
          : `⏰ 3-Minute Warning / تنبيه 3 دقائق:
Your turn is coming up in about 3 minutes! Please be ready.
دورك قادم خلال 3 دقائق! يرجى الاستعداد.`;

        db.query(
          `INSERT INTO notifications 
           (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
           VALUES (?, 'parent', ?, 'whatsapp', ?, '3min_warning', 1)`,
          [appointmentId, req.parentId, notifMsg],
          (err) => {
            if (err) console.error('Notification log error:', err);
          }
        );

        return res.json({
          success: true,
          sent: true,
          message: isStaffPaused ? '3-minute pause notice sent via WhatsApp' : '3-minute WhatsApp warning sent successfully',
          phone: phoneTo,
          ultraMsgResponse: waResult.data
        });
      } else {
        return res.json({
          success: false,
          sent: false,
          message: 'Failed to send WhatsApp',
          error: waResult.error,
          debug: { phoneTo }
        });
      }
    }
  );
});

// GET /api/parent/notifications - Get parent notifications
router.get('/notifications', verifyParentToken, (req, res) => {
  db.query(
    `SELECT n.*, a.ticket_number
     FROM notifications n
     LEFT JOIN appointments a ON n.appointment_id = a.id
     WHERE n.recipient_type = 'parent' AND n.recipient_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.parentId],
    (err, results) => {
      if (err) {
        console.error('Notifications fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }
      res.json(results);
    }
  );
});

// PUT /api/parent/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', verifyParentToken, (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND recipient_id = ? AND recipient_type = "parent"',
    [id, req.parentId],
    (err, result) => {
      if (err) {
        console.error('Notification update error:', err);
        return res.status(500).json({ error: 'Failed to update notification' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/parent/queue-status/:appointmentId/send-turn-now
router.post('/queue-status/:appointmentId/send-turn-now', verifyParentToken, (req, res) => {
  const { appointmentId } = req.params;

  db.query(
    `SELECT a.*, p.contact_method, p.contact_value, p.first_name, p.language,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor
     FROM appointments a
     JOIN parents p ON a.parent_id = p.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.parent_id = ? AND a.status = 'serving'`,
    [appointmentId, req.parentId],
    async (err, results) => {
      if (err) {
        console.error('Turn now email error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not being served' });
      }

      const appt = results[0];

      let emailTo = null;
      if (appt.contact_method === 'email' || (appt.contact_value && appt.contact_value.includes('@'))) {
        emailTo = appt.contact_value;
      }

      if (!emailTo) {
        return res.json({ success: true, sent: false, message: 'No email on file' });
      }

      const emailData = {
        firstName: appt.first_name,
        ticketNumber: appt.ticket_number,
        staffName: appt.staff_name,
        location: `${appt.block}, ${appt.floor}, Room ${appt.room_number}`
      };

      const emailBody = buildEmailTemplate(appt.language || 'en', 'turn_now', emailData);
      const subject = (appt.language || 'en') === 'ar'
        ? `=?UTF-8?B?${Buffer.from('🎉 دورك الآن! - Smart Queue').toString('base64')}?=`
        : "🎉 It's Your Turn Now! - Smart Queue";

      const sent = await sendEmail(emailTo, subject, emailBody, appt.language || 'en');

      // Log in-app notification
      db.query(
        `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) VALUES (?, 'parent', ?, 'in_app', ?, 'turn_now', 1)`,
        [appointmentId, req.parentId, `🎉 It's Your Turn Now! / دورك الآن!\nPlease go to the office! / اذهب إلى المكتب الآن!\nTicket: #${appt.ticket_number}`],
        (err) => { if (err) console.error('Turn now notification error:', err); }
      );

      res.json({ success: true, sent, message: sent ? 'Turn now email sent' : 'Failed to send' });
    }
  );
});

// POST /api/parent/queue-status/:appointmentId/send-turn-now-whatsapp
router.post('/queue-status/:appointmentId/send-turn-now-whatsapp', verifyParentToken, (req, res) => {
  const { appointmentId } = req.params;

  db.query(
    `SELECT a.*, p.contact_method, p.contact_value, p.first_name, p.language,
      CONCAT(s.first_name, ' ', s.last_name) as staff_name,
      s.room_number, s.block, s.floor
     FROM appointments a
     JOIN parents p ON a.parent_id = p.id
     JOIN staff s ON a.staff_id = s.id
     WHERE a.id = ? AND a.parent_id = ? AND a.status = 'serving'`,
    [appointmentId, req.parentId],
    async (err, results) => {
      if (err) {
        console.error('Turn now WhatsApp error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not being served' });
      }

      const appt = results[0];

      let phoneTo = null;
      if (['phone', 'mobile', 'whatsapp'].includes(appt.contact_method)) {
        phoneTo = appt.contact_value;
      }
      if (!phoneTo && appt.contact_value && /^[+\d]/.test(appt.contact_value)) {
        phoneTo = appt.contact_value;
      }

      if (!phoneTo) {
        return res.json({ success: true, sent: false, message: 'No phone on file' });
      }

      const message = `🎉 *It's Your Turn Now / دورك الآن!*

*English:*
Hello ${appt.first_name},
*Please go to the office now!*
🎫 Ticket: #${appt.ticket_number}
👤 Staff: ${appt.staff_name}
📍 Location: ${appt.block}, ${appt.floor}, Room ${appt.room_number}

*العربية:*
مرحباً ${appt.first_name}،
*اذهب إلى المكتب الآن!*
🎫 التذكرة: #${appt.ticket_number}
👤 الموظف: ${appt.staff_name}
📍 الموقع: ${appt.block}, ${appt.floor}, Room ${appt.room_number}`;

      const waResult = await sendWhatsApp(phoneTo, message);

      if (waResult.success) {
        db.query(
          `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) VALUES (?, 'parent', ?, 'whatsapp', ?, 'turn_now', 1)`,
          [appointmentId, req.parentId, `🎉 It's Your Turn Now! / دورك الآن!\nTicket: #${appt.ticket_number}`],
          (err) => { if (err) console.error('Turn now WA log error:', err); }
        );
      }

      res.json({ success: waResult.success, sent: waResult.success, message: waResult.success ? 'Sent' : 'Failed', error: waResult.error });
    }
  );
});

// PUT /api/parent/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', verifyParentToken, (req, res) => {
  db.query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE recipient_type = "parent" AND recipient_id = ? AND is_read = 0',
    [req.parentId],
    (err, result) => {
      if (err) {
        console.error('Mark all read error:', err);
        return res.status(500).json({ error: 'Failed to mark all as read' });
      }
      res.json({ success: true, count: result.affectedRows });
    }
  );
});

// GET /api/parent/stats - Get parent statistics
router.get('/stats', verifyParentToken, (req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as total_visits,
      SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as completed,
      AVG(CASE WHEN status = 'served' THEN estimated_wait_minutes END) as avg_wait
     FROM appointments
     WHERE parent_id = ?`,
    [req.parentId],
    (err, results) => {
      if (err) {
        console.error('Stats error:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }

      const stats = results[0] || { total_visits: 0, completed: 0, avg_wait: 0 };
      res.json({
        total_visits: stats.total_visits || 0,
        completed: stats.completed || 0,
        avg_wait: Math.round(stats.avg_wait || 0)
      });
    }
  );
});

module.exports = router;