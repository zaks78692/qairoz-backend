const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Storage for uploaded files
const upload = multer({ dest: 'uploads/' });

// In-memory storage
let colleges = [];
let students = [];

// Gmail SMTP transporter
let emailTransporter = null;

if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  console.log('📧 Gmail SMTP configured for:', process.env.GMAIL_USER);
} else {
  console.log('⚠️ Gmail SMTP not configured - email features disabled');
}

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Qairoz Backend Server is running!', 
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats',
      'POST /api/send-email'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Get all colleges
app.get('/api/colleges', (req, res) => {
  res.json(colleges);
});

// Get all students
app.get('/api/students', (req, res) => {
  res.json(students);
});

// Upload students data
app.post('/api/students', (req, res) => {
  try {
    const { collegeName, students: studentData, collegeInfo } = req.body;
    
    if (!collegeName || !studentData || !Array.isArray(studentData)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const existingCollege = colleges.find(c => c.name === collegeName);
    if (!existingCollege) {
      colleges.push({
        name: collegeName,
        email: collegeInfo?.email || '',
        studentCount: studentData.length,
        lastUpdated: new Date().toISOString(),
        registeredAt: new Date().toISOString()
      });
    } else {
      existingCollege.studentCount = studentData.length;
      existingCollege.lastUpdated = new Date().toISOString();
    }

    const studentsWithCollege = studentData.map(student => ({
      ...student,
      collegeName,
      collegeEmail: collegeInfo?.email || '',
      uploadedAt: new Date().toISOString()
    }));

    students = students.filter(s => s.collegeName !== collegeName);
    students.push(...studentsWithCollege);

    res.json({ 
      success: true,
      message: 'Students uploaded successfully', 
      count: studentData.length,
      collegeName
    });
  } catch (error) {
    console.error('Error uploading students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    totalColleges: colleges.length,
    totalStudents: students.length,
    lastUpdated: new Date().toISOString(),
    sportBreakdown: {},
    courseBreakdown: {},
    yearBreakdown: {},
    collegeBreakdown: {}
  };

  students.forEach(student => {
    if (student.sport) {
      stats.sportBreakdown[student.sport] = (stats.sportBreakdown[student.sport] || 0) + 1;
    }
    if (student.course) {
      stats.courseBreakdown[student.course] = (stats.courseBreakdown[student.course] || 0) + 1;
    }
    if (student.year) {
      stats.yearBreakdown[student.year] = (stats.yearBreakdown[student.year] || 0) + 1;
    }
    if (student.collegeName) {
      stats.collegeBreakdown[student.collegeName] = (stats.collegeBreakdown[student.collegeName] || 0) + 1;
    }
  });

  res.json(stats);
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, type } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, html' 
      });
    }
    
    if (!emailTransporter) {
      console.log('📧 Email simulation (SMTP not configured):', { to, subject, type });
      return res.json({
        success: true,
        message: 'Email simulated successfully (SMTP not configured)',
        data: { to, subject, type }
      });
    }
    
    const mailOptions = {
      from: `"Qairoz Platform" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      to: to,
      subject: subject,
      messageId: info.messageId,
      type: type || 'general'
    });
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        messageId: info.messageId,
        to: to,
        subject: subject
      }
    });
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats',
      'POST /api/send-email'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Qairoz Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`🔍 Server started successfully on port ${PORT}`);
  console.log(`📋 Available routes: /, /api/health, /api/students, /api/colleges, /api/stats, /api/send-email`);
});
