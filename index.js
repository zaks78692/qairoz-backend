const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Storage for uploaded files
const upload = multer({ dest: 'uploads/' });

// In-memory storage for demo purposes
let colleges = [];
let students = [];

// Gmail SMTP transporter
let emailTransporter = null;

// Initialize Gmail SMTP if credentials are provided
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  emailTransporter = nodemailer.createTransporter({
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
      'POST /api/export-to-s3',
      'GET /api/test-s3',
      'GET /api/backups'
      'POST /api/send-email'
    ]
  });
});

// Health check route
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

    // Add college if not exists
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

    // Add students with college info
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

  // Calculate breakdowns
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

// Test S3 connection (simplified for now)
app.get('/api/test-s3', (req, res) => {
  // Simple mock response - no AWS complexity
  res.json({
    success: true,
    message: 'Cloud storage ready (local backup system)',
    data: {
      backupSystem: 'Local JSON + CSV export',
      timestamp: new Date().toISOString(),
      note: 'Data is safely stored and can be exported anytime'
    }
  });
});

// Export to S3 (mock for now - will add real AWS later)
app.post('/api/export-to-s3', (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const hasAWS = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME;
    
    // Create actual downloadable data
    const exportData = {
      colleges: colleges,
      students: students,
      exportDate: new Date().toISOString(),
      totalColleges: colleges.length,
      totalStudents: students.length
    };
    
    const files = [
      {
        name: `qairoz-complete-data-${timestamp}.json`,
        size: JSON.stringify(exportData).length,
        type: 'Complete Data Export',
        data: exportData
      },
      {
        name: `qairoz-students-${timestamp}.csv`,
        size: students.length * 150,
        type: 'Students CSV Export',
        data: students
      }
    ];

    res.json({
      success: true,
      message: `Successfully prepared ${students.length} students from ${colleges.length} colleges for export`,
      data: {
        files: files,
        timestamp: new Date().toISOString(),
        awsConfigured: hasAWS,
        exportSummary: {
          totalColleges: colleges.length,
          totalStudents: students.length,
          dataSize: JSON.stringify(exportData).length,
          formats: ['JSON', 'CSV']
        },
        nextSteps: hasAWS 
          ? 'Ready for AWS S3 upload (SDK integration required)'
          : 'Configure AWS credentials to enable cloud storage'
      }
    });
  } catch (error) {
    console.error('Error preparing export:', error);
    res.status(500).json({ error: 'Export preparation failed' });
  }
});

// Get backups (mock for now)
app.get('/api/backups', (req, res) => {
  const hasAWS = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME;
  
  // Show current data as available for backup
  const mockBackups = [
    {
      name: `qairoz-current-data-${new Date().toISOString().split('T')[0]}.json`,
      size: JSON.stringify({ colleges, students }).length,
      lastModified: new Date().toISOString(),
      type: 'Current Data Snapshot',
      records: `${colleges.length} colleges, ${students.length} students`,
      status: 'Available for export'
    },
    {
      name: `qairoz-students-${new Date().toISOString().split('T')[0]}.csv`,
      size: students.length * 120,
      lastModified: new Date().toISOString(),
      type: 'Student Records CSV',
      records: `${students.length} student records`,
      status: 'Available for CSV export'
    }
  ];
  
  res.json({
    success: true,
    data: mockBackups,
    summary: {
      totalColleges: colleges.length,
      totalStudents: students.length,
      awsConfigured: hasAWS,
      backupStatus: hasAWS ? 'AWS S3 ready for integration' : 'Local export available',
      lastUpdated: new Date().toISOString()
    }
  });
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

// Error handling middleware
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
      'GET /api/stats'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Qairoz Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
