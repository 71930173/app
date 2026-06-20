const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const axios = require('axios'); // ADDED for UltraMsg

// ============================================
// NEW: Helper functions for sending turn notifications
// Sends email or WhatsApp based on user's preference
// ============================================

// Send email via the existing API endpoint
const sendEmailNotification = async (to, subject, htmlBody) => {
  try {
    await axios.post('http://localhost:5000/api/send-email', {
      to,
      subject,
      body: htmlBody,
      type: 'turn_now',
      lang: 'ar'
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};

// Send WhatsApp via UltraMsg
const sendWhatsAppNotification = async (to, message) => {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('UltraMsg not configured');
    return { success: false, error: 'UltraMsg not configured' };
  }

  let formattedPhone = to;
  if (!formattedPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+966' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  const url = 'https://api.ultramsg.com/' + instanceId + '/messages/chat';
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', formattedPhone);
  params.append('body', message);
  params.append('priority', '10');

  try {
    const response = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    return { success: true, data: response.data };
  } catch (err) {
    console.error('WhatsApp send failed:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
};

// Build BILINGUAL email template for "Your turn now"
const buildTurnNowEmail = (data) => {
  return '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<style>' +
    'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, Arial, sans-serif; line-height: 1.6; color: #333; }' +
    '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
    '.section-en { direction: ltr; text-align: left; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }' +
    '.section-ar { direction: rtl; text-align: right; }' +
    'h2 { color: #059669; margin-top: 0; }' +
    '.alert-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; }' +
    '.alert-box-ar { background: #d1fae5; border-right: 4px solid #10b981; padding: 16px; margin: 20px 0; }' +
    '.alert-box p, .alert-box-ar p { margin: 0; font-weight: bold; color: #065f46; font-size: 18px; }' +
    'ul { list-style: none; padding: 0; }' +
    'li { margin: 8px 0; }' +
    '.footer { color: #64748b; font-size: 12px; margin-top: 30px; }' +
    '.lang-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }' +
    '</style></head>' +
    '<body>' +
    '<div class="container">' +
    // English Section
    '<div class="section-en">' +
    '<div class="lang-label">English</div>' +
    '<h2>🎉 It is Your Turn Now!</h2>' +
    '<p>Hello ' + data.firstName + ',</p>' +
    '<div class="alert-box"><p>Please go to the office now, the Dr. is waiting for you!</p></div>' +
    '<ul>' +
    '<li><strong>Ticket Number:</strong> #' + data.ticketNumber + '</li>' +
    (data.staffName ? '<li><strong>Dr.:</strong> ' + data.staffName + '</li>' : '') +
    (data.location ? '<li><strong>Location:</strong> ' + data.location + '</li>' : '') +
    '</ul>' +
    '<p>Please proceed to the office immediately.</p>' +
    '<p class="footer">Automated notification from Dawri System.</p>' +
    '</div>' +
    // Arabic Section
    '<div class="section-ar">' +
    '<div class="lang-label">العربية</div>' +
    '<h2>🎉 دورك الآن!</h2>' +
    '<p>مرحباً ' + data.firstName + '،</p>' +
    '<div class="alert-box-ar"><p>اذهب إلى المكتب الآن، Dr. في انتظارك!</p></div>' +
    '<ul>' +
    '<li><strong>رقم التذكرة:</strong> #' + data.ticketNumber + '</li>' +
    (data.staffName ? '<li><strong>Dr.:</strong> ' + data.staffName + '</li>' : '') +
    (data.location ? '<li><strong>الموقع:</strong> ' + data.location + '</li>' : '') +
    '</ul>' +
    '<p>يرجى التوجه إلى المكتب فوراً.</p>' +
    '<p class="footer">إشعار آلي من نظام Dawri.</p>' +
    '</div>' +
    '</div></body></html>';
};

// Send turn notification to user (email or WhatsApp based on contact_method)
const sendTurnNotification = async (userType, userId, contactMethod, contactValue, firstName, ticketNumber, staffName, location) => {
  const emailTo = (contactMethod === 'email' || (contactValue && contactValue.includes('@'))) ? contactValue : null;
  const phoneTo = (['phone', 'mobile', 'whatsapp'].includes(contactMethod) || (contactValue && /^[\+\d]/.test(contactValue))) ? contactValue : null;

  let emailSent = false;
  let whatsappSent = false;

  if (emailTo) {
    const emailData = { firstName, ticketNumber, staffName, location };
    const emailBody = buildTurnNowEmail(emailData);
    // Bilingual subject
    const subject = '=?UTF-8?B?' + Buffer.from('🎉 It is Your Turn Now / دورك الآن! - Go to the Office / اذهب إلى المكتب').toString('base64') + '?=';
    emailSent = await sendEmailNotification(emailTo, subject, emailBody);
  }

  if (phoneTo) {
    // Bilingual WhatsApp message
    const waMessage = '🎉 *It is Your Turn Now / دورك الآن!*\n\n' +
      '*English:*\n' +
      'Hello ' + firstName + ',\n\n' +
      '*Please go to the office now, the Dr. is waiting for you!*\n\n' +
      '🎫 Ticket Number: #' + ticketNumber + '\n' +
      (staffName ? '👨‍🏫 Dr. : ' + staffName + '\n' : '') +
      (location ? '📍 Location: ' + location + '\n' : '') +
      '\nPlease proceed to the office immediately.\n\n' +
      '---\n\n' +
      '*العربية:*\n' +
      'مرحباً ' + firstName + '،\n\n' +
      '*اذهب إلى المكتب الآن، Dr. في انتظارك!*\n\n' +
      '🎫 رقم التذكرة: #' + ticketNumber + '\n' +
      (staffName ? '👨‍🏫 Dr. : ' + staffName + '\n' : '') +
      (location ? '📍 الموقع: ' + location + '\n' : '') +
      '\nيرجى التوجه إلى المكتب فوراً.\n\n' +
      'Thank you! / شكراً!';
    const waResult = await sendWhatsAppNotification(phoneTo, waMessage);
    whatsappSent = waResult.success;
  }

  return { emailSent, whatsappSent };
};


// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateStaff = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const jwt = require('jsonwebtoken');
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'staff') {
      return res.status(403).json({ error: 'Staff access required' });
    }
    req.staffId = decoded.id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================================
// HELPER: Recalculate queue positions and dynamic waiting times
// Position: serving person = position 0, first waiting = 1, etc.
// Estimated wait: position * avg_service_time (computed on the fly)
// Only ONE person can be serving at a time
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
              CASE WHEN user_type = 'student' THEN student_id ELSE guest_id END as user_id
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
                    // Estimated wait: (position - 1) * avg_service_time minutes
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

// ==================== GET MY QUEUE ====================
// Automatically sorted by priority ASC, created_at ASC
// Serving person shown first, then waiting by priority
router.get('/my-queue', authenticateStaff, (req, res) => {
  const staffId = req.staffId;

  db.query(
    `SELECT 
      a.id,
      a.ticket_number,
      a.user_type,
      a.student_id,
      a.guest_id,
      a.status,
      a.queue_position,
      a.estimated_wait_minutes,
      a.priority,
      a.is_guest_priority,
      a.description,
      a.created_at,
      CASE 
        WHEN a.user_type = 'student' THEN s.first_name
        ELSE p.first_name
      END as user_first_name,
      CASE 
        WHEN a.user_type = 'student' THEN s.last_name
        ELSE p.last_name
      END as user_last_name,
      CASE 
        WHEN a.user_type = 'student' THEN s.email
        ELSE p.contact_value
      END as user_contact,
      it.name as issue_type_name,
      it.color as issue_type_color,
      st.is_available as staff_is_available,
      st.is_paused as staff_is_paused,
      st.current_serving,
      TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) as waiting_minutes
     FROM appointments a
     LEFT JOIN students s ON a.student_id = s.id
     LEFT JOIN guests p ON a.guest_id = p.id
     LEFT JOIN issue_types it ON a.issue_type_id = it.id
     JOIN staff st ON a.staff_id = st.id
     WHERE a.staff_id = ? AND a.status IN ('waiting', 'serving')
     ORDER BY 
       CASE WHEN a.status = 'serving' THEN 0 ELSE 1 END,
       a.priority ASC, 
       a.created_at ASC`,
    [staffId],
    (err, results) => {
      if (err) {
        console.error('Queue fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch queue', details: err.message });
      }

      const waiting = results.filter(r => r.status === 'waiting');
      const serving = results.filter(r => r.status === 'serving');

      // Ensure only ONE serving appointment
      const activeServing = serving.length > 0 ? [serving[0]] : [];

      res.json({
        success: true,
        staff_id: staffId,
        total_waiting: waiting.length,
        total_serving: activeServing.length,
        guest_priority_count: waiting.filter(w => w.priority === 1).length,
        student_count: waiting.filter(w => w.priority === 2).length,
        queue: [...activeServing, ...waiting]
      });
    }
  );
});

// ==================== SERVE NEXT ====================
// Automatically serves the next person based on priority ASC, created_at ASC
// No manual selection needed - fully automatic
// Only ONE person can be serving at a time
router.post('/serve-next', authenticateStaff, async (req, res) => {
  const staffId = req.staffId;

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Connection error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Transaction failed' });
      }

      try {
        // 1. Mark current serving as served and record completion time
        await new Promise((resolve, reject) => {
          connection.query(
            `UPDATE appointments 
             SET status = 'served', 
                 completed_at = NOW(),
                 actual_service_minutes = TIMESTAMPDIFF(MINUTE, served_at, NOW())
             WHERE staff_id = ? AND status = 'serving'`,
            [staffId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 2. Get next appointment automatically using priority ASC, created_at ASC
        const nextResults = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT a.*, 
              CASE WHEN a.user_type = 'student' THEN s.first_name ELSE p.first_name END as first_name,
              CASE WHEN a.user_type = 'student' THEN s.last_name ELSE p.last_name END as last_name,
              CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as contact_value,
              CASE WHEN a.user_type = 'student' THEN 'email' ELSE p.contact_method END as contact_method
             FROM appointments a
             LEFT JOIN students s ON a.student_id = s.id
             LEFT JOIN guests p ON a.guest_id = p.id
             WHERE a.staff_id = ? AND a.status = 'waiting' 
             ORDER BY a.priority ASC, a.created_at ASC
             LIMIT 1 FOR UPDATE`,
            [staffId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        if (nextResults.length === 0) {
          await new Promise((resolve) => connection.commit(resolve));
          connection.release();
          return res.status(404).json({ 
            success: false,
            error: 'No one in queue',
            message: 'The queue is currently empty'
          });
        }

        const appointment = nextResults[0];

        // 3. Mark next as serving and set served_at
        await new Promise((resolve, reject) => {
          connection.query(
            'UPDATE appointments SET status = "serving", served_at = NOW() WHERE id = ?',
            [appointment.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 4. Recalculate queue positions for remaining waiting (automatic)
        await new Promise((resolve, reject) => {
          connection.query(
            `SET @pos := 0;`,
            (err) => {
              if (err) reject(err);
              else {
                connection.query(
                  `UPDATE appointments 
                   SET queue_position = (@pos := @pos + 1),
                       estimated_wait_minutes = @pos * (SELECT avg_service_time FROM staff WHERE id = ?)
                   WHERE staff_id = ? AND status = 'waiting'
                   ORDER BY priority ASC, created_at ASC`,
                  [staffId, staffId],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              }
            }
          );
        });

        // 5. Update staff current_serving
        await new Promise((resolve, reject) => {
          connection.query(
            'UPDATE staff SET current_serving = ?, total_served_today = total_served_today + 1 WHERE id = ?',
            [appointment.id, staffId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 6. Update daily stats
        const today = new Date().toISOString().split('T')[0];
        const userType = appointment.user_type;

        await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO daily_stats (staff_id, stat_date, ${userType}s_served, total_served) 
             VALUES (?, ?, 1, 1)
             ON DUPLICATE KEY UPDATE 
             ${userType}s_served = ${userType}s_served + 1,
             total_served = total_served + 1`,
            [staffId, today],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 7. Create in-app notification
        await new Promise((resolve, reject) => {
          const recipientId = appointment.user_type === 'student' ? appointment.student_id : appointment.guest_id;
          const message = '🎉 It is Your Turn Now! / دورك الآن!\n\n' +
            'English: Please go to the office now, the Dr. is waiting for you!\n' +
            'العربية: اذهب إلى المكتب الآن، Dr. في انتظارك!\n\n' +
            'Ticket Number / رقم التذكرة: #' + appointment.ticket_number;

          connection.query(
            `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type) 
             VALUES (?, ?, ?, 'in_app', ?, 'turn_now')`,
            [appointment.id, appointment.user_type, recipientId, message],
            (err) => {
              if (err) console.error('Notification error:', err);
              resolve();
            }
          );
        });

        // 8. Send Email or WhatsApp notification (outside transaction)
        try {
          const staffInfo = await new Promise((resolve, reject) => {
            connection.query(
              'SELECT first_name, last_name, room_number, block, floor FROM staff WHERE id = ?',
              [staffId],
              (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || {});
              }
            );
          });

          const location = staffInfo.room_number ? (staffInfo.block || '') + ', ' + (staffInfo.floor || '') + ', Room ' + staffInfo.room_number : '';
          const staffName = staffInfo.first_name ? staffInfo.first_name + ' ' + (staffInfo.last_name || '') : '';

          await sendTurnNotification(
            appointment.user_type,
            appointment.user_type === 'student' ? appointment.student_id : appointment.guest_id,
            appointment.contact_method,
            appointment.contact_value,
            appointment.first_name,
            appointment.ticket_number,
            staffName,
            location
          );
        } catch (notifyErr) {
          console.error('Turn notification send error (non-critical):', notifyErr.message);
        }

        await new Promise((resolve) => connection.commit(resolve));
        connection.release();

        res.json({ 
          success: true,
          message: 'Serving next', 
          appointment: {
            id: appointment.id,
            ticket_number: appointment.ticket_number,
            user_type: appointment.user_type,
            user_name: `${appointment.first_name} ${appointment.last_name}`,
            status: 'serving',
            queue_position: 0,
            served_at: new Date().toISOString()
          }
        });

      } catch (error) {
        await new Promise((resolve) => connection.rollback(resolve));
        connection.release();
        console.error('Serve next error:', error);
        res.status(500).json({ error: 'Failed to serve next', details: error.message });
      }
    });
  });
});

// ==================== SERVE SPECIFIC APPOINTMENT ====================
// NOTE: This still exists but is not the primary flow. 
// The serve-next endpoint handles automatic serving.
// Only ONE person can be serving at a time.
router.post('/serve/:appointmentId', authenticateStaff, (req, res) => {
  const { appointmentId } = req.params;
  const staffId = req.staffId;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Database connection failed' });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Transaction failed' });
      }

      // First, mark any current serving as served
      connection.query(
        `UPDATE appointments SET status = 'served', completed_at = NOW() 
         WHERE staff_id = ? AND status = 'serving'`,
        [staffId],
        (err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ error: err.message });
          }

          // Then mark selected as serving
          connection.query(
            'UPDATE appointments SET status = "serving", served_at = NOW() WHERE id = ? AND staff_id = ? AND status = "waiting"',
            [appointmentId, staffId],
            (err, updateResult) => {
              if (err) {
                connection.rollback(() => connection.release());
                return res.status(500).json({ error: err.message });
              }

              if (updateResult.affectedRows === 0) {
                connection.rollback(() => connection.release());
                return res.status(404).json({ error: 'Appointment not found or not in waiting status' });
              }

              // Recalculate remaining queue automatically
              connection.query(
                `SET @pos := 0;`,
                (err) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return res.status(500).json({ error: err.message });
                  }

                  connection.query(
                    `UPDATE appointments 
                     SET queue_position = (@pos := @pos + 1),
                         estimated_wait_minutes = @pos * (SELECT avg_service_time FROM staff WHERE id = ?)
                     WHERE staff_id = ? AND status = 'waiting'
                     ORDER BY priority ASC, created_at ASC`,
                    [staffId, staffId],
                    (err) => {
                      if (err) {
                        connection.rollback(() => connection.release());
                        return res.status(500).json({ error: err.message });
                      }

                      // Update staff
                      connection.query(
                        'UPDATE staff SET current_serving = ? WHERE id = ?',
                        [appointmentId, staffId],
                        (err) => {
                          if (err) console.error('Staff update error:', err);

                          // Get appointment details for notification before commit
                          connection.query(
                            `SELECT a.*, 
                              CASE WHEN a.user_type = 'student' THEN s.first_name ELSE p.first_name END as first_name,
                              CASE WHEN a.user_type = 'student' THEN s.last_name ELSE p.last_name END as last_name,
                              CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as contact_value,
                              CASE WHEN a.user_type = 'student' THEN 'email' ELSE p.contact_method END as contact_method
                             FROM appointments a
                             LEFT JOIN students s ON a.student_id = s.id
                             LEFT JOIN guests p ON a.guest_id = p.id
                             WHERE a.id = ?`,
                            [appointmentId],
                            (err, apptResults) => {
                              if (err) console.error('Fetch appointment for notify error:', err);

                              connection.commit((err) => {
                                connection.release();
                                if (err) return res.status(500).json({ error: 'Commit failed' });

                                // Send notification AFTER commit (non-blocking)
                                if (apptResults && apptResults.length > 0) {
                                  const appt = apptResults[0];

                                  db.query(
                                    'SELECT first_name, last_name, room_number, block, floor FROM staff WHERE id = ?',
                                    [staffId],
                                    (err, staffResults) => {
                                      if (err) {
                                        console.error('Staff fetch for notify error:', err);
                                        return;
                                      }
                                      const staffInfo = staffResults[0] || {};
                                      const location = staffInfo.room_number ? (staffInfo.block || '') + ', ' + (staffInfo.floor || '') + ', Room ' + staffInfo.room_number : '';
                                      const staffName = staffInfo.first_name ? staffInfo.first_name + ' ' + (staffInfo.last_name || '') : '';

                                      sendTurnNotification(
                                        appt.user_type,
                                        appt.user_type === 'student' ? appt.student_id : appt.guest_id,
                                        appt.contact_method,
                                        appt.contact_value,
                                        appt.first_name,
                                        appt.ticket_number,
                                        staffName,
                                        location
                                      ).then(result => {
                                        console.log('Turn notification sent:', result);
                                      }).catch(notifyErr => {
                                        console.error('Turn notification failed:', notifyErr.message);
                                      });

                                      // BILINGUAL in-app notification
                                      const recipientId = appt.user_type === 'student' ? appt.student_id : appt.guest_id;
                                      const message = '🎉 It is Your Turn Now! / دورك الآن!\n\n' +
                                        'English: Please go to the office now, the Dr. is waiting for you!\n' +
                                        'العربية: اذهب إلى المكتب الآن، Dr. في انتظارك!\n\n' +
                                        'Ticket Number / رقم التذكرة: #' + appt.ticket_number;
                                      db.query(
                                        `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type) 
                                         VALUES (?, ?, ?, 'in_app', ?, 'turn_now')`,
                                        [appt.id, appt.user_type, recipientId, message],
                                        (err) => { if (err) console.error('In-app notification error:', err); }
                                      );
                                    }
                                  );
                                }

                                res.json({
                                  success: true,
                                  message: 'Now serving ticket #' + appointmentId,
                                  appointment_id: appointmentId
                                });
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
        }
      );
    });
  });
});

// ==================== MARK APPOINTMENT SERVED ====================
router.post('/mark-served/:appointmentId', authenticateStaff, (req, res) => {
  const { appointmentId } = req.params;
  const staffId = req.staffId;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Database connection failed' });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Transaction failed' });
      }

      // Verify ownership and status
      connection.query(
        'SELECT * FROM appointments WHERE id = ? AND staff_id = ? AND status = "serving"',
        [appointmentId, staffId],
        (err, results) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ error: err.message });
          }
          if (results.length === 0) {
            connection.rollback(() => connection.release());
            return res.status(404).json({ error: 'Appointment not found or not currently serving' });
          }

          const appointment = results[0];

          // Mark as served with completion time
          connection.query(
            `UPDATE appointments 
             SET status = 'served', 
                 completed_at = NOW(),
                 actual_service_minutes = TIMESTAMPDIFF(MINUTE, served_at, NOW())
             WHERE id = ?`,
            [appointmentId],
            (err) => {
              if (err) {
                connection.rollback(() => connection.release());
                return res.status(500).json({ error: err.message });
              }

              // Update staff current_serving
              connection.query(
                'UPDATE staff SET current_serving = NULL WHERE id = ?',
                [staffId],
                (err) => {
                  if (err) console.error('Staff update error:', err);
                }
              );

              // Update stats
              const userType = appointment.user_type;
              const today = new Date().toISOString().split('T')[0];

              connection.query(
                `INSERT INTO daily_stats (staff_id, stat_date, ${userType}s_served, total_served, avg_service_time) 
                 VALUES (?, ?, 1, 1, ?)
                 ON DUPLICATE KEY UPDATE 
                 ${userType}s_served = ${userType}s_served + 1,
                 total_served = total_served + 1,
                 avg_service_time = (avg_service_time + VALUES(avg_service_time)) / 2`,
                [staffId, today, appointment.actual_service_minutes || 10],
                (err) => {
                  if (err) console.error('Stats error:', err);
                }
              );

              connection.commit((err) => {
                connection.release();
                if (err) return res.status(500).json({ error: 'Commit failed' });

                res.json({ 
                  success: true,
                  message: 'Appointment marked as served',
                  appointment_id: appointmentId,
                  service_time_minutes: appointment.actual_service_minutes
                });
              });
            }
          );
        }
      );
    });
  });
});

