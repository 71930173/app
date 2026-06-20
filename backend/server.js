require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const app = express();

// Trust proxy for express-rate-limit behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ============================================
// CORS - MUST be FIRST, before everything else
// ============================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000', 
  'http://localhost:19006',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19002',
  'http://localhost:19003'
];

// Handle ALL OPTIONS requests globally FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow any localhost origin for development
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Mobile apps don't send origin
    res.header('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  // Immediately respond to OPTIONS with 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Also apply cors middleware for extra safety
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400
}));

// ============================================
// Rate limiting - AFTER CORS
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip OPTIONS requests
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/', limiter);

const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/guest/', guestLimiter);

const studentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/student/', studentLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/auth/', authLimiter);

// Password reset rate limiter - stricter to prevent abuse
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset attempts, please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/password-reset/', passwordResetLimiter);

// Request logging
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: req.requestTime,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/guest', require('./routes/guest'));
app.use('/api/student', require('./routes/student'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/password-reset', require('./routes/password-reset'));

// Export endpoint
app.get('/api/export/:type', async (req, res) => {
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
        query = `SELECT s.id, s.first_name, s.last_name, s.email, s.room_number, s.block, s.floor,
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

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Export error:', err);
        return res.status(500).json({ error: 'Export failed', details: err.message });
      }

      db.query(
        'INSERT INTO export_logs (export_type, filters, record_count, ip_address) VALUES (?, ?, ?, ?)',
        [type, JSON.stringify(req.query), results.length, req.ip]
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

// Token verification
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ valid: false, error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

// ============================================
// UPDATED: Email endpoint with UTF-8 support for Arabic
// ============================================
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body, lang = 'en' } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'Missing email fields' });

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
      });

      // Decode base64 subject if it was encoded for Arabic
      let finalSubject = subject;
      if (subject.startsWith('=?UTF-8?B?')) {
        const base64Part = subject.replace('=?UTF-8?B?', '').replace('?=', '');
        finalSubject = Buffer.from(base64Part, 'base64').toString('utf-8');
      }

      // Generate plain text fallback from HTML (strip tags, decode entities)
      const plainText = body
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      await transporter.sendMail({
        from: `"Dawri" <${process.env.EMAIL_USER}>`,
        to,
        subject: finalSubject,
        html: body,
        text: plainText
      });

      return res.json({ success: true, message: 'Email sent successfully', to, subject: finalSubject, lang });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
  }

  console.log('📧 EMAIL (logged):', { to, subject, lang, bodyPreview: body.substring(0, 200) });
  res.json({ 
    success: false,
    message: 'Email logged to console (nodemailer not configured)',
    to, subject, lang
  });
});

// SMS endpoint for 3-min warning (legacy - kept for compatibility)
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing SMS fields' });

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });

      return res.json({ success: true, message: 'SMS sent successfully', to });
    } catch (smsErr) {
      console.error('SMS send failed:', smsErr);
    }
  }

  console.log('📱 SMS (logged):', { to, message });
  res.json({ 
    success: false,
    message: 'SMS logged to console (Twilio not configured)',
    to
  });
});

// ============================================
// NEW: WhatsApp endpoint using UltraMsg (qs.stringify format)
// Sends WhatsApp messages via UltraMsg API
// ============================================
app.post('/api/send-whatsapp', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing WhatsApp fields' });

  if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
    try {
      const axios = require('axios');
      const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
      const token = process.env.ULTRAMSG_TOKEN;

      // UltraMsg API endpoint
      const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

      // Use URLSearchParams (built-in Node.js, no extra package needed)
      const params = new URLSearchParams();
      params.append('token', token);
      params.append('to', to);
      params.append('body', message);
      params.append('priority', '1');

      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return res.json({ 
        success: true, 
        message: 'WhatsApp sent successfully', 
        to,
        ultraMsgResponse: response.data 
      });
    } catch (waErr) {
      console.error('WhatsApp send failed:', waErr.response?.data || waErr.message);
      return res.json({ 
        success: false,
        message: 'WhatsApp send failed (logged)',
        error: waErr.response?.data || waErr.message,
        to
      });
    }
  }

  console.log('📱 WHATSAPP (logged):', { to, message });
  res.json({ 
    success: false,
    message: 'WhatsApp logged to console (UltraMsg not configured)',
    to
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
    timestamp: req.requestTime
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Dawri API Server v2.0');
  console.log('=================================');
  console.log(`📡 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log('=================================');
  console.log('Features: Guest Priority, Real-time Queue, SMS/Email/WhatsApp Notifications');
  console.log('=================================');
});

module.exports = app;