# NFC Attendance System

A complete, production-grade NFC-based attendance management system for IT companies. Built with Next.js 15, TypeScript, and Turso database.

## 🎯 Features

### Admin Dashboard
- **Real-time Statistics**: Live attendance tracking with auto-refresh
- **Employee Management**: Full CRUD operations for employee records
- **NFC Enrollment**: Bind NFC tags to employees with simulation mode
- **Attendance Reports**: Advanced filtering, pagination, and CSV export
- **Reader Device Management**: Monitor and configure NFC readers
- **Settings & Configuration**: Environment-based API endpoint management

### Mobile PWA
- **Progressive Web App**: Installable on mobile devices
- **NFC Check-in/Check-out**: Web NFC API support for Android Chrome
- **Offline Support**: Local buffering with automatic sync
- **Service Worker**: Background sync and caching

### Reader Agent
- **USB/Ethernet Support**: Standalone Node.js agent for hardware readers
- **Offline Buffering**: Automatic retry and sync when connection returns
- **Health Monitoring**: Built-in HTTP endpoints for status checks
- **Multiple Reader Support**: Run multiple agents for different locations

### Security & Authentication
- **Better Auth (JWT)**: Secure authentication with bearer tokens
- **Role-Based Access Control (RBAC)**: Admin, HR, Reader, Employee roles
- **Protected Routes**: Middleware-based route protection
- **Session Management**: Persistent sessions with automatic refresh

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
# or
npm install
```

### 2. Run Development Server

```bash
bun dev
# or
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 3. Login

**Admin Account:**
- Email: `admin@company.com`
- Password: `password123`

**Employee Account:**
- Email: `john.doe@company.com`
- Password: `password123`

## 📱 Pages

- `/` - Homepage with system info
- `/login` - Authentication
- `/register` - User registration
- `/dashboard` - Admin dashboard (requires login)
- `/dashboard/employees` - Employee management
- `/dashboard/enrollments` - NFC tag enrollment
- `/dashboard/attendance` - Attendance reports
- `/dashboard/readers` - Reader device management
- `/dashboard/settings` - System configuration
- `/mobile` - Mobile PWA for check-in/check-out

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/[...all]` - Better Auth endpoints

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Enrollments
- `GET /api/enrollments` - List enrollments
- `POST /api/enrollments` - Create enrollment
- `DELETE /api/enrollments/[id]` - Remove enrollment

### Attendance
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out
- `GET /api/attendance` - List attendance (with filters)
- `GET /api/attendance/today` - Today's attendance
- `POST /api/attendance/manual` - Manual entry

### Readers
- `GET /api/readers` - List readers
- `POST /api/readers` - Create reader
- `PUT /api/readers/[id]` - Update reader

## 🤖 Reader Agent

For USB/Ethernet NFC readers:

```bash
cd reader-agent
npm install
cp .env.example .env
npm start
```

See `reader-agent/README.md` for details.

## 🗄️ Database

Pre-seeded with:
- 20 employees across 5 departments
- 18 active NFC tags
- 3 reader devices
- ~490 attendance records (30 days)

Access Database Studio via the UI tab at the top right.

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Turso (SQLite)
- **ORM**: Drizzle
- **Auth**: Better Auth (JWT)
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React

## ✨ Key Features

✅ Complete Admin Dashboard
✅ Mobile PWA with offline support
✅ Reader Agent for hardware integration
✅ Authentication & RBAC
✅ Real-time updates (auto-refresh)
✅ Offline-first architecture
✅ CSV export
✅ Health monitoring
✅ Pre-loaded demo data

---

**Built with ❤️ using Next.js 15, TypeScript, Turso, and Better Auth**