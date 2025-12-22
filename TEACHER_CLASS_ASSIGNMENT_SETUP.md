# Teacher-Class Assignment System Setup Guide

## Overview
This guide explains how to set up the teacher-class assignment system that restricts teachers to only see and manage their assigned classes, while admins can manage all classes and assign classes to teachers.

## Database Changes

### New Table: `teacher_classes`
A new junction table has been created to manage teacher-class assignments with the following features:
- Links teachers to specific classes
- Optional subject specification (for subject-specific teachers)
- Class teacher designation (primary teacher for a class)
- Automatic timestamp tracking

### Updated Row Level Security (RLS) Policies
The migration updates RLS policies to enforce class-based restrictions:
- Teachers can only view/manage students in their assigned classes
- Teachers can only mark attendance for their assigned classes
- Teachers can only manage assessments and grades for their assigned classes
- Admins retain full access to all data

## Migration Steps

### Step 1: Apply the Database Migration

Run the migration file to create the `teacher_classes` table and update policies:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration manually in Supabase Dashboard
# Go to SQL Editor and run the contents of:
# facit-next/supabase/migrations/002_teacher_classes.sql
```

### Step 2: Assign Classes to Teachers

After applying the migration, you need to assign classes to teachers:

1. **Login as Admin** to the school management system
2. **Navigate to**: Teachers → Assign Classes (in the admin menu)
3. **For each teacher**:
   - Select the teacher from the dropdown
   - Select the class to assign
   - Optionally select a specific subject (leave empty for all subjects)
   - Check "Is Class Teacher?" if this teacher is the primary class teacher
   - Click "Assign Class"

### Step 3: Verify Teacher Access

1. **Login as a Teacher** who has been assigned classes
2. **Verify** that the dashboard shows only assigned classes
3. **Check** that the Students page shows only students from assigned classes
4. **Test** attendance marking to ensure it works only for assigned classes

## Features Implemented

### For Admins (super_admin role):
✅ **View all classes** - Full access to all classes in the system
✅ **Manage all classes** - Create, edit, delete any class
✅ **Assign classes to teachers** - New page at `/admin/teachers/assign-classes`
✅ **View all students** - Access to all student records
✅ **Manage all attendance** - Mark and view attendance for any class
✅ **Manage all assessments and grades** - Full academic management

### For Teachers (teacher role):
✅ **View only assigned classes** - Dashboard shows only their classes
✅ **View students in assigned classes** - Student list filtered by assigned classes
✅ **Mark attendance for assigned classes** - Can only mark attendance for their students
✅ **Manage assessments for assigned classes** - Create and manage assessments for their classes
✅ **Enter grades for assigned students** - Grade entry restricted to their students
✅ **View leave requests** - Only for students in their assigned classes

## Updated Files

### Database & Types:
- `supabase/migrations/002_teacher_classes.sql` - New migration file
- `lib/types/database.ts` - Added TeacherClass interface and related types

### Admin Pages:
- `pages/admin/teachers/assign-classes.tsx` - New page for assigning classes to teachers
- `menu.ts` - Updated admin menu to include "Assign Classes" submenu

### Teacher Pages:
- `pages/teacher/dashboard.tsx` - Updated to show only assigned classes
- `pages/teacher/students/index.tsx` - Updated to show only students from assigned classes

## Database Helper Functions

The migration includes two helper functions:

### 1. `get_teacher_assigned_classes(teacher_user_id UUID)`
Returns all class IDs assigned to a teacher by their user_id.

```sql
SELECT * FROM get_teacher_assigned_classes('user-uuid-here');
```

### 2. `teacher_has_class_access(teacher_user_id UUID, check_class_id UUID)`
Checks if a teacher has access to a specific class.

```sql
SELECT teacher_has_class_access('user-uuid-here', 'class-uuid-here');
```

## Important Notes

### Initial Setup
- **After migration**, no teachers will have assigned classes
- **Admins must assign classes** to teachers before they can access any data
- **Teachers without assigned classes** will see empty dashboards and student lists

### Class Teacher Designation
- Multiple teachers can be assigned to the same class
- Only one teacher should be marked as "Class Teacher" (primary teacher)
- The "Class Teacher" flag is informational and doesn't affect permissions

### Subject-Specific Assignments
- Leave subject empty if the teacher handles all subjects for that class
- Specify a subject if the teacher only teaches that subject to the class
- Multiple teachers can teach different subjects to the same class

## Troubleshooting

### Teachers can't see any data
**Solution**: Ensure classes have been assigned to the teacher via the admin panel.

### Teachers see all classes (not restricted)
**Solution**: Verify the migration was applied correctly and RLS policies are enabled.

### Error when assigning classes
**Solution**: Check that both the teacher and class exist in the database.

## Security Considerations

- All data access is enforced at the database level via RLS policies
- Frontend restrictions are supplementary - the database is the source of truth
- Teachers cannot bypass restrictions by manipulating API calls
- Admins have unrestricted access for management purposes

## Next Steps

After setup, you may want to:
1. Create a bulk assignment tool for assigning multiple classes at once
2. Add a teacher profile page showing their assigned classes
3. Implement class transfer functionality for students
4. Add reporting features for class-wise performance

