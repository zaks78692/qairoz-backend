const express = require('express');
const cors = require('cors');
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
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('🌐 CORS enabled for:', allowedOrigins);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage
let colleges = [];
let students = [];

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Qairoz Backend Server is running!', 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats'
    ]
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    colleges: colleges.length,
    students: students.length
  });
});

// Get all colleges
app.get('/api/colleges', (req, res) => {
  try {
    console.log(`📚 GET /api/colleges - Returning ${colleges.length} colleges`);
    res.json({
      success: true,
      data: colleges
    });
  } catch (error) {
    console.error('❌ Error getting colleges:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get colleges' 
    });
  }
});

// Get all students
app.get('/api/students', (req, res) => {
  try {
    console.log(`👥 GET /api/students - Returning ${students.length} students`);
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('❌ Error getting students:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get students' 
    });
  }
});

// Upload students data
app.post('/api/students', (req, res) => {
  try {
    const { collegeName, students: studentData, collegeInfo } = req.body;
    
    console.log(`📤 POST /api/students - College: ${collegeName}, Students: ${studentData?.length || 0}`);
    
    if (!collegeName || !studentData || !Array.isArray(studentData)) {
      console.log('❌ Invalid data format received');
      return res.status(400).json({ 
        success: false,
        error: 'Invalid data format. Expected: {collegeName, students: [], collegeInfo}' 
      });
    }

    // Add or update college
    const existingCollegeIndex = colleges.findIndex(c => c.name === collegeName);
    const collegeData = {
      name: collegeName,
      email: collegeInfo?.email || '',
      studentCount: studentData.length,
      lastUpdated: new Date().toISOString(),
      registeredAt: existingCollegeIndex >= 0 ? colleges[existingCollegeIndex].registeredAt : new Date().toISOString()
    };

    if (existingCollegeIndex >= 0) {
      colleges[existingCollegeIndex] = collegeData;
      console.log(`✏️ Updated existing college: ${collegeName}`);
    } else {
      colleges.push(collegeData);
      console.log(`➕ Added new college: ${collegeName}`);
    }

    // Add students with college info
    const studentsWithCollege = studentData.map(student => ({
      ...student,
      collegeName,
      collegeEmail: collegeInfo?.email || '',
      uploadedAt: new Date().toISOString()
    }));

    // Remove existing students from this college and add new ones
    const oldStudentCount = students.length;
    students = students.filter(s => s.collegeName !== collegeName);
    students.push(...studentsWithCollege);
    
    console.log(`🔄 Replaced ${oldStudentCount - (students.length - studentData.length)} old students with ${studentData.length} new students`);
    console.log(`📊 Total students now: ${students.length}`);

    res.json({ 
      success: true,
      message: 'Students uploaded successfully', 
      data: {
        collegeName,
        studentsUploaded: studentData.length,
        totalStudents: students.length,
        totalColleges: colleges.length
      }
    });
  } catch (error) {
    console.error('❌ Error uploading students:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error while uploading students' 
    });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    console.log(`📊 GET /api/stats - Calculating stats for ${students.length} students`);
    
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
      // Sport breakdown
      if (student.sport) {
        stats.sportBreakdown[student.sport] = (stats.sportBreakdown[student.sport] || 0) + 1;
      }
      
      // Course breakdown
      if (student.course) {
        stats.courseBreakdown[student.course] = (stats.courseBreakdown[student.course] || 0) + 1;
      }
      
      // Year breakdown
      if (student.year) {
        stats.yearBreakdown[student.year] = (stats.yearBreakdown[student.year] || 0) + 1;
      }
      
      // College breakdown
      if (student.collegeName) {
        stats.collegeBreakdown[student.collegeName] = (stats.collegeBreakdown[student.collegeName] || 0) + 1;
      }
    });

    console.log(`📈 Stats calculated: ${Object.keys(stats.sportBreakdown).length} sports, ${Object.keys(stats.collegeBreakdown).length} colleges`);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to calculate statistics' 
    });
  }
});

