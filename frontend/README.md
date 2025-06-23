# Library Tracker Frontend

A React-based web application for tracking personal reading progress and managing book collections.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Firebase configuration values.

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Modal, etc.)
│   ├── auth/           # Authentication components
│   ├── books/          # Book-related components
│   └── dashboard/      # Dashboard components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── services/           # API service functions
├── utils/              # Utility functions
├── config/             # Configuration files
├── styles/             # Global styles
└── assets/             # Static assets
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# Environment
VITE_NODE_ENV=development
```

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and configure Google OAuth provider
3. Copy the configuration values to your `.env` file

## 🎨 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **HTTP Client**: Axios
- **Code Quality**: ESLint + Prettier

## 📱 Features

### Sprint 1.1 (Current)
- ✅ Project setup with React + Vite
- ✅ Tailwind CSS configuration
- ✅ Firebase Authentication setup
- ✅ Google OAuth integration
- ✅ Basic landing page
- ✅ Development environment configuration

### Upcoming Features
- User dashboard
- Book management (CRUD operations)
- Reading progress tracking
- Search and filtering
- Reading statistics

## 🧪 Testing

The application includes environment setup tests that run automatically on startup. Check the browser console for test results.

## 🚀 Deployment

This application is configured for deployment on Netlify. See the main project documentation for deployment instructions.

## 📄 License

This project is part of the Library Tracker application. See the main project README for license information.