// ==================== CANCEL APPOINTMENT ====================
router.post('/cancel/:appointmentId', authenticateStaff, (req, res) => {
  const { appointmentId } = req.params;
  const staffId = req.staffId;
  const { reason } = req.body;

  db.query(
    'SELECT * FROM appointments WHERE id = ? AND staff_id = ? AND status IN ("waiting", "serving")',
    [appointmentId, staffId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or already completed' });
      }

      const appointment = results[0];
      const recipientId = appointment.user_type === 'student' ? appointment.student_id : appointment.guest_id;

      db.query(
        'UPDATE appointments SET status = "cancelled" WHERE id = ?',
        [appointmentId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Recalculate positions automatically (no manual updates)
          recalculateQueue(staffId, (err) => {
            if (err) console.error('Queue recalculation after cancel error:', err);
          });

          // BILINGUAL: Add notification for cancelled appointment
          const cancelMessage = `Appointment cancelled / تم إلغاء الموعد:
Ticket #${appointment.ticket_number} has been cancelled by staff.
تم إلغاء التذكرة #${appointment.ticket_number} من قبل الموظف.`;
          
          db.query(
            `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent) 
             VALUES (?, ?, ?, 'in_app', ?, 'cancelled', 1)`,
            [appointmentId, appointment.user_type, recipientId, cancelMessage],
            (err) => {
              if (err) console.error('Cancel notification error:', err);
            }
          );

          res.json({ 
            success: true,
            message: 'Appointment cancelled',
            appointment_id: appointmentId,
            reason: reason || 'Cancelled by staff'
          });
        }
      );
    }
  );
});

