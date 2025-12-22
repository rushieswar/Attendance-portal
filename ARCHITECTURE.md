# System Architecture - School Management Portal

## Overview

This document describes the architecture of the Attendance & Academic Management Portal based on the core concept requirements.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Bootstrap 5 + Custom SCSS
- **State Management**: Zustand (lightweight) + React Query
- **Forms**: Formik + Yup validation
- **Charts**: ApexCharts
- **UI Components**: Existing Facit template components

### Backend
- **Database**: Supabase (PostgreSQL 15)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes + Supabase Client
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

### Security
- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access Control (RBAC)**: 4 roles (super_admin, teacher, student, parent)
- **Authentication**: Email/Password (can extend to OAuth)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Browser)                   │
├─────────────────────────────────────────────────────────────┤
│  Next.js Pages (SSR/CSR)                                    │
│  ├── Dashboard (role-specific)                              │
│  ├── Attendance Management                                  │
│  ├── Academic Management                                    │
│  ├── Calendar & Announcements                               │
│  └── User Management                                        │
│                                                              │
│  React Components                                           │
│  ├── Facit Template Components                             │
│  ├── Custom School Components                              │
│  └── Shared UI Components                                  │
│                                                              │
│  State Management                                           │
│  ├── Supabase Auth Context (user, profile, role)          │
│  ├── React Query (data caching, sync)                     │
│  └── Zustand (global app state)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  API Routes (/pages/api/)                                   │
│  ├── /api/students/*                                        │
│  ├── /api/attendance/*                                      │
│  ├── /api/grades/*                                          │
│  └── /api/admin/*                                           │
│                                                              │
│  Server-Side Functions                                      │
│  ├── Authentication middleware                              │
│  ├── Role verification                                      │
│  ├── Data validation (Zod)                                 │
│  └── Business logic                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                        │
│  ├── Core Tables (profiles, schools, students, teachers)   │
│  ├── Attendance Tables (attendance_records)                │
│  ├── Academic Tables (subjects, assessments, grades)       │
│  └── Communication (announcements, calendar_events)        │
│                                                              │
│  Row Level Security (RLS) Policies                         │
│  ├── Super Admin: Full access to school data              │
│  ├── Teacher: Access to assigned classes                  │
│  ├── Student: Access to own data only                     │
│  └── Parent: Access to children's data only               │
│                                                              │
│  Database Functions & Triggers                             │
│  ├── Auto-update timestamps                                │
│  ├── Attendance percentage calculation                     │
│  └── Role verification helpers                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow
```
1. User enters credentials
   ↓
2. Supabase Auth validates
   ↓
3. Fetch user profile (with role)
   ↓
4. Store in Auth Context
   ↓
5. Redirect to role-specific dashboard
```

### Attendance Marking Flow
```
1. Teacher selects class & date
   ↓
2. Fetch student list (RLS: only assigned classes)
   ↓
3. Mark attendance (present/absent/late)
   ↓
4. Bulk upsert to database
   ↓
5. Real-time update to dashboard
   ↓
6. Parent can view (RLS: only their children)
```

### Grade Entry Flow
```
1. Teacher/Admin creates assessment
   ↓
2. Link assessment to classes & subjects
   ↓
3. Enter marks for students
   ↓
4. Validate marks <= max_marks
   ↓
5. Store in grades table
   ↓
6. Students/Parents can view (RLS enforced)
```

## Database Schema

### Core Entities

**profiles** (extends auth.users)
- User information and role
- Links to school

**schools**
- School information
- Settings (attendance mode, etc.)

**academic_years**
- Year definitions
- Current year flag

**classes**
- Class/Grade sections
- Linked to academic year

**teachers**
- Teacher-specific data
- Subjects taught

**students**
- Student-specific data
- Links to class and parent

### Attendance Module

**attendance_records**
- Daily or period-wise records
- Status: present/absent/late
- Marked by teacher

### Academic Module

**subjects**
- Subject definitions per grade

**assessments**
- Flexible exam/test structure
- No hardcoded types

**assessment_classes**
- Links assessments to classes

**grades**
- Student marks for assessments

### Communication Module

**calendar_events**
- School calendar
- Read-only for non-admins

**announcements**
- One-way communication
- Target audience selection

**leave_applications**
- Parent-initiated
- Admin/Teacher approval

## Security Model

### Row Level Security (RLS) Policies

#### Super Admin
- Full CRUD on all tables within their school
- Can create users, classes, assessments
- View all reports and analytics

#### Teacher
- Read: Students in assigned classes
- Write: Attendance for assigned classes
- Write: Grades for assigned subjects
- Read: School calendar and announcements

#### Student
- Read: Own attendance records
- Read: Own grades
- Read: School calendar and announcements
- No write access

#### Parent
- Read: Children's attendance and grades
- Write: Leave applications for children
- Write: Acknowledgment of announcements
- No access to other students

### Data Isolation

- All queries automatically filtered by school_id
- RLS policies enforce role-based access
- No cross-school data leakage
- Audit logs for sensitive operations

## Scalability Considerations

### Current Phase (Single School)
- Optimized for 100-1000 students
- Single database instance
- Supabase free/pro tier sufficient

### Future Phase (Multi-School)
- Add school_id to all queries
- Implement tenant isolation
- Consider database sharding
- Upgrade to Supabase Team/Enterprise

## Performance Optimizations

### Database
- Indexes on frequently queried columns
- Materialized views for reports
- Pagination for large datasets
- Connection pooling

### Frontend
- React Query for caching
- Lazy loading of components
- Image optimization (Next.js)
- Code splitting

### Real-time
- Selective subscriptions
- Debounced updates
- Optimistic UI updates

## Deployment Architecture

### Development
```
Local Machine
├── Next.js Dev Server (localhost:3000)
└── Supabase Cloud (dev project)
```

### Production
```
Vercel (Frontend + API)
├── Edge Network (CDN)
├── Serverless Functions (API Routes)
└── Supabase Cloud (Production)
    ├── PostgreSQL Database
    ├── Auth Service
    ├── Storage Service
    └── Realtime Service
```

## Monitoring & Observability

- **Error Tracking**: Sentry (recommended)
- **Performance**: Vercel Analytics
- **Database**: Supabase Dashboard
- **Logs**: Vercel Logs + Supabase Logs

## Backup & Recovery

- **Database**: Supabase automatic backups (daily)
- **Point-in-Time Recovery**: Available on Pro plan
- **File Storage**: Supabase Storage with versioning
- **Disaster Recovery**: Export data regularly

## Compliance & Privacy

- **Data Privacy**: GDPR/COPPA compliant
- **Data Retention**: Configurable per school
- **Audit Logs**: Track all data modifications
- **Encryption**: At rest and in transit

---

This architecture supports the core concept requirements while remaining flexible for future enhancements.

