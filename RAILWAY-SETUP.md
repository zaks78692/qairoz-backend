# 🚀 Railway Deployment Instructions

Follow these steps to deploy your Qairoz backend to Railway:

## Step 1: Create GitHub Repository

1. **Go to [GitHub.com](https://github.com) and sign in**
2. **Click "New Repository"**
3. **Repository settings:**
   - Name: `qairoz-backend` (or any name you prefer)
   - Description: `Backend server for Qairoz inter-college sports platform`
   - Set to **Public** (for free Railway deployment)
   - ✅ Check "Add a README file"
   - Choose `.gitignore` template: **Node**
   - License: **MIT** (optional)

## Step 2: Upload Your Code

### Option A: Using GitHub Web Interface (Easiest)
1. **Download all files from the `/server` directory**
2. **In your new GitHub repo, click "uploading an existing file"**
3. **Drag and drop all server files:**
   - `index.js`
   - `package.json`
   - `railway.json`
   - `.env.example`
   - `.gitignore`
4. **Commit with message:** `Initial backend setup for Railway deployment`

### Option B: Using Git Commands (If you have Git installed)
```bash
# Clone your new repository
git clone https://github.com/YOUR_USERNAME/qairoz-backend.git
cd qairoz-backend

# Copy all server files to this directory
# Then commit and push
git add .
git commit -m "Initial backend setup for Railway deployment"
git push origin main
```

## Step 3: Deploy to Railway

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up/Sign in with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your `qairoz-backend` repository**
6. **Railway will automatically:**
   - Detect it's a Node.js project
   - Install dependencies
   - Start the server
   - Provide you with a live URL

## Step 4: Configure Environment Variables

1. **In Railway dashboard, go to your project**
2. **Click "Variables" tab**
3. **Add these variables:**

```
NODE_ENV=production
ALLOWED_ORIGINS=https://your-netlify-frontend-url.netlify.app
PORT=3001
```

**Optional AWS S3 variables (for cloud backup features):**
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

## Step 5: Update Frontend Configuration

1. **Copy your Railway URL** (looks like: `https://qairoz-backend-production.railway.app`)
2. **Update your frontend's environment:**
   - If deployed on Netlify: Add environment variable `VITE_API_URL=https://your-railway-url.railway.app/api`
   - If running locally: Update `.env` file with `VITE_API_URL=https://your-railway-url.railway.app/api`

## Step 6: Test Your Deployment

1. **Visit your Railway URL** - you should see: `{"message": "Qairoz Backend Server is running!"}`
2. **Test health endpoint:** `https://your-railway-url.railway.app/api/health`
3. **Test from your frontend** - try adding a student to verify connection

## 🎉 You're Done!

Your backend is now live and accessible from anywhere! 

### What you get:
- ✅ **Live API** accessible 24/7
- ✅ **Automatic HTTPS** 
- ✅ **Auto-scaling** based on traffic
- ✅ **Monitoring** and logs in Railway dashboard
- ✅ **Custom domain** support (optional)

### Next Steps:
- Monitor your app in Railway dashboard
- Set up AWS S3 for cloud backups (optional)
- Add a custom domain (optional)
- Upgrade to PostgreSQL database when needed

---

**Need help?** Check the Railway documentation or the troubleshooting section in README-DEPLOYMENT.md