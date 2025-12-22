# Three-Role System: Students as Data Entities

## Overview

The system has been updated to support **only three user roles**:
1. **Super Admin** (Directors/Principals) - Full control
2. **Teachers** - Limited to assigned classes, mark attendance, enter grades
3. **Parents** - View children's data, apply for leave, acknowledge notices

**Important:** Students are **NOT users** - they are data entities managed by parents.

## Key Changes

### 1. User Roles Enum
```typescript
// Before (4 roles)
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    TEACHER = 'teacher',
    STUDENT = 'student',  // ❌ REMOVED
    PARENT = 'parent',
}

// After (3 roles)
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    TEACHER = 'teacher',
    PARENT = 'parent',
}
```

### 2. Students Table Structure

**Before (Students as Users):**
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),  -- ❌ Linked to auth user
    admission_number VARCHAR(50),
    class_id UUID,
    date_of_birth DATE,
    parent_id UUID,
    ...
);
```

**After (Students as Data Entities):**
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,  -- ✅ Name stored directly
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    class_id UUID REFERENCES classes(id),
    date_of_birth DATE NOT NULL,
    parent_id UUID REFERENCES profiles(id) NOT NULL,  -- ✅ Required parent link
    enrollment_date DATE NOT NULL,
    gender VARCHAR(10),
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact VARCHAR(20),
    medical_conditions TEXT,
    ...
);
```

### 3. Data Model Clarification

#### Students Are Data Entities
- Students **DO NOT** have login credentials
- Students **DO NOT** have user accounts in `auth.users`
- Students **DO NOT** have profiles in the `profiles` table
- Students are records in the `students` table (like attendance or grades)

#### Parents Manage Students
- Parents log in with their credentials
- Parents can view/manage their children's data
- Each student **MUST** be linked to a parent via `parent_id`
- One parent can have multiple children (students)

#### Access Control
- **Super Admins**: Full access to all student records
- **Teachers**: Can view all students, mark attendance, enter grades
- **Parents**: Can only view/update their own children's data

## Updated RLS Policies

### Students Table Policies

```sql
-- Super admins: Full access
CREATE POLICY "Super admins full access to students"
ON students FOR ALL
USING (is_super_admin());

-- Teachers: View and update all students
CREATE POLICY "Teachers can view students"
ON students FOR SELECT
USING (get_user_role() = 'teacher');

CREATE POLICY "Teachers can update students"
ON students FOR UPDATE
USING (get_user_role() = 'teacher');

-- Parents: View and update their own children
CREATE POLICY "Parents can view their children"
ON students FOR SELECT
USING (parent_id = auth.uid());

CREATE POLICY "Parents can update their children"
ON students FOR UPDATE
USING (parent_id = auth.uid());
```

### Attendance Policies

```sql
-- Super admins: Full access
CREATE POLICY "Super admins can manage attendance"
ON attendance_records FOR ALL
USING (is_super_admin());

-- Teachers: Mark and view all attendance
CREATE POLICY "Teachers can manage attendance"
ON attendance_records FOR ALL
USING (get_user_role() = 'teacher');

-- Parents: View their children's attendance only
CREATE POLICY "Parents can view children attendance"
ON attendance_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = attendance_records.student_id
        AND s.parent_id = auth.uid()
    )
);
```

### Grades Policies

```sql
-- Super admins: Full access
CREATE POLICY "Super admins can manage grades"
ON grades FOR ALL
USING (is_super_admin());

-- Teachers: Enter and view all grades
CREATE POLICY "Teachers can manage grades"
ON grades FOR ALL
USING (get_user_role() = 'teacher');

-- Parents: View their children's grades only
CREATE POLICY "Parents can view children grades"
ON grades FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = grades.student_id
        AND s.parent_id = auth.uid()
    )
);
```

## TypeScript Types

### Student Interface

```typescript
export interface Student {
    id: string;
    full_name: string;  // ✅ Stored directly
    admission_number: string;
    class_id: string | null;
    date_of_birth: string;
    parent_id: string;  // ✅ Required
    enrollment_date: string;
    gender: string | null;
    blood_group: string | null;
    address: string | null;
    emergency_contact: string | null;
    medical_conditions: string | null;
    created_at: string;
    updated_at: string;
}
```

### Extended Types

```typescript
// Students always have a parent
export interface StudentWithParent extends Student {
    parent: Profile;  // Parent profile
    class?: Class;
}
```

### Form Input Types

```typescript
export interface CreateStudentInput {
    full_name: string;
    admission_number: string;
    class_id: string;
    date_of_birth: string;
    parent_id: string;  // ✅ Required - link to existing parent
    enrollment_date: string;
    gender?: string;
    blood_group?: string;
    address?: string;
    emergency_contact?: string;
    medical_conditions?: string;
}
```

