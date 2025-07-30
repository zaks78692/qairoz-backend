# Qairoz Backend - Railway Deployment Guide

## 🚀 Quick Deploy to Railway

This backend is ready for Railway deployment with zero configuration needed.

### Prerequisites
- Node.js 18+ 
- Railway account ([railway.app](https://railway.app))

### 1. Deploy to Railway

#### Option A: Direct GitHub Deploy (Recommended)
1. Push this repository to GitHub
2. Go to [railway.app](https://railway.app) and sign in
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway will automatically detect and deploy your Node.js app

#### Option B: Railway CLI Deploy
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize and deploy
railway init
railway up
```

### 2. Configure Environment Variables

In your Railway dashboard, add these environment variables:

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-url.netlify.app,http://localhost:5173
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 3. Update Frontend Configuration

After deployment, update your frontend's `.env` file:

```env
VITE_API_URL=https://your-railway-app.railway.app/api
```

## 📡 API Endpoints

Once deployed, your API will be available at:

- `GET /` - Server info
- `GET /api/health` - Health check
- `GET /api/students` - Get all students
- `POST /api/students` - Upload student data
- `GET /api/colleges` - Get all colleges
- `GET /api/stats` - Get statistics
- `POST /api/export-to-s3` - Export to AWS S3
- `GET /api/test-s3` - Test S3 connection
- `GET /api/backups` - List S3 backups

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

Server runs on `http://localhost:3001`

## 🌐 CORS Configuration

The server is configured to accept requests from:
- `http://localhost:5173` (local development)
- Your production frontend URL (set via ALLOWED_ORIGINS)

## 📊 Features

- ✅ Express.js REST API
- ✅ CORS enabled for frontend communication
- ✅ File upload support with Multer
- ✅ AWS S3 integration ready
- ✅ Health check endpoint
- ✅ Environment-based configuration
- ✅ Production-ready error handling

## 🚨 Important Notes

1. **Environment Variables**: Make sure to set ALLOWED_ORIGINS to your frontend URL
2. **AWS S3**: Optional - app works without it, but cloud backup features require AWS setup
3. **Database**: Currently uses in-memory storage. Can be upgraded to PostgreSQL on Railway
4. **HTTPS**: Railway provides automatic HTTPS for all deployments

## 🆘 Troubleshooting

### Deployment Issues
- Check Railway logs in dashboard
- Ensure Node.js version is 18+
- Verify environment variables are set

### CORS Issues
- Make sure ALLOWED_ORIGINS includes your frontend URL
- Check that frontend is making requests to correct API URL

### AWS S3 Issues
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists in specified region

## 📞 Support

For deployment issues:
1. Check Railway documentation
2. Review server logs in Railway dashboard
3. Test API endpoints with tools like Postman

---

**Ready to deploy!** 🚀