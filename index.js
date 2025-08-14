const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://qairoz.org'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// In-memory storage
let colleges = [];
let students = [];

// Email configuration with Resend
let resend = null;
const resendApiKey = process.env.RESEND_API_KEY;

console.log('🔍 Email Configuration Check:');
console.log('📧 RESEND_API_KEY:', resendApiKey ? 'SET' : 'NOT SET');

if (resendApiKey) {
  try {
    resend = new Resend(resendApiKey);
    console.log('✅ Resend email service configured successfully');
  } catch (error) {
    console.log('❌ Resend setup failed:', error.message);
    resend = null;
  }
} else {
  console.log('⚠️ Resend not configured - missing RESEND_API_KEY');
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Qairoz Backend Server is running!', 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    emailConfigured: !!resend
  });
});

app.get('/api/colleges', (req, res) => {
  try {
    res.json({
      success: true,
      data: colleges,
      count: colleges.length
    });
  } catch (error) {
    console.error('Error getting colleges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/students', (req, res) => {
  try {
    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/students', (req, res) => {
  try {
    const { collegeName, students: studentData, collegeInfo } = req.body;
    
    if (!collegeName || !studentData || !Array.isArray(studentData)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format' 
      });
    }

    // Update or add college
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

    // Add students
    const studentsWithCollege = studentData.map(student => ({
      ...student,
      collegeName,
      collegeEmail: collegeInfo?.email || '',
      uploadedAt: new Date().toISOString()
    }));

    // Remove existing students from this college and add new ones
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
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

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, type } = req.body;
    
    console.log('📧 Email request received:', { to, subject, type });
    
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, html' 
      });
    }
    
    if (!resend) {
      console.log('❌ Resend not configured');
      return res.json({
        success: false,
        error: 'Email service not configured',
        code: 'NO_EMAIL_SERVICE'
      });
    }
    
    console.log('📤 Sending email via Resend...');
    
    const emailData = {
      from: 'Qairoz Platform <noreply@qairoz.org>',
      to: to,
      subject: subject,
      html: html
    };
    
    const result = await resend.emails.send(emailData);
    
    console.log('✅ Email sent successfully via Resend:', {
      to: to,
      id: result.data?.id,
      status: 'sent'
    });
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        id: result.data?.id,
        to: to,
        subject: subject,
        service: 'resend'
      }
    });
    
  } catch (error) {
    console.error('❌ Resend email sending failed:', error.message);
    
    let errorMessage = 'Failed to send email';
    let errorCode = 'UNKNOWN';
    
    if (error.message.includes('API key')) {
      errorMessage = 'Invalid Resend API key';
      errorCode = 'INVALID_API_KEY';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Email rate limit exceeded';
      errorCode = 'RATE_LIMIT';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Qairoz Backend Server running on port', PORT);
  console.log('📡 Health check: http://localhost:' + PORT + '/api/health');
  console.log('🌐 CORS enabled for:', allowedOrigins.join(', '));
  console.log('✅ Server started successfully');
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log('📋 Server setup complete');