## API Functions

### Creating Students

```typescript
// Create a student record (no user account created)
const newStudent = await createStudent({
    full_name: "John Doe",
    admission_number: "2024001",
    class_id: "class-uuid",
    date_of_birth: "2010-05-15",
    parent_id: "parent-user-uuid",  // Must be existing parent user
    enrollment_date: "2024-01-15",
    gender: "Male",
    blood_group: "O+",
});
```

### Fetching Students

```typescript
// Get all students (teachers/admins)
const { data: students } = await getStudents();

// Get students by parent (for parent dashboard)
const { data: myChildren } = await getStudentsByParent(parentId);

// Get students by class (for attendance)
const { data: classStudents } = await getStudentsByClass(classId);
```

## Authentication Flow

### Who Can Log In?

| Role | Can Log In? | Purpose |
|------|-------------|---------|
| Super Admin | ✅ Yes | Full system management |
| Teacher | ✅ Yes | Mark attendance, enter grades |
| Parent | ✅ Yes | View children's data, apply for leave |
| Student | ❌ No | Data entity only |

### Login Process

1. User enters email/password
2. System authenticates against `auth.users`
3. System fetches profile from `profiles` table
4. System checks role: `super_admin`, `teacher`, or `parent`
5. User is redirected to role-specific dashboard

### Parent Dashboard

When a parent logs in:
1. System fetches their children from `students` table using `parent_id`
2. Parent can view each child's:
   - Attendance records
   - Grades
   - Class information
   - Announcements
3. Parent can:
   - Apply for leave on behalf of children
   - Update children's contact information
   - Acknowledge notices

## Migration from Old System

If you had students as users in the old system:

```sql
-- 1. Backup existing data
CREATE TABLE students_backup AS SELECT * FROM students;

-- 2. Add new columns to students table
ALTER TABLE students ADD COLUMN full_name VARCHAR(255);
ALTER TABLE students ADD COLUMN gender VARCHAR(10);
ALTER TABLE students ADD COLUMN blood_group VARCHAR(5);
ALTER TABLE students ADD COLUMN emergency_contact VARCHAR(20);
ALTER TABLE students ADD COLUMN medical_conditions TEXT;

-- 3. Copy names from profiles
UPDATE students s
SET full_name = p.full_name
FROM profiles p
WHERE s.user_id = p.id;

-- 4. Make parent_id required
UPDATE students SET parent_id = 'default-parent-uuid' WHERE parent_id IS NULL;
ALTER TABLE students ALTER COLUMN parent_id SET NOT NULL;

-- 5. Remove user_id column
ALTER TABLE students DROP COLUMN user_id;

-- 6. Update user_role enum
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('super_admin', 'teacher', 'parent');
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::text::user_role;
DROP TYPE user_role_old;
```

## Benefits of This Approach

### ✅ Simplified Authentication
- Only 3 user types to manage
- No student login credentials to maintain
- Reduced security surface area

### ✅ Better Data Model
- Students are clearly data entities
- Parent-child relationship is explicit
- Easier to understand and maintain

### ✅ Improved Security
- Students can't accidentally log in
- Parents control their children's data
- Clear access control boundaries

### ✅ Easier Management
- Parents can manage multiple children
- No need to create/manage student accounts
- Simpler onboarding process

## Common Workflows

### Adding a New Student

1. **Super Admin/Teacher** creates student record
2. Links student to existing parent user
3. Parent can immediately view student data

### Parent Viewing Child's Data

1. Parent logs in
2. System fetches all students where `parent_id = parent.id`
3. Parent selects a child
4. System shows attendance, grades, etc. for that child

### Teacher Marking Attendance

1. Teacher logs in
2. Selects a class
3. System shows all students in that class
4. Teacher marks attendance for each student
5. Parents can view updated attendance

## Questions & Answers

**Q: Can a student have multiple parents?**
A: Currently, each student has one `parent_id`. For multiple parents, you could:
- Create a junction table `student_parents`
- Update RLS policies to check the junction table

**Q: What if a student needs to access the portal?**
A: Students don't need portal access. Parents view data on their behalf. If older students need access, consider:
- Creating a parent account for them
- Adding a "student_self" role for older students

**Q: How do I bulk import students?**
A: Create a CSV import that:
1. Validates parent_id exists
2. Inserts student records
3. No user account creation needed

---

**Status:** ✅ Three-role system implemented
**Students:** Data entities managed by parents
**User Roles:** super_admin, teacher, parent only

