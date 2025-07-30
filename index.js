const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Qairoz Backend Server...');
console.log('📡 Port:', PORT);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Environment-based configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('🌐 CORS enabled for:', allowedOrigins);

// AWS S3 Configuration
let s3Client = null;
let awsConfigured = false;

try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-north-1'
    });
    
    s3Client = new AWS.S3();
    awsConfigured = true;
    console.log('✅ AWS S3 configured successfully');
    console.log('📍 AWS Region:', process.env.AWS_REGION || 'eu-north-1');
    console.log('🪣 S3 Bucket:', process.env.AWS_S3_BUCKET_NAME || 'qairoz-data-storage');
  } else {
    console.log('⚠️ AWS credentials not found - S3 features will be disabled');
  }
} catch (error) {
  console.log('❌ AWS configuration failed:', error.message);
}

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
    status: 'healthy',
    awsConfigured: awsConfigured,
    endpoints: [
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats',
      'GET /api/test-s3',
      'POST /api/export-to-s3',
      'GET /api/backups'
    ]
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running perfectly',
    timestamp: new Date().toISOString(),
    port: PORT,
    colleges: colleges.length,
    students: students.length,
    awsConfigured: awsConfigured,
    uptime: process.uptime()
  });
});

// Get all colleges
app.get('/api/colleges', (req, res) => {
  try {
    console.log(`📚 GET /api/colleges - Returning ${colleges.length} colleges`);
    res.json({
      success: true,
      data: colleges,
      count: colleges.length
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
      data: students,
      count: students.length
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
app.get('/api/test-s3', async (req, res) => {
  try {
    if (!awsConfigured) {
      return res.json({
        success: false,
        error: 'AWS S3 not configured',
        details: {
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'not set',
          bucket: process.env.AWS_S3_BUCKET_NAME || 'not set'
        }
      });
    }

    // Test S3 connection by listing buckets
    const result = await s3Client.listBuckets().promise();
    
    res.json({
      success: true,
      message: 'AWS S3 connection successful',
      data: {
        bucketsFound: result.Buckets.length,
        region: process.env.AWS_REGION || 'eu-north-1',
        targetBucket: process.env.AWS_S3_BUCKET_NAME || 'qairoz-data-storage',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ S3 connection test failed:', error);
    res.json({
      success: false,
      error: 'S3 connection failed',
      details: error.message
    });
  }
});

// Export data to S3
app.post('/api/export-to-s3', async (req, res) => {
  try {
    if (!awsConfigured) {
      return res.json({
        success: false,
        error: 'AWS S3 not configured'
      });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'qairoz-data-storage';
    
    // Prepare data for export
    const exportData = {
      colleges,
      students,
      exportedAt: new Date().toISOString(),
      totalColleges: colleges.length,
      totalStudents: students.length
    };

    // Upload JSON file
    const jsonKey = `qairoz-data-${timestamp}.json`;
    await s3Client.putObject({
      Bucket: bucketName,
      Key: jsonKey,
      Body: JSON.stringify(exportData, null, 2),
      ContentType: 'application/json'
    }).promise();

    // Create CSV content
    const csvContent = [
      ['College Name', 'College Email', 'Student Name', 'Email', 'Phone', 'Roll Number', 'Course', 'Year', 'Sport', 'Registration Date'],
      ...students.map(student => [
        student.collegeName || 'Unknown',
        student.collegeEmail || 'N/A',
        student.name,
        student.email,
        student.phone,
        student.rollNumber,
        student.course,
        student.year,
        student.sport,
        new Date(student.registrationDate || student.uploadedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    // Upload CSV file
    const csvKey = `qairoz-students-${timestamp}.csv`;
    await s3Client.putObject({
      Bucket: bucketName,
      Key: csvKey,
      Body: csvContent,
      ContentType: 'text/csv'
    }).promise();

    res.json({
      success: true,
      message: 'Data exported to S3 successfully',
      data: {
        files: [
          { name: jsonKey, type: 'JSON', size: JSON.stringify(exportData).length },
          { name: csvKey, type: 'CSV', size: csvContent.length }
        ],
        bucket: bucketName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ S3 export failed:', error);
    res.status(500).json({
      success: false,
      error: 'S3 export failed',
      details: error.message
    });
  }
});

// Get S3 backups
app.get('/api/backups', async (req, res) => {
  try {
    if (!awsConfigured) {
      return res.json({
        success: false,
        error: 'AWS S3 not configured'
      });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'qairoz-data-storage';
    
    const result = await s3Client.listObjectsV2({
      Bucket: bucketName,
      Prefix: 'qairoz-'
    }).promise();

    const backups = result.Contents.map(obj => ({
      name: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: s3Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: obj.Key,
        Expires: 3600 // 1 hour
      })
    }));

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('❌ Failed to get S3 backups:', error);
    res.json({
      success: false,
      error: 'Failed to get backups',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.message);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/students',
      'POST /api/students',
      'GET /api/colleges',
      'GET /api/stats',
      'GET /api/test-s3',
      'POST /api/export-to-s3',
      'GET /api/backups'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Qairoz Backend Server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for:`, allowedOrigins);
  console.log(`💾 In-memory storage initialized`);
  console.log(`☁️ AWS S3 Status: ${awsConfigured ? 'Configured' : 'Not configured'}`);
  console.log('✅ Server startup complete!');
});
