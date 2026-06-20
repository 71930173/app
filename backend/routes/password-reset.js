const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const axios = require('axios');
const crypto = require('crypto');

// ============================================
// HELPERS: Email & WhatsApp Senders
// ============================================

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

// Generate a random 6-digit code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a secure random token
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ============================================
// EMAIL TEMPLATES: Password Reset
// ============================================

const buildResetEmailTemplate = (firstName, resetCode, lang = 'en') => {
  const isAr = lang === 'ar';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; margin-bottom: 16px; }
    h1 { color: #1e293b; font-size: 24px; margin: 0 0 8px; }
    .subtitle { color: #64748b; font-size: 14px; }
    .code-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .code-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .info-box p { margin: 0; color: #92400e; font-size: 14px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
    .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
    .ar-section { direction: rtl; text-align: right; }
    .ar-section h1 { color: #1e293b; }
    .ar-section .code-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
    .ar-section .info-box { border-left: none; border-right: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <!-- English Section -->
      <div class="header">
        <div class="logo">D</div>
        <h1>Password Reset Request</h1>
        <p class="subtitle">Dawri Queue Management System</p>
      </div>

      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We received a request to reset your password. Use the code below to reset it:</p>

      <div class="code-box">
        <div class="code-label">Your Reset Code</div>
        <div class="code">${resetCode}</div>
      </div>

      <div class="info-box">
        <p>⏰ This code expires in <strong>15 minutes</strong>. If you didn't request this, please ignore this email.</p>
      </div>

      <div class="divider"></div>

      <!-- Arabic Section -->
      <div class="ar-section">
        <h1>طلب إعادة تعيين كلمة المرور</h1>
        <p class="subtitle">نظام إدارة الطابور Dawri</p>

        <p>مرحباً <strong>${firstName}</strong>،</p>
        <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. استخدم الرمز أدناه:</p>

        <div class="code-box">
          <div class="code-label">رمز إعادة التعيين</div>
          <div class="code">${resetCode}</div>
        </div>

        <div class="info-box">
          <p>⏰ ينتهي صلاحية هذا الرمز خلال <strong>15 دقيقة</strong>. إذا لم تطلب هذا، يرجى تجاهل هذا البريد.</p>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated message from Dawri System &mdash; نظام Dawri الآلي</p>
        <p style="margin-top:8px;">If you need help, contact the university administration.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// ============================================
// STEP 1: Request Password Reset (Student)
// POST /api/password-reset/student/forgot
// ============================================
router.post('/student/forgot', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId || !studentId.trim()) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Find student by student_id
  db.query(
    'SELECT id, student_id, first_name, last_name, email, phone FROM students WHERE student_id = ? AND is_active = 1',
    [studentId.trim()],
    async (err, results) => {
      if (err) {
        console.error('Forgot password DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        // Don't reveal if student exists or not for security
        return res.json({
          success: true,
          message: 'If a student with this ID exists, a reset code has been sent to their email.',
          sent: false
        });
      }

      const student = results[0];

      // Check if student has an email
      if (!student.email || !student.email.includes('@')) {
        return res.status(400).json({
          error: 'No email address on file for this account. Please contact administration.',
          code: 'NO_EMAIL'
        });
      }

      // Generate reset code and token
      const resetCode = generateResetCode();
      const resetToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Delete any existing unused tokens for this user
      db.query(
        'DELETE FROM password_reset_tokens WHERE user_type = ? AND user_id = ? AND used_at IS NULL',
        ['student', student.id],
        (delErr) => {
          if (delErr) console.error('Error clearing old tokens:', delErr);

          // Insert new token
          db.query(
            'INSERT INTO password_reset_tokens (user_type, user_id, reset_code, reset_token, expires_at) VALUES (?, ?, ?, ?, ?)',
            ['student', student.id, resetCode, resetToken, expiresAt],
            async (insertErr) => {
              if (insertErr) {
                console.error('Token insert error:', insertErr);
                return res.status(500).json({ error: 'Failed to create reset token' });
              }

              // Send email with reset code
              const emailBody = buildResetEmailTemplate(student.first_name, resetCode, 'en');
              const subject = 'Dawri - Password Reset Code / رمز إعادة تعيين كلمة المرور';
              const emailSent = await sendEmail(student.email, subject, emailBody, 'en');

              // Also try WhatsApp if phone exists
              let whatsappSent = false;
              if (student.phone) {
                const waMessage = `🔐 *Dawri - Password Reset / إعادة تعيين كلمة المرور*

Hello ${student.first_name},
Your password reset code is: *${resetCode}*
This code expires in 15 minutes.

مرحباً ${student.first_name}،
رمز إعادة تعيين كلمة المرور هو: *${resetCode}*
ينتهي صلاحية هذا الرمز خلال 15 دقيقة.`;
                const waResult = await sendWhatsApp(student.phone, waMessage);
                whatsappSent = waResult.success;
              }

              res.json({
                success: true,
                message: 'Reset code sent to your email' + (whatsappSent ? ' and WhatsApp' : ''),
                sent: true,
                emailSent,
                whatsappSent,
                // Return masked email for UI display
                maskEmail: maskContact(student.email),
                // Return the reset token for step 2 verification (frontend will use this)
                resetToken: resetToken
              });
            }
          );
        }
      );
    }
  );
});

// ============================================
// STEP 1: Request Password Reset (Guest)
// POST /api/password-reset/guest/forgot
// ============================================
router.post('/guest/forgot', async (req, res) => {
  const { contactValue } = req.body;

  if (!contactValue || !contactValue.trim()) {
    return res.status(400).json({ error: 'Phone or email is required' });
  }

  // Find guest by contact_value
  db.query(
    'SELECT id, first_name, last_name, contact_method, contact_value, language FROM guests WHERE contact_value = ? AND is_active = 1',
    [contactValue.trim()],
    async (err, results) => {
      if (err) {
        console.error('Guest forgot password DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.json({
          success: true,
          message: 'If an account with this contact exists, a reset code has been sent.',
          sent: false
        });
      }

      const guest = results[0];
      const guestLang = guest.language || 'en';

      // Generate reset code and token
      const resetCode = generateResetCode();
      const resetToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Delete any existing unused tokens for this user
      db.query(
        'DELETE FROM password_reset_tokens WHERE user_type = ? AND user_id = ? AND used_at IS NULL',
        ['guest', guest.id],
        (delErr) => {
          if (delErr) console.error('Error clearing old tokens:', delErr);

          // Insert new token
          db.query(
            'INSERT INTO password_reset_tokens (user_type, user_id, reset_code, reset_token, expires_at) VALUES (?, ?, ?, ?, ?)',
            ['guest', guest.id, resetCode, resetToken, expiresAt],
            async (insertErr) => {
              if (insertErr) {
                console.error('Token insert error:', insertErr);
                return res.status(500).json({ error: 'Failed to create reset token' });
              }

              let emailSent = false;
              let whatsappSent = false;

              // Send via email if guest has email contact
              if (guest.contact_value && guest.contact_value.includes('@')) {
                const emailBody = buildResetEmailTemplate(guest.first_name, resetCode, guestLang);
                const subject = guestLang === 'ar'
                  ? `=?UTF-8?B?${Buffer.from('Dawri - رمز إعادة تعيين كلمة المرور').toString('base64')}?=`
                  : 'Dawri - Password Reset Code';
                emailSent = await sendEmail(guest.contact_value, subject, emailBody, guestLang);
              }

              // Send via WhatsApp if guest has phone contact
              let phoneTo = null;
              if (['phone', 'mobile', 'whatsapp'].includes(guest.contact_method)) {
                phoneTo = guest.contact_value;
              }
              if (!phoneTo && guest.contact_value && /^[+\d]/.test(guest.contact_value)) {
                phoneTo = guest.contact_value;
              }

              if (phoneTo) {
                const waMessage = guestLang === 'ar'
                  ? `🔐 *Dawri - إعادة تعيين كلمة المرور*

مرحباً ${guest.first_name}،
رمز إعادة تعيين كلمة المرور هو: *${resetCode}*
ينتهي صلاحية هذا الرمز خلال 15 دقيقة.

*English:*
Your password reset code is: *${resetCode}*
This code expires in 15 minutes.`
                  : `🔐 *Dawri - Password Reset*

Hello ${guest.first_name},
Your password reset code is: *${resetCode}*
This code expires in 15 minutes.

*العربية:*
رمز إعادة تعيين كلمة المرور هو: *${resetCode}*
ينتهي صلاحية هذا الرمز خلال 15 دقيقة.`;

                const waResult = await sendWhatsApp(phoneTo, waMessage);
                whatsappSent = waResult.success;
              }

              // Determine what was sent for UI feedback
              let sentVia = [];
              if (emailSent) sentVia.push('email');
              if (whatsappSent) sentVia.push('whatsapp');

              if (!emailSent && !whatsappSent) {
                return res.status(500).json({
                  error: 'Failed to send reset code. Please contact administration.',
                  code: 'SEND_FAILED'
                });
              }

              res.json({
                success: true,
                message: `Reset code sent via ${sentVia.join(' and ')}`,
                sent: true,
                emailSent,
                whatsappSent,
                maskContact: maskContact(guest.contact_value),
                resetToken: resetToken
              });
            }
          );
        }
      );
    }
  );
});

// ============================================
// STEP 2: Verify Reset Code
// POST /api/password-reset/verify-code
// ============================================
router.post('/verify-code', (req, res) => {
  const { resetToken, resetCode, userType } = req.body;

  if (!resetToken || !resetCode || !userType) {
    return res.status(400).json({ error: 'Reset token, code, and user type are required' });
  }

  if (!['student', 'guest'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  db.query(
    `SELECT id, user_id, reset_code, expires_at, used_at
     FROM password_reset_tokens
     WHERE reset_token = ? AND user_type = ?`,
    [resetToken, userType],
    (err, results) => {
      if (err) {
        console.error('Verify code DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'Invalid reset token', code: 'INVALID_TOKEN' });
      }

      const token = results[0];

      // Check if already used
      if (token.used_at) {
        return res.status(400).json({ error: 'This code has already been used', code: 'ALREADY_USED' });
      }

      // Check if expired
      if (new Date(token.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Reset code has expired', code: 'EXPIRED' });
      }

      // Verify the code
      if (token.reset_code !== resetCode.trim()) {
        return res.status(400).json({ error: 'Invalid reset code', code: 'INVALID_CODE' });
      }

      // Code is valid
      res.json({
        success: true,
        message: 'Code verified successfully',
        valid: true,
        userId: token.user_id
      });
    }
  );
});

// ============================================
// STEP 3: Reset Password
// POST /api/password-reset/reset
// ============================================
router.post('/reset', async (req, res) => {
  const { resetToken, resetCode, userType, newPassword } = req.body;

  if (!resetToken || !resetCode || !userType || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['student', 'guest'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Verify token and code first
  db.query(
    `SELECT id, user_id, reset_code, expires_at, used_at
     FROM password_reset_tokens
     WHERE reset_token = ? AND user_type = ?`,
    [resetToken, userType],
    async (err, results) => {
      if (err) {
        console.error('Reset password DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'Invalid reset token', code: 'INVALID_TOKEN' });
      }

      const token = results[0];

      if (token.used_at) {
        return res.status(400).json({ error: 'This code has already been used', code: 'ALREADY_USED' });
      }

      if (new Date(token.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Reset code has expired', code: 'EXPIRED' });
      }

      if (token.reset_code !== resetCode.trim()) {
        return res.status(400).json({ error: 'Invalid reset code', code: 'INVALID_CODE' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password in the correct table
      const tableName = userType === 'student' ? 'students' : 'guests';
      const idColumn = userType === 'student' ? 'id' : 'id';

      db.query(
        `UPDATE ${tableName} SET password = ? WHERE ${idColumn} = ?`,
        [hashedPassword, token.user_id],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error('Password update error:', updateErr);
            return res.status(500).json({ error: 'Failed to update password' });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Mark token as used
          db.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
            [token.id],
            (usedErr) => {
              if (usedErr) console.error('Error marking token as used:', usedErr);
            }
          );

          res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
            reset: true
          });
        }
      );
    }
  );
});

// ============================================
// HELPER: Mask contact info for privacy
// ============================================
function maskContact(contact) {
  if (!contact) return '';

  if (contact.includes('@')) {
    // Email: show first 2 chars, then ***, then @domain
    const [local, domain] = contact.split('@');
    if (local.length <= 2) {
      return '*'.repeat(local.length) + '@' + domain;
    }
    return local.substring(0, 2) + '***@' + domain;
  } else {
    // Phone: show last 3 digits
    const cleaned = contact.replace(/[\s\-()+]/g, '');
    if (cleaned.length <= 3) return '***' + cleaned;
    return '***' + cleaned.slice(-3);
  }
}

module.exports = router;