// ==================== RESOLVE REMOTELY ====================
// ADDED: Marks appointment as resolved without visit, saves note to DB,
// sends notification via guest's preferred channel (email/WhatsApp/SMS)
router.post('/resolve-remotely/:appointmentId', authenticateStaff, (req, res) => {
  const { appointmentId } = req.params;
  const staffId = req.staffId;
  const { resolutionNote } = req.body;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Database connection failed' });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Transaction failed' });
      }

      connection.query(
        `SELECT a.*, 
          CASE WHEN a.user_type = 'student' THEN s.phone ELSE p.contact_value END as user_phone,
          CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as user_email,
          CASE WHEN a.user_type = 'student' THEN p.contact_method ELSE p.contact_method END as contact_method,
          CASE WHEN a.user_type = 'student' THEN p.language ELSE p.language END as user_language,
          CASE WHEN a.user_type = 'student' THEN s.first_name ELSE p.first_name END as user_first_name,
          CASE WHEN a.user_type = 'student' THEN s.last_name ELSE p.last_name END as user_last_name
         FROM appointments a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN guests p ON a.guest_id = p.id
         WHERE a.id = ? AND a.staff_id = ? AND a.status IN ('waiting', 'serving')`,
        [appointmentId, staffId],
        (err, results) => {
          if (err) {
            connection.rollback(() => { connection.release(); });
            return res.status(500).json({ error: err.message });
          }
          if (results.length === 0) {
            connection.rollback(() => { connection.release(); });
            return res.status(404).json({ error: 'Appointment not found or already completed' });
          }

          const appointment = results[0];
          const recipientId = appointment.user_type === 'student' ? appointment.student_id : appointment.guest_id;
          const guestLang = appointment.user_language || 'en';
          const isAr = guestLang === 'ar';

          // 1. Mark as resolved_remotely and SAVE resolution_note to DB
          connection.query(
            `UPDATE appointments 
             SET status = 'resolved_remotely', 
                 completed_at = NOW(),
                 actual_service_minutes = 0,
                 resolution_note = ?
             WHERE id = ?`,
            [resolutionNote || '', appointmentId],
            (err) => {
              if (err) {
                connection.rollback(() => { connection.release(); });
                return res.status(500).json({ error: err.message });
              }

              if (appointment.status === 'serving') {
                connection.query(
                  'UPDATE staff SET current_serving = NULL WHERE id = ?',
                  [staffId],
                  (err) => { if (err) console.error('Staff update error:', err); }
                );
              }

              // 2. Build notification message (with note if provided)
              const noteText = resolutionNote ? `\nNote / ملاحظة: ${resolutionNote}` : '';
              const message = `✅ Issue Resolved Remotely / تم الحل عن بعد:

Your issue (Ticket #${appointment.ticket_number}) has been resolved remotely by our staff. No need to visit the office.

تم حل مشكلتك (تذكرة #${appointment.ticket_number}) عن بعد من قبل موظفنا. لا حاجة لزيارة المكتب.${noteText}`;

              // 3. Save in-app notification
              connection.query(
                `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent, sent_at) 
                 VALUES (?, ?, ?, 'in_app', ?, 'resolved_remotely', 1, NOW())`,
                [appointmentId, appointment.user_type, recipientId, message],
                (err) => { if (err) console.error('Notification insert error:', err); }
              );

              // 4. Determine contact method and send notification
              const contactMethod = appointment.contact_method || 'phone';
              const contactValue = appointment.user_phone || appointment.user_email || '';
              let emailSent = false;
              let whatsappSent = false;

              // EMAIL notification (if contact_method is email or contact_value contains @)
              if (contactMethod === 'email' || (contactValue && contactValue.includes('@'))) {
                const emailTo = contactValue;
                // BILINGUAL subject for both languages
                const emailSubject = isAr 
                  ? `=?UTF-8?B?${Buffer.from('تم حل مشكلتك - Dawri / Your Issue Has Been Resolved').toString('base64')}?=`
                  : 'Dawri - Your Issue Has Been Resolved / تم حل مشكلتك';

                const emailBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .section-en { direction: ltr; text-align: left; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .section-ar { direction: rtl; text-align: right; }
    h2 { color: #16a34a; margin-top: 0; }
    .box { background: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; }
    .box-ar { background: #dcfce7; border-right: 4px solid #22c55e; padding: 16px; margin: 20px 0; }
    .footer { color: #64748b; font-size: 12px; margin-top: 30px; }
    .lang-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="section-en">
      <div class="lang-label">English</div>
      <h2>✅ Your Issue Has Been Resolved</h2>
      <p>Hello ${appointment.user_first_name},</p>
      <div class="box">
        <p><strong>Your issue (Ticket #${appointment.ticket_number}) has been resolved remotely.</strong></p>
        <p>No need to visit the office.</p>
        ${resolutionNote ? `<p><strong>Staff Note:</strong> ${resolutionNote}</p>` : ''}
      </div>
      <p>If you need further assistance, please join the queue again.</p>
      <p class="footer">Automated notification from Dawri System.</p>
    </div>
    <div class="section-ar">
      <div class="lang-label">العربية</div>
      <h2>✅ تم حل مشكلتك</h2>
      <p>مرحباً ${appointment.user_first_name}،</p>
      <div class="box-ar">
        <p><strong>تم حل مشكلتك (تذكرة #${appointment.ticket_number}) عن بعد.</strong></p>
        <p>لا حاجة لزيارة المكتب.</p>
        ${resolutionNote ? `<p><strong>ملاحظة الموظف:</strong> ${resolutionNote}</p>` : ''}
      </div>
      <p>إذا كنت بحاجة إلى مزيد من المساعدة، يرجى الانضمام إلى الطابور مرة أخرى.</p>
      <p class="footer">إشعار آلي من نظام Dawri.</p>
    </div>
  </div>
</body>
</html>`;

                // Send email via existing endpoint
                axios.post('http://localhost:5000/api/send-email', {
                  to: emailTo,
                  subject: emailSubject,
                  body: emailBody,
                  type: 'resolved_remotely',
                  lang: guestLang
                }).then(() => {
                  console.log('✅ Resolution email sent to:', emailTo);
                }).catch(err => {
                  console.error('❌ Resolution email failed:', err.message);
                });
                emailSent = true;
              }

              // WHATSAPP/SMS notification (if contact_method is phone/mobile/whatsapp)
              const { ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN } = process.env;
              if (ULTRAMSG_INSTANCE_ID && ULTRAMSG_TOKEN && appointment.user_phone) {
                const ultraMsgUrl = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
                const whatsappMessage = `✅ *Dawri Update / تحديث Dawri*

*English:*
Hello ${appointment.user_first_name},
Your issue (Ticket #${appointment.ticket_number}) has been resolved remotely by our staff.
You do not need to come to the office.
${resolutionNote ? 'Note: ' + resolutionNote + '\n' : ''}If you need further assistance, please join the queue again.

*العربية:*
مرحباً ${appointment.user_first_name}،
تم حل مشكلتك (تذكرة #${appointment.ticket_number}) عن بعد من قبل موظفنا.
لا حاجة لزيارة المكتب.
${resolutionNote ? 'ملاحظة: ' + resolutionNote + '\n' : ''}إذا كنت بحاجة إلى مزيد من المساعدة، يرجى الانضمام إلى الطابور مرة أخرى.

شكراً! / Thank you!`

                axios.post(ultraMsgUrl, {
                  token: ULTRAMSG_TOKEN,
                  to: appointment.user_phone,
                  body: whatsappMessage
                }).then(() => {
                  console.log('✅ Resolution WhatsApp sent to:', appointment.user_phone);
                  whatsappSent = true;
                }).catch(err => {
                  console.error('❌ Resolution WhatsApp failed:', err.message);
                });
              }

              // 5. Recalculate queue positions
              connection.query(
                `SET @pos := 0;`,
                (err) => {
                  if (err) {
                    connection.commit((err) => {
                      connection.release();
                      res.json({ 
                        success: true,
                        message: 'Appointment resolved remotely',
                        appointment_id: appointmentId,
                        notification_sent: true,
                        email_sent: emailSent,
                        whatsapp_sent: whatsappSent
                      });
                    });
                    return;
                  }

                  connection.query(
                    `UPDATE appointments 
                     SET queue_position = (@pos := @pos + 1),
                         estimated_wait_minutes = @pos * (SELECT avg_service_time FROM staff WHERE id = ?)
                     WHERE staff_id = ? AND status = 'waiting'
                     ORDER BY priority ASC, created_at ASC`,
                    [staffId, staffId],
                    (err) => {
                      if (err) console.error('Queue recalc error:', err);

                      connection.commit((err) => {
                        connection.release();
                        if (err) return res.status(500).json({ error: 'Commit failed' });

                        res.json({ 
                          success: true,
                          message: 'Appointment resolved remotely',
                          appointment_id: appointmentId,
                          user_notified: true,
                          email_sent: emailSent,
                          whatsapp_sent: !!(ULTRAMSG_INSTANCE_ID && appointment.user_phone),
                          resolution_note: resolutionNote || null
                        });
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
  });
});// ==================== UPDATE AVAILABILITY ====================
router.put('/availability', authenticateStaff, (req, res) => {
  const staffId = req.staffId;
  const { isAvailable, isPaused, reason } = req.body;

  if (isAvailable === undefined && isPaused === undefined) {
    return res.status(400).json({ error: 'isAvailable or isPaused required' });
  }

  // Get current status first
  db.query('SELECT is_available, is_paused FROM staff WHERE id = ?', [staffId], (err, current) => {
    if (err) return res.status(500).json({ error: err.message });
    if (current.length === 0) return res.status(404).json({ error: 'Staff not found' });

    const newIsAvailable = isAvailable !== undefined ? (isAvailable ? 1 : 0) : current[0].is_available;
    const newIsPaused = isPaused !== undefined ? (isPaused ? 1 : 0) : current[0].is_paused;

    // BLOCK: Prevent going unavailable if there are waiting or serving appointments
    if (newIsAvailable === 0 && newIsPaused === 0) {
      db.query(
        "SELECT COUNT(*) as count FROM appointments WHERE staff_id = ? AND status IN ('waiting', 'serving')",
        [staffId],
        (err, countResults) => {
          if (err) return res.status(500).json({ error: err.message });
          if (countResults[0].count > 0) {
            return res.status(400).json({
              error: 'Cannot go unavailable while you have active appointments in your queue. Please serve all waiting patients first or mark them as served/cancelled.',
              code: 'ACTIVE_QUEUE_BLOCK',
              active_count: countResults[0].count
            });
          }
          // No active appointments, proceed with update
          doUpdate();
        }
      );
    } else {
      doUpdate();
    }

    function doUpdate() {
      db.query(
        'UPDATE staff SET is_available = ?, is_paused = ? WHERE id = ?',
        [newIsAvailable, newIsPaused, staffId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          const status = newIsPaused ? 'paused' : (newIsAvailable ? 'available' : 'unavailable');

          // Log availability change
          db.query(
            'INSERT INTO staff_availability_log (staff_id, status, reason, ip_address) VALUES (?, ?, ?, ?)',
            [staffId, status, reason || null, req.ip],
            (err) => {
              if (err) console.error('Log error:', err);
            }
          );

          // If paused, notify waiting users — BILINGUAL
          if (newIsPaused) {
            notifyWaitingUsers(staffId, 'paused');
          }

          // If becoming available from paused, notify waiting users — BILINGUAL
          if (newIsAvailable === 1 && newIsPaused === 0 && current[0].is_paused === 1) {
            notifyWaitingUsers(staffId, 'available');
          }

          res.json({
            success: true,
            message: 'Availability updated',
            status,
            is_available: newIsAvailable,
            is_paused: newIsPaused
          });
        }
      );
    }
  });
});

// Helper: notify waiting users when staff status changes (paused or available)
function notifyWaitingUsers(staffId, notifyType) {
  const isPausedNotify = notifyType === 'paused';
  db.query(
    `SELECT a.id, a.student_id, a.guest_id, a.user_type,
      CASE WHEN a.user_type = 'student' THEN s.email ELSE p.contact_value END as contact,
      CASE WHEN a.user_type = 'student' THEN s.phone ELSE p.contact_value END as phone,
      CASE WHEN a.user_type = 'student' THEN 'email' ELSE p.contact_method END as contact_method,
      CASE WHEN a.user_type = 'student' THEN p.language ELSE p.language END as user_language,
      CASE WHEN a.user_type = 'student' THEN s.first_name ELSE p.first_name END as user_first_name
     FROM appointments a
     LEFT JOIN students s ON a.student_id = s.id
     LEFT JOIN guests p ON a.guest_id = p.id
     WHERE a.staff_id = ? AND a.status = 'waiting'`,
    [staffId],
    async (err, waitingUsers) => {
      if (err) console.error('Notify error:', err);
      if (waitingUsers && waitingUsers.length > 0) {
        for (const user of waitingUsers) {
          const recipientId = user.user_type === 'student' ? user.student_id : user.guest_id;
          const guestLang = user.user_language || 'en';
          const isAr = guestLang === 'ar';

          // 1. In-app notification — BILINGUAL
          const notifyMessage = isPausedNotify
            ? `⏸️ Staff Paused / الموظف متوقف مؤقتاً

` +
              `English: The staff member is temporarily unavailable. Your wait time has been extended. Please be patient.
` +
              `العربية: الموظف غير متاح مؤقتاً. تم تمديد وقت الانتظار. يرجى التحلي بالصبر.`
            : `✅ Staff Available Again / الموظف متاح مرة أخرى

` +
              `English: Good news! The staff member is now available again. Service will resume shortly. Thank you for your patience.
` +
              `العربية: أخبار سارة! الموظف متاح الآن مرة أخرى. سيتم استئناف الخدمة قريباً. شكراً لصبرك.`;

          db.query(
            `INSERT INTO notifications (appointment_id, recipient_type, recipient_id, channel, message, notification_type, is_sent)
             VALUES (?, ?, ?, 'in_app', ?, ?, 1)`,
            [user.id, user.user_type, recipientId, notifyMessage, isPausedNotify ? 'queue_paused' : 'queue_resumed'],
            (err) => { if (err) console.error('Notification insert error:', err); }
          );

          // 2. Email notification
          const emailTo = (user.contact_method === 'email' || (user.contact && user.contact.includes('@'))) ? user.contact : null;
          if (emailTo) {
            const emailSubject = isPausedNotify
              ? (isAr
                ? `=?UTF-8?B?${Buffer.from('⏸️ الموظف متوقف مؤقتاً - Dawri / Staff Paused').toString('base64')}?=`
                : '⏸️ Dawri - Staff Paused / الموظف متوقف مؤقتاً')
              : (isAr
                ? `=?UTF-8?B?${Buffer.from('✅ الموظف متاح مرة أخرى - Dawri / Staff Available').toString('base64')}?=`
                : '✅ Dawri - Staff Available Again / الموظف متاح مرة أخرى');

            const emailBody = isPausedNotify
              ? `<!DOCTYPE html>
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
      <h2>⏸️ Staff Temporarily Paused</h2>
      <p>Hello ${user.user_first_name || 'there'},</p>
      <div class="box">
        <p><strong>The staff member has temporarily paused their queue.</strong></p>
        <p>Your wait time has been extended. Please be patient — you will be notified when service resumes.</p>
      </div>
      <p class="footer">Automated notification from Dawri System.</p>
    </div>
    <div class="section-ar">
      <div class="lang-label">العربية</div>
      <h2>⏸️ الموظف متوقف مؤقتاً</h2>
      <p>مرحباً ${user.user_first_name || 'عزيزي'}،</p>
      <div class="box-ar">
        <p><strong>الموظف قد أوقف طابوره مؤقتاً.</strong></p>
        <p>تم تمديد وقت الانتظار. يرجى التحلي بالصبر — سيتم إعلامك عند استئناف الخدمة.</p>
      </div>
      <p class="footer">إشعار آلي من نظام Dawri.</p>
    </div>
  </div>
</body>
</html>`
              : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .section-en { direction: ltr; text-align: left; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .section-ar { direction: rtl; text-align: right; }
    h2 { color: #10b981; margin-top: 0; }
    .box { background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; }
    .box-ar { background: #d1fae5; border-right: 4px solid #10b981; padding: 16px; margin: 20px 0; }
    .footer { color: #64748b; font-size: 12px; margin-top: 30px; }
    .lang-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="section-en">
      <div class="lang-label">English</div>
      <h2>✅ Staff Available Again!</h2>
      <p>Hello ${user.user_first_name || 'there'},</p>
      <div class="box">
        <p><strong>Good news! The staff member is now available again.</strong></p>
        <p>Service will resume shortly. Thank you for your patience.</p>
      </div>
      <p class="footer">Automated notification from Dawri System.</p>
    </div>
    <div class="section-ar">
      <div class="lang-label">العربية</div>
      <h2>✅ الموظف متاح مرة أخرى!</h2>
      <p>مرحباً ${user.user_first_name || 'عزيزي'}،</p>
      <div class="box-ar">
        <p><strong>أخبار سارة! الموظف متاح الآن مرة أخرى.</strong></p>
        <p>سيتم استئناف الخدمة قريباً. شكراً لصبرك.</p>
      </div>
      <p class="footer">إشعار آلي من نظام Dawri.</p>
    </div>
  </div>
</body>
</html>`;

            try {
              await axios.post('http://localhost:5000/api/send-email', {
                to: emailTo,
                subject: emailSubject,
                body: emailBody,
                type: isPausedNotify ? 'queue_paused' : 'queue_resumed',
                lang: guestLang
              });
              console.log(isPausedNotify ? '✅ Pause email sent to:' : '✅ Resume email sent to:', emailTo);
            } catch (emailErr) {
              console.error(isPausedNotify ? '❌ Pause email failed:' : '❌ Resume email failed:', emailErr.message);
            }
          }

          // 3. WhatsApp notification
          const phoneTo = (['phone', 'mobile', 'whatsapp'].includes(user.contact_method) || (user.phone && /^[\+\d]/.test(user.phone))) ? user.phone : null;
          if (phoneTo && process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
            const waMessage = isPausedNotify
              ? `⏸️ *Dawri Alert / تنبيه Dawri*

` +
                `*English:*
` +
                `Hello ${user.user_first_name || 'there'},
` +
                `The staff member has temporarily paused their queue.
` +
                `Your wait time has been extended. Please be patient.
` +
                `You will be notified when service resumes.

` +
                `*العربية:*
` +
                `مرحباً ${user.user_first_name || 'عزيزي'}،
` +
                `الموظف قد أوقف طابوره مؤقتاً.
` +
                `تم تمديد وقت الانتظار. يرجى التحلي بالصبر.
` +
                `سيتم إعلامك عند استئناف الخدمة.

` +
                `Thank you! / شكراً!`
              : `✅ *Dawri Update / تحديث Dawri*

` +
                `*English:*
` +
                `Hello ${user.user_first_name || 'there'},
` +
                `Good news! The staff member is now available again.
` +
                `Service will resume shortly. Thank you for your patience.

` +
                `*العربية:*
` +
                `مرحباً ${user.user_first_name || 'عزيزي'}،
` +
                `أخبار سارة! الموظف متاح الآن مرة أخرى.
` +
                `سيتم استئناف الخدمة قريباً. شكراً لصبرك.

` +
                `Thank you! / شكراً!`;

            try {
              const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
              const token = process.env.ULTRAMSG_TOKEN;
              const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
              const params = new URLSearchParams();
              params.append('token', token);
              params.append('to', phoneTo);
              params.append('body', waMessage);
              params.append('priority', '10');

              await axios.post(url, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000
              });
              console.log(isPausedNotify ? '✅ Pause WhatsApp sent to:' : '✅ Resume WhatsApp sent to:', phoneTo);
            } catch (waErr) {
              console.error(isPausedNotify ? '❌ Pause WhatsApp failed:' : '❌ Resume WhatsApp failed:', waErr.message);
            }
          }
        }
      }
    }
  );
}

// ==================== GET MY STATS ====================
// ==================== GET MY STATS ====================
router.get('/stats', authenticateStaff, (req, res) => {
  const staffId = req.staffId;
  const { period = 'day' } = req.query;

  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: 'Invalid period. Use: day, week, month, year' });
  }

  // Date filters for served appointments (use completed_at/served_at)
  let servedDateFilter;
  let servedGroupFormat;
  
  // Date filters for created appointments (use created_at for cancelled/no-show)
  let createdDateFilter;
  
  switch(period) {
    case 'day':
      servedDateFilter = 'DATE(a.completed_at) = CURDATE()';
      servedGroupFormat = '%H:00';
      createdDateFilter = 'DATE(a.created_at) = CURDATE()';
      break;
    case 'week':
      servedDateFilter = 'a.completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      servedGroupFormat = '%Y-%m-%d';
      createdDateFilter = 'a.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      servedDateFilter = 'a.completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      servedGroupFormat = '%Y-%m-%d';
      createdDateFilter = 'a.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    case 'year':
      servedDateFilter = 'a.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
      servedGroupFormat = '%Y-%m';
      createdDateFilter = 'a.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
      break;
  }

  // Main stats query - served stats use completed_at, cancelled/no_show use created_at
  db.query(
    `SELECT 
      COUNT(CASE WHEN a.user_type = 'student' AND a.status = 'served' AND ${servedDateFilter} THEN 1 END) as students_served,
      COUNT(CASE WHEN a.user_type = 'guest' AND a.status = 'served' AND ${servedDateFilter} THEN 1 END) as guests_served,
      COUNT(CASE WHEN a.status = 'served' AND ${servedDateFilter} THEN 1 END) as total_served,
      COUNT(CASE WHEN a.status = 'cancelled' AND ${createdDateFilter} THEN 1 END) as total_cancelled,
      COUNT(CASE WHEN a.status = 'no_show' AND ${createdDateFilter} THEN 1 END) as total_no_show,
      AVG(CASE WHEN a.status = 'served' AND ${servedDateFilter} THEN a.actual_service_minutes END) as avg_service_time,
      AVG(CASE WHEN a.status = 'served' AND ${servedDateFilter} THEN TIMESTAMPDIFF(MINUTE, a.created_at, a.served_at) END) as avg_wait_time,
      MAX(CASE WHEN a.status = 'served' AND ${servedDateFilter} THEN TIMESTAMPDIFF(MINUTE, a.created_at, a.served_at) END) as peak_wait_time
     FROM appointments a 
     WHERE a.staff_id = ?`,
    [staffId],
    (err, statsResults) => {
      if (err) {
        console.error('Stats query error:', err);
        return res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
      }

      const stats = statsResults[0];

      // Time-based breakdown for Served Over Time chart - group by completed_at
      db.query(
        `SELECT 
          DATE_FORMAT(a.completed_at, '${servedGroupFormat}') as label,
          COUNT(CASE WHEN a.user_type = 'student' THEN 1 END) as students,
          COUNT(CASE WHEN a.user_type = 'guest' THEN 1 END) as guests,
          COUNT(*) as total
         FROM appointments a
         WHERE a.staff_id = ? AND a.status = 'served' AND ${servedDateFilter}
         GROUP BY DATE_FORMAT(a.completed_at, '${servedGroupFormat}')
         ORDER BY a.completed_at`,
        [staffId],
        (err, timeResults) => {
          if (err) {
            console.error('Time stats error:', err);
            return res.status(500).json({ error: err.message });
          }

          // Wait time trends - group by served_at
          db.query(
            `SELECT 
              DATE_FORMAT(a.served_at, '${servedGroupFormat}') as label,
              AVG(TIMESTAMPDIFF(MINUTE, a.created_at, a.served_at)) as avg_wait,
              MAX(TIMESTAMPDIFF(MINUTE, a.created_at, a.served_at)) as peak_wait,
              COUNT(*) as count
             FROM appointments a
             WHERE a.staff_id = ? AND a.status = 'served' AND ${servedDateFilter}
             GROUP BY DATE_FORMAT(a.served_at, '${servedGroupFormat}')
             ORDER BY a.served_at`,
            [staffId],
            (err, waitResults) => {
              if (err) {
                console.error('Wait stats error:', err);
                return res.status(500).json({ error: err.message });
              }

              // Recently served - unchanged, already correct
              db.query(
                `SELECT 
                  a.id,
                  a.ticket_number,
                  a.user_type,
                  CASE 
                    WHEN a.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
                    ELSE CONCAT(p.first_name, ' ', p.last_name)
                  END as user_name,
                  a.served_at,
                  a.completed_at,
                  a.actual_service_minutes,
                  it.name as issue_type
                 FROM appointments a
                 LEFT JOIN students s ON a.student_id = s.id
                 LEFT JOIN guests p ON a.guest_id = p.id
                 LEFT JOIN issue_types it ON a.issue_type_id = it.id
                 WHERE a.staff_id = ? AND a.status = 'served'
                 ORDER BY a.completed_at DESC
                 LIMIT 20`,
                [staffId],
                (err, recentResults) => {
                  if (err) {
                    console.error('Recent stats error:', err);
                    return res.status(500).json({ error: err.message });
                  }

                  res.json({
                    success: true,
                    period,
                    summary: {
                      studentsServed: stats.students_served || 0,
                      parentsServed: stats.guests_served || 0,
                      totalServed: stats.total_served || 0,
                      totalCancelled: stats.total_cancelled || 0,
                      totalNoShow: stats.total_no_show || 0,
                      avgServiceTime: Math.round(stats.avg_service_time || 0),
                      avgWaitTime: Math.round(stats.avg_wait_time || 0),
                      peakWaitTime: Math.round(stats.peak_wait_time || 0),
                    },
                    servedOverTime: {
                      labels: timeResults.map(r => r.label),
                      students: timeResults.map(r => r.students || 0),
                      guests: timeResults.map(r => r.guests || 0),
                      total: timeResults.map(r => r.total || 0),
                    },
                    waitTimeTrends: {
                      labels: waitResults.map(r => r.label),
                      avgWait: waitResults.map(r => Math.round(r.avg_wait || 0)),
                      peakWait: waitResults.map(r => Math.round(r.peak_wait || 0)),
                      count: waitResults.map(r => r.count || 0),
                    },
                    recentServed: recentResults.map(r => ({
                      ...r,
                      served_at: r.served_at ? new Date(r.served_at).toISOString() : null,
                      completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
                    })),
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

// ==================== GET PROFILE ====================
router.get('/profile', authenticateStaff, (req, res) => {
  const staffId = req.staffId;

  db.query(
    `SELECT s.*, i.name as issue_type_name, i.color as issue_type_color
     FROM staff s
     LEFT JOIN issue_types i ON s.issue_type_id = i.id
     WHERE s.id = ?`,
    [staffId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      const staff = results[0];
      // Remove password from response
      delete staff.password;

      res.json({
        success: true,
        staff: {
          ...staff,
          full_name: `${staff.first_name} ${staff.last_name}`
        }
      });
    }
  );
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', authenticateStaff, async (req, res) => {
  const staffId = req.staffId;
  const { firstName, lastName, roomNumber, block, floor, maxQueueLimit, password, currentPassword } = req.body;

  try {
    let updateFields = [];
    let values = [];

    if (firstName) { updateFields.push('first_name = ?'); values.push(firstName); }
    if (lastName) { updateFields.push('last_name = ?'); values.push(lastName); }
    if (roomNumber) { updateFields.push('room_number = ?'); values.push(roomNumber); }
    if (block) { updateFields.push('block = ?'); values.push(block); }
    if (floor) { updateFields.push('floor = ?'); values.push(floor); }

    if (maxQueueLimit !== undefined) {
      const limit = parseInt(maxQueueLimit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Max queue limit must be between 1 and 100' });
      }
      updateFields.push('max_queue_limit = ?'); values.push(limit);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Verify current password if provided
      if (currentPassword) {
        const currentHash = await new Promise((resolve, reject) => {
          db.query('SELECT password FROM staff WHERE id = ?', [staffId], (err, results) => {
            if (err) reject(err);
            else resolve(results[0]?.password);
          });
        });

        const isMatch = await bcrypt.compare(currentPassword, currentHash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push('password = ?');
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(staffId);

    db.query(
      `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          success: true,
          message: 'Profile updated successfully',
          updated_fields: updateFields.map(f => f.split(' ')[0])
        });
      }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET NOTIFICATIONS ====================
router.get('/notifications', authenticateStaff, (req, res) => {
  const staffId = req.staffId;

  db.query(
    `SELECT n.*, a.ticket_number
     FROM notifications n
     JOIN appointments a ON n.appointment_id = a.id
     WHERE a.staff_id = ? AND n.recipient_type = 'staff'
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [staffId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, notifications: results });
    }
  );
});

module.exports = router;