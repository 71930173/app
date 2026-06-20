const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { body, validationResult } = require('express-validator');

// JWT Secret validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in environment variables');
  process.exit(1);
}

// Validation middleware helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Generate JWT token helper
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Update last login helper
const updateLastLogin = (table, id) => {
  db.query(`UPDATE ${table} SET last_login = NOW() WHERE id = ?`, [id], (err) => {
    if (err) {
      console.warn('Could not update last_login:', err.message);
    }
  });
};

// ==================== GUEST SIGNUP ====================
// Frontend sends: { first_name, last_name, contact_method, contact_value, password, language }
router.post('/guest/signup',
  [
    body('first_name').trim().isLength({ min: 2, max: 100 }).withMessage('First name must be 2-100 characters'),
    body('last_name').trim().isLength({ min: 2, max: 100 }).withMessage('Last name must be 2-100 characters'),
    body('contact_value').trim().notEmpty().withMessage('Contact value is required'),
    body('contact_method').optional().isIn(['email', 'phone']).withMessage('Contact method must be email or phone'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('language').optional().isIn(['en', 'ar']).withMessage('Language must be en or ar'),
    validate
  ],
  async (req, res) => {
    const { first_name, last_name, contact_method, contact_value, password, language } = req.body;

    try {
      // Check if contact exists
      db.query('SELECT id FROM guests WHERE contact_value = ?', [contact_value], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (results.length > 0) {
          return res.status(409).json({ error: 'Contact already registered', field: 'contact_value' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.query(
          `INSERT INTO guests (first_name, last_name, contact_method, contact_value, password, language) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [first_name, last_name, contact_method || 'phone', contact_value, hashedPassword, language || 'en'],
          (err, result) => {
            if (err) return res.status(500).json({ error: 'Registration failed', details: err.message });

            const token = generateToken({ id: result.insertId, userType: 'guest' });

            res.status(201).json({
              success: true,
              message: 'Guest registered successfully',
              token,
              guest: {
                id: result.insertId,
                first_name: first_name,
                last_name: last_name,
                contact_value: contact_value,
                contact_method: contact_method || 'phone',
                language: language || 'en'
              }
            });
          }
        );
      });
    } catch (error) {
      console.error('Guest signup error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }
);

// ==================== GUEST LOGIN ====================
// Frontend sends: { contact_value, password }
router.post('/guest/login',
  [
    body('contact_value').trim().notEmpty().withMessage('Contact value is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  (req, res) => {
    const { contact_value, password } = req.body;

    db.query('SELECT * FROM guests WHERE contact_value = ? AND is_active = 1', [contact_value], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid contact or password' });
      }

      const guest = results[0];
      const isMatch = await bcrypt.compare(password, guest.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid contact or password' });
      }

      updateLastLogin('guests', guest.id);
      const token = generateToken({ id: guest.id, userType: 'guest' });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        guest: {
          id: guest.id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          contact_value: guest.contact_value,
          contact_method: guest.contact_method,
          language: guest.language
        }
      });
    });
  }
);

// ==================== STUDENT SIGNUP ====================
router.post('/student/signup',
  [
    body('studentId').trim().isLength({ min: 1, max: 50 }).withMessage('Student ID is required (max 50 chars)'),
    body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name must be 2-100 characters'),
    body('lastName').trim().isLength({ min: 2, max: 100 }).withMessage('Last name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
  ],
  async (req, res) => {
    const { studentId, firstName, lastName, email, phone, password } = req.body;

    try {
      db.query('SELECT id FROM students WHERE student_id = ? OR email = ?', [studentId, email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        if (results.length > 0) {
          return res.status(409).json({ error: 'Student ID or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.query(
          `INSERT INTO students (student_id, first_name, last_name, email, phone, password) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [studentId, firstName, lastName, email, phone || null, hashedPassword],
          (err, result) => {
            if (err) return res.status(500).json({ error: 'Registration failed', details: err.message });

            res.status(201).json({
              success: true,
              message: 'Student registered successfully',
              studentId: result.insertId
            });
          }
        );
      });
    } catch (error) {
      console.error('Student signup error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }
);

// ==================== STUDENT LOGIN ====================
router.post('/student/login',
  [
    body('studentId').trim().notEmpty().withMessage('Student ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  (req, res) => {
    const { studentId, password } = req.body;

    db.query('SELECT * FROM students WHERE student_id = ? AND is_active = 1', [studentId], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid ID or password' });
      }

      const student = results[0];
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
    });
  }
);

// ==================== STAFF LOGIN ====================
router.post('/staff/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM staff WHERE email = ? AND is_active = 1', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const staff = results[0];

      // Handle both hashed and plaintext passwords (legacy support with warning)
      let isMatch = false;
      if (staff.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, staff.password);
      } else {
        // Plaintext password - log warning and allow login (for development only!)
        console.warn(`Staff ${staff.id} has plaintext password. Please update!`);
        isMatch = (password === staff.password);
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      updateLastLogin('staff', staff.id);
      const token = generateToken({ id: staff.id, userType: 'staff' });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        staff: {
          id: staff.id,
          firstName: staff.first_name,
          lastName: staff.last_name,
          email: staff.email,
          room: staff.room_number,
          block: staff.block,
          floor: staff.floor,
          issueTypeId: staff.issue_type_id,
          isAvailable: staff.is_available,
          isPaused: staff.is_paused,
          maxQueueLimit: staff.max_queue_limit
        }
      });
    });
  }
);

// ==================== ADMIN LOGIN ====================
router.post('/admin/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM admins WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const admin = results[0];
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({ id: admin.id, userType: 'admin', role: admin.role });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        admin: {
          id: admin.id,
          firstName: admin.first_name,
          lastName: admin.last_name,
          email: admin.email,
          role: admin.role
        }
      });
    });
  }
);

// ==================== VERIFY TOKEN ====================
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      valid: true, 
      user: decoded,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

// ==================== REFRESH TOKEN ====================
router.post('/refresh', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = generateToken({ id: decoded.id, userType: decoded.userType, role: decoded.role });

    res.json({ 
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;