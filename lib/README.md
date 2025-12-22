# Library Directory - School Management System

This directory contains all the core utilities, types, and API functions for the School Management System.

## 📁 Directory Structure

```
lib/
├── supabase/          # Supabase client configuration
├── types/             # TypeScript type definitions
├── auth/              # Authentication utilities
└── api/               # API functions for data operations
```

## 🔧 Supabase (`lib/supabase/`)

### `client.ts`
**Browser-side Supabase client**

```typescript
import { supabase } from '@/lib/supabase/client';

// Use in React components and client-side code
const { data, error } = await supabase
  .from('students')
  .select('*');
```

**Features:**
- Safe to use in the browser
- Respects Row Level Security (RLS)
- Handles authentication automatically
- Persists session in localStorage

### `server.ts`
**Server-side Supabase admin client**

```typescript
import { supabaseAdmin } from '@/lib/supabase/server';

// Use ONLY in API routes and server-side code
const { data, error } = await supabaseAdmin
  .from('students')
  .select('*');
```

**⚠️ WARNING:**
- Bypasses RLS policies
- Should ONLY be used server-side
- Never expose in client code
- Use for admin operations only

### `database.types.ts`
Auto-generated TypeScript types for database tables.

## 📝 Types (`lib/types/`)

### `database.ts`
Complete TypeScript interfaces for all database entities.

**Enums:**
```typescript
UserRole, AttendanceStatus, AttendanceMode, LeaveStatus
```

**Core Types:**
```typescript
Profile, School, AcademicYear, Class, Teacher, Student
```

**Module Types:**
```typescript
AttendanceRecord, Subject, Assessment, Grade
CalendarEvent, Announcement, LeaveApplication
```

**Extended Types:**
```typescript
StudentWithProfile, TeacherWithProfile, GradeWithDetails
```

**Form Input Types:**
```typescript
CreateStudentInput, MarkAttendanceInput, EnterGradeInput
```

## 🔐 Authentication (`lib/auth/`)

### `auth-helpers.ts`
Utility functions for authentication.

```typescript
import { signIn, signOut, getCurrentUser, isSuperAdmin } from '@/lib/auth/auth-helpers';

// Sign in
const { data, error } = await signIn('email@example.com', 'password');

// Check role
const isAdmin = await isSuperAdmin();
```

**Available Functions:**
- `signIn(email, password)` - Sign in user
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get authenticated user
- `getCurrentUserProfile()` - Get user profile with role
- `hasRole(role)` - Check if user has specific role
- `isSuperAdmin()`, `isTeacher()`, `isStudent()`, `isParent()` - Role checks
- `sendPasswordResetEmail(email)` - Send reset email
- `updatePassword(newPassword)` - Update password

### `useAuth.ts`
React hooks for authentication.

```typescript
import { useAuth, useRequireAuth, useProfile } from '@/lib/auth/useAuth';

// In a component
function MyComponent() {
  const { user, profile, loading, isAuthenticated, role } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Welcome, {profile?.full_name}!</div>;
}
```

**Available Hooks:**
- `useAuth()` - Get auth state and user info
- `useRequireAuth(allowedRoles)` - Protect routes by role
- `useProfile()` - Get and update user profile
- `useSession()` - Get current session

## 🌐 API Functions (`lib/api/`)

### `students.ts`
Student CRUD operations.

```typescript
import { getStudents, getStudentById, searchStudents } from '@/lib/api/students';

// Get all students with pagination
const { data, error, count } = await getStudents(page, pageSize);

// Get single student
const { data, error } = await getStudentById(studentId);

// Search students
const { data, error } = await searchStudents('John');
```

**Available Functions:**
- `getStudents(page, pageSize)` - Get paginated students
- `getStudentById(id)` - Get single student with relations
- `getStudentsByClass(classId)` - Get students in a class
- `searchStudents(query)` - Search by name or admission number
- `updateStudent(id, updates)` - Update student info
- `deleteStudent(id)` - Soft delete student

### `attendance.ts`
Attendance operations.

```typescript
import { 
  markAttendance, 
  markBulkAttendance, 
  getStudentAttendanceSummary 
} from '@/lib/api/attendance';

// Mark single attendance
await markAttendance({
  student_id: 'uuid',
  class_id: 'uuid',
  date: '2024-01-15',
  status: 'present'
});

// Mark bulk attendance
await markBulkAttendance(classId, date, [
  { student_id: 'uuid1', status: 'present' },
  { student_id: 'uuid2', status: 'absent' }
]);

// Get attendance summary
const { data } = await getStudentAttendanceSummary(
  studentId, 
  '2024-01-01', 
  '2024-01-31'
);
// Returns: { total_days, present_days, absent_days, late_days, percentage }
```

**Available Functions:**
- `markAttendance(input)` - Mark single student attendance
- `markBulkAttendance(classId, date, data)` - Mark multiple students
- `getAttendanceByClassAndDate(classId, date)` - Get class attendance
- `getStudentAttendance(studentId, startDate, endDate)` - Get student records
- `getStudentAttendanceSummary(studentId, startDate, endDate)` - Get summary
- `getTodayAttendanceSummary(classId)` - Get today's summary

## 🎯 Usage Examples

### Example 1: Fetch and Display Students

```typescript
import { useEffect, useState } from 'react';
import { getStudents } from '@/lib/api/students';
import { StudentWithProfile } from '@/lib/types/database';

function StudentList() {
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await getStudents(1, 20);
      if (data) setStudents(data);
      setLoading(false);
    }
    fetchStudents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {students.map(student => (
        <li key={student.id}>{student.profile.full_name}</li>
      ))}
    </ul>
  );
}
```

### Example 2: Protected Route

```typescript
import { useRequireAuth } from '@/lib/auth/useAuth';
import { UserRole } from '@/lib/types/database';

function AdminPage() {
  const { loading, authorized } = useRequireAuth([UserRole.SUPER_ADMIN]);

  if (loading) return <div>Loading...</div>;
  if (!authorized) return <div>Unauthorized</div>;

  return <div>Admin Dashboard</div>;
}
```

### Example 3: Mark Attendance

```typescript
import { markBulkAttendance } from '@/lib/api/attendance';
import { AttendanceStatus } from '@/lib/types/database';

async function handleMarkAttendance(classId: string, date: string) {
  const attendanceData = [
    { student_id: 'uuid1', status: AttendanceStatus.PRESENT },
    { student_id: 'uuid2', status: AttendanceStatus.ABSENT },
    { student_id: 'uuid3', status: AttendanceStatus.LATE }
  ];

  const { data, error } = await markBulkAttendance(classId, date, attendanceData);
  
  if (error) {
    console.error('Error marking attendance:', error);
    return;
  }

  console.log('Attendance marked successfully!');
}
```

## 🔒 Security Best Practices

1. **Always use `client.ts` in browser code**
   - Respects RLS policies
   - Safe for client-side use

2. **Only use `server.ts` in API routes**
   - Bypasses RLS
   - Should never be exposed to client

3. **Validate user roles before operations**
   ```typescript
   const { isSuperAdmin } = useAuth();
   if (!isSuperAdmin) return <div>Access Denied</div>;
   ```

4. **Use TypeScript types**
   - Prevents runtime errors
   - Better IDE autocomplete

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Need to add more API functions?** Follow the pattern in `students.ts` and `attendance.ts`.

