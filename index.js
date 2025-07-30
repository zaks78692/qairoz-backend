const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://qairoz.org'],
  credentials: true
}));
app.use(express.json());

// Storage for uploaded files
const upload = multer({ dest: 'uploads/' });

// In-memory storage for demo purposes
let colleges = [];
let students = [];

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

// Test S3 connection (mock for now)
app.get('/api/test-s3', (req, res) => {
  // Mock S3 connection test
  res.json({
    success: true,
    message: 'S3 connection test successful (mock)',
    data: {
      buckets: ['qairoz-data-storage'],
      region: 'eu-north-1',
      timestamp: new Date().toISOString()
    }
  });
});

// Export to S3 (mock for now)
app.post('/api/export-to-s3', (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Mock S3 export
    const mockFiles = [
      {
        name: `qairoz-data-${timestamp}.json`,
        size: JSON.stringify({ colleges, students }).length,
        url: '#'
      },
      {
        name: `qairoz-students-${timestamp}.csv`,
        size: students.length * 100, // approximate
        url: '#'
      }
    ];

    res.json({
      success: true,
      message: 'Data exported to S3 successfully (mock)',
      data: {
        files: mockFiles,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error exporting to S3:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get backups (mock for now)
app.get('/api/backups', (req, res) => {
  // Mock backup files
  const mockBackups = [
    {
      name: 'qairoz-data-2025-01-15.json',
      size: 1024 * 50,
      lastModified: new Date().toISOString(),
      url: '#'
    },
    {
      name: 'qairoz-students-2025-01-15.csv',
      size: 1024 * 25,
      lastModified: new Date().toISOString(),
      url: '#'
    }
  ];

  res.json(mockBackups);
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
  console.log(`🌐 CORS enabled for: http://localhost:5173, https://qairoz.org`);
});