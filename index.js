const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-north-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'qairoz-data-storage';

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
  // Real S3 connection test
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.json({
      success: false,
      error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    });
  }

  s3.listBuckets((err, data) => {
    if (err) {
      console.error('S3 connection error:', err);
      return res.json({
        success: false,
        error: `S3 connection failed: ${err.message}`
      });
    }

    const bucketNames = data.Buckets.map(bucket => bucket.Name);
    const targetBucketExists = bucketNames.includes(BUCKET_NAME);

    res.json({
      success: true,
      message: 'S3 connection successful!',
      data: {
        buckets: bucketNames,
        targetBucket: BUCKET_NAME,
        targetBucketExists,
        region: process.env.AWS_REGION || 'eu-north-1',
        timestamp: new Date().toISOString()
      }
    });
  });
});

// Export to S3 (mock for now)
app.post('/api/export-to-s3', (req, res) => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.json({
      success: false,
      error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    });
  }

  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Prepare data for export
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        totalColleges: colleges.length,
        totalStudents: students.length,
        exportedBy: 'Qairoz Backend Server'
      },
      colleges,
      students
    };

    // Create CSV content for students
    const csvHeader = 'College Name,College Email,Student Name,Email,Phone,Roll Number,Course,Year,Sport,Registration Date,Uploaded At\n';
    const csvContent = csvHeader + students.map(student => [
      student.collegeName || '',
      student.collegeEmail || '',
      student.name || '',
      student.email || '',
      student.phone || '',
      student.rollNumber || '',
      student.course || '',
      student.year || '',
      student.sport || '',
      student.registrationDate || '',
      student.uploadedAt || ''
    ].map(field => `"${field}"`).join(',')).join('\n');

    const uploadPromises = [];

    // Upload JSON file
    const jsonParams = {
      Bucket: BUCKET_NAME,
      Key: `qairoz-data-${fullTimestamp}.json`,
      Body: JSON.stringify(exportData, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    };

    uploadPromises.push(
      new Promise((resolve, reject) => {
        s3.upload(jsonParams, (err, data) => {
          if (err) reject(err);
          else resolve({
            name: jsonParams.Key,
            size: Buffer.byteLength(jsonParams.Body),
            url: data.Location,
            type: 'json'
          });
        });
      })
    );

    // Upload CSV file
    const csvParams = {
      Bucket: BUCKET_NAME,
      Key: `qairoz-students-${fullTimestamp}.csv`,
      Body: csvContent,
      ContentType: 'text/csv',
      ServerSideEncryption: 'AES256'
    };

    uploadPromises.push(
      new Promise((resolve, reject) => {
        s3.upload(csvParams, (err, data) => {
          if (err) reject(err);
          else resolve({
            name: csvParams.Key,
            size: Buffer.byteLength(csvParams.Body),
            url: data.Location,
            type: 'csv'
          });
        });
      })
    );

    Promise.all(uploadPromises)
      .then(files => {
        res.json({
          success: true,
          message: `Successfully exported ${students.length} students from ${colleges.length} colleges to S3`,
          data: {
            files,
            bucket: BUCKET_NAME,
            timestamp: new Date().toISOString(),
            stats: {
              colleges: colleges.length,
              students: students.length
            }
          }
        });
      })
      .catch(error => {
        console.error('S3 upload error:', error);
        res.status(500).json({
          success: false,
          error: `Failed to upload to S3: ${error.message}`
        });
      });
    
  } catch (error) {
    console.error('Error exporting to S3:', error);
    res.status(500).json({ 
      success: false,
      error: `Export failed: ${error.message}` 
    });
  }
});

// Get backups (mock for now)
app.get('/api/backups', (req, res) => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.json({
      success: false,
      error: 'AWS credentials not configured'
    });
  }

  const params = {
    Bucket: BUCKET_NAME,
    Prefix: 'qairoz-'
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error('Error listing S3 objects:', err);
      return res.json({
        success: false,
        error: `Failed to list backups: ${err.message}`
      });
    }

    const backups = data.Contents.map(object => ({
      name: object.Key,
      size: object.Size,
      lastModified: object.LastModified,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${object.Key}`
    })).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json({
      success: true,
      data: backups
    });
  });
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
