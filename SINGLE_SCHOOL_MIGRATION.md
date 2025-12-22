# Single School Migration - Schema Changes

## Overview

The database schema has been optimized for **single-school deployment**. All `school_id` foreign key references have been removed, simplifying the data model and improving performance.

## Key Changes

### 1. **Removed `schools` Table**
- Replaced with `school_settings` table (single row)
- Contains school-wide configuration
- No more school_id foreign keys throughout the schema

### 2. **Simplified Core Tables**

#### Before (Multi-School):
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES schools(id),  -- ❌ Removed
    role user_role NOT NULL,
    ...
);
```

#### After (Single-School):
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    role user_role NOT NULL,  -- ✅ No school_id
    ...
);
```

### 3. **Updated Tables**

All tables have been simplified:

| Table | Change |
|-------|--------|
| `profiles` | Removed `school_id` |
| `academic_years` | Removed `school_id`, simplified unique constraint |
| `classes` | Removed `school_id` |
| `teachers` | Removed `school_id` |
| `students` | Removed `school_id` |
| `subjects` | Removed `school_id`, made `code` globally unique |
| `assessments` | Removed `school_id` |
| `calendar_events` | Removed `school_id` |
| `announcements` | Removed `school_id` |

### 4. **New `school_settings` Table**

```sql
CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name VARCHAR(255) NOT NULL DEFAULT 'My School',
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    attendance_mode attendance_mode DEFAULT 'daily',
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- Single row for entire school
- Contains global settings
- Can be read by everyone
- Only super admins can update

### 5. **Simplified RLS Policies**

#### Before (Multi-School):
```sql
CREATE POLICY "Teachers can view students"
ON students FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teachers t
        WHERE t.user_id = auth.uid()
        AND t.school_id = students.school_id  -- ❌ School check
    )
);
```

#### After (Single-School):
```sql
CREATE POLICY "Teachers can view students"
ON students FOR SELECT
USING (get_user_role() = 'teacher');  -- ✅ Simple role check
```

### 6. **Helper Functions**

Added utility functions for cleaner RLS policies:

```sql
-- Get current user's role
CREATE FUNCTION get_user_role() RETURNS user_role;

-- Check if user is super admin
CREATE FUNCTION is_super_admin() RETURNS BOOLEAN;

-- Calculate attendance percentage
CREATE FUNCTION get_attendance_percentage(
    p_student_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL;
```

## Benefits

### ✅ Performance
- Fewer joins in queries
- Simpler indexes
- Faster RLS policy evaluation

### ✅ Simplicity
- No school_id filtering needed
- Cleaner code
- Easier to understand

### ✅ Maintenance
- Less complex schema
- Fewer foreign keys
- Simpler migrations

## Migration Steps

### If You Haven't Run the Schema Yet:
1. Simply run the updated `001_initial_schema.sql`
2. The schema is already optimized for single-school

### If You Already Ran the Old Schema:
You'll need to migrate your data. Here's a migration script:

```sql
-- 1. Create new school_settings table
CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name VARCHAR(255) NOT NULL DEFAULT 'My School',
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    attendance_mode attendance_mode DEFAULT 'daily',
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Copy data from schools table (if exists)
INSERT INTO school_settings (school_name, address, contact_email, contact_phone, attendance_mode, settings)
SELECT name, address, contact_email, contact_phone, attendance_mode, settings
FROM schools
LIMIT 1;

-- 3. Remove school_id columns (one by one)
ALTER TABLE profiles DROP COLUMN school_id;
ALTER TABLE academic_years DROP COLUMN school_id;
ALTER TABLE classes DROP COLUMN school_id;
ALTER TABLE teachers DROP COLUMN school_id;
ALTER TABLE students DROP COLUMN school_id;
ALTER TABLE subjects DROP COLUMN school_id;
ALTER TABLE assessments DROP COLUMN school_id;
ALTER TABLE calendar_events DROP COLUMN school_id;
ALTER TABLE announcements DROP COLUMN school_id;

-- 4. Drop old schools table
DROP TABLE schools;

-- 5. Update RLS policies (drop and recreate)
-- Run the RLS section from 001_initial_schema.sql
```

## TypeScript Changes

### Updated Interfaces

```typescript
// Before
export interface Profile {
    id: string;
    school_id: string;  // ❌ Removed
    role: UserRole;
    ...
}

// After
export interface Profile {
    id: string;
    role: UserRole;  // ✅ No school_id
    ...
}

// New
export interface SchoolSettings {
    id: string;
    school_name: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    attendance_mode: AttendanceMode;
    logo_url: string | null;
    settings: Record<string, any>;
    created_at: string;
    updated_at: string;
}
```

## API Changes

No changes needed! The API functions in `lib/api/` already work without school_id filtering since RLS handles access control automatically.

## Future Multi-School Support

If you need to support multiple schools in the future:

1. Add `school_id` back to relevant tables
2. Update RLS policies to include school_id checks
3. Add school selection logic to the application
4. Update API functions to filter by school_id

The current single-school design makes it easy to scale up when needed.

## Questions?

- Check `ARCHITECTURE.md` for system design
- Review `001_initial_schema.sql` for complete schema
- See `lib/types/database.ts` for TypeScript types

---

**Status:** ✅ Schema optimized for single-school deployment