// Test S3 connection
app.get('/api/test-s3', (req, res) => {
  console.log('🔍 Testing S3 connection...');
  
  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not configured');
    return res.status(500).json({
      success: false,
      error: 'AWS credentials not configured',
      message: 'Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables',
      timestamp: new Date().toISOString(),
      envCheck: {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION || 'not set',
        AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'not set'
      }
    });
  }

  // Test S3 connection by listing buckets
  s3.listBuckets((err, data) => {
    if (err) {
      console.error('❌ S3 connection failed:', err.message);
      res.status(500).json({
        success: false,
        error: 'S3 connection failed',
        message: err.message,
        timestamp: new Date().toISOString(),
        envCheck: {
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
          AWS_REGION: process.env.AWS_REGION || 'not set',
          AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'not set'
        }
      });
    } else {
      console.log('✅ S3 connection successful');
      res.json({
        success: true,
        message: 'S3 connection test successful',
        data: {
          buckets: data.Buckets.map(bucket => bucket.Name),
          region: process.env.AWS_REGION || 'eu-north-1',
          targetBucket: BUCKET_NAME,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
});

// Export to S3
app.post('/api/export-to-s3', (req, res) => {
  console.log('📤 Starting S3 export...');
  
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const timeString = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Prepare data for export
    const exportData = {
      colleges,
      students,
      stats: {
        totalColleges: colleges.length,
        totalStudents: students.length,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Qairoz System'
      }
    };
    
    // Convert students to CSV format
    const csvHeader = 'College Name,College Email,Student Name,Email,Phone,Roll Number,Course,Year,Sport,Registration Date\n';
    const csvData = students.map(student => [
      student.collegeName || 'Unknown',
      student.collegeEmail || 'N/A',
      student.name,
      student.email,
      student.phone,
      student.rollNumber,
      student.course,
      student.year,
      student.sport,
      new Date(student.uploadedAt || student.registrationDate || new Date()).toLocaleDateString()
    ].map(field => `"${field}"`).join(',')).join('\n');
    
    const csvContent = csvHeader + csvData;
    
    // Upload JSON file
    const jsonKey = `qairoz-data-${timestamp}-${timeString}.json`;
    const jsonParams = {
      Bucket: BUCKET_NAME,
      Key: jsonKey,
      Body: JSON.stringify(exportData, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    };
    
    // Upload CSV file
    const csvKey = `qairoz-students-${timestamp}-${timeString}.csv`;
    const csvParams = {
      Bucket: BUCKET_NAME,
      Key: csvKey,
      Body: csvContent,
      ContentType: 'text/csv',
      ServerSideEncryption: 'AES256'
    };
    
    // Upload both files
    Promise.all([
      new Promise((resolve, reject) => {
        s3.upload(jsonParams, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }),
      new Promise((resolve, reject) => {
        s3.upload(csvParams, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      })
    ]).then((results) => {
      console.log('✅ S3 export successful');
      
      const files = [
        {
          name: jsonKey,
          size: JSON.stringify(exportData).length,
          url: results[0].Location,
          type: 'JSON'
        },
        {
          name: csvKey,
          size: csvContent.length,
          url: results[1].Location,
          type: 'CSV'
        }
      ];
      
      res.json({
        success: true,
        message: 'Data exported to S3 successfully',
        data: {
          files,
          bucket: BUCKET_NAME,
          timestamp: new Date().toISOString(),
          totalColleges: colleges.length,
          totalStudents: students.length
        }
      });
    }).catch((error) => {
      console.error('❌ S3 upload failed:', error);
      res.status(500).json({
        success: false,
        error: 'S3 upload failed',
        message: error.message
      });
    });
    
  } catch (error) {
    console.error('❌ S3 export error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Export failed',
      message: error.message
    });
  }
});

// Get backups from S3
app.get('/api/backups', (req, res) => {
  console.log('📋 Fetching S3 backups...');
  
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: 'qairoz-'
  };
  
  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error('❌ Failed to fetch S3 backups:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch backups',
        message: err.message
      });
    } else {
      const backups = data.Contents.map(object => ({
        name: object.Key,
        size: object.Size,
        lastModified: object.LastModified,
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${object.Key}`
      })).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      
      console.log(`✅ Found ${backups.length} backup files`);
      res.json({
        success: true,
        data: backups
      });
    }
  });
});

// Clear all data (for testing)
app.delete('/api/clear', (req, res) => {
  try {
    const oldColleges = colleges.length;
    const oldStudents = students.length;
    
    colleges = [];
    students = [];
    
    console.log(`🗑️ Cleared ${oldColleges} colleges and ${oldStudents} students`);
    
    res.json({
      success: true,
      message: 'All data cleared successfully',
      data: {
        clearedColleges: oldColleges,
        clearedStudents: oldStudents
      }
    });
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear data'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    requestedRoute: `${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats',
      'DELETE /api/clear'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Qairoz Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for:`, allowedOrigins);
  console.log(`💾 In-memory storage initialized`);
  console.log(`⏰ Server started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
