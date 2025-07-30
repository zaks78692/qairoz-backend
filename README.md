# Qairoz - Inter-College Championships Platform

A comprehensive platform for managing inter-college sports competitions with backend integration and OneDrive sync capabilities.

## 🚀 Features

### Frontend (React + TypeScript)
- **College Registration & Management**
- **Student Registration System**
- **Tournament Management**
- **Real-time Dashboard**
- **Data Export (CSV)**
- **OneDrive Integration**
- **Responsive Design**

### Backend (Node.js + Express)
- **RESTful API**
- **Data Aggregation from Multiple Colleges**
- **OneDrive Integration**
- **Real-time Statistics**
- **Data Export & Backup**

## 🏗️ Architecture

```
Frontend (React)     Backend (Node.js)     OneDrive
     │                      │                  │
     ├─ College Dashboard    ├─ Student API     ├─ JSON Backup
     ├─ Student Management   ├─ College API     ├─ CSV Export
     ├─ Data Sync           ├─ Stats API       └─ File Storage
     └─ OneDrive Export     └─ OneDrive API
```

## 🛠️ Setup Instructions

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Start backend server
npm start
```

### 3. OneDrive Integration Setup

#### Step 1: Create Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in the details:
   - **Name:** Qairoz OneDrive Integration
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** `http://localhost:5173/auth/callback`

#### Step 2: Configure App Permissions
1. Go to "API permissions"
2. Add permissions:
   - **Microsoft Graph** > **Delegated permissions**
   - Add: `Files.ReadWrite`, `User.Read`
3. Grant admin consent

#### Step 3: Get App Credentials
1. Go to "Overview" and copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**
2. Go to "Certificates & secrets"
3. Create new client secret and copy the value

#### Step 4: Configure Environment Variables
```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your Azure app details
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
```

## 📊 API Endpoints

### Students
- `GET /api/students` - Get all students from all colleges
- `POST /api/students` - Upload students from a college

### Colleges
- `GET /api/colleges` - Get all registered colleges

### Statistics
- `GET /api/stats` - Get comprehensive statistics

### OneDrive
- `POST /api/export-to-onedrive` - Export data to OneDrive

### Health
- `GET /api/health` - Server health check

## 💾 Data Flow

### 1. College Registration
```
College Dashboard → Local Storage → Backend API → Central Database
```

### 2. Data Aggregation
```
Multiple Colleges → Backend Server → Consolidated Data → Admin Dashboard
```

### 3. OneDrive Backup
```
Backend Data → Microsoft Graph API → OneDrive → JSON + CSV Files
```

## 🔐 Authentication & Security

### College Authentication
- Email/password based login
- Local session management
- Secure data validation

### OneDrive Authentication
- OAuth 2.0 flow
- Microsoft Graph API
- Secure token handling

## 📁 OneDrive File Structure

```
OneDrive/
└── Qairoz Data/
    ├── qairoz-data-2024-01-15.json     # Complete data backup
    ├── qairoz-students-2024-01-15.csv  # Student data in CSV
    └── [Additional dated backups...]
```

## 🎯 Usage Guide

### For Colleges:
1. **Register College** - Create account via login page
2. **Add Students** - Use dashboard to register students
3. **Sync Data** - Upload to backend server
4. **Backup** - Export to OneDrive for safety

### For Administrators:
1. **View Dashboard** - See all college data
2. **Monitor Stats** - Track registrations and participation
3. **Export Data** - Download consolidated reports
4. **Manage Tournaments** - Create and manage events

## 🚀 Deployment

### Frontend Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### Backend Deployment
```bash
# Deploy to your preferred hosting service (Heroku, Railway, etc.)
# Set environment variables in production
```

## 🔧 Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
VITE_MICROSOFT_CLIENT_ID=your_client_id
```

### Backend (.env)
```
PORT=3001
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
```

## 📈 Features Roadmap

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Payment gateway integration
- [ ] Multi-sport support
- [ ] Tournament bracket generation
- [ ] Live scoring system

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@qairoz.org
- Documentation: [docs.qairoz.org](https://docs.qairoz.org)
- Issues: [GitHub Issues](https://github.com/qairoz/platform/issues)

---

**Built with ❤️ for the inter-college sports community**