-- Migration: Teacher-Class Assignment System
-- Description: Creates teacher_classes table to assign specific classes to teachers
-- Date: 2025-12-19

-- =====================================================
-- TEACHER_CLASSES TABLE
-- =====================================================

CREATE TABLE teacher_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id)
);

COMMENT ON TABLE teacher_classes IS 'Assigns specific classes to teachers with optional subject specification';
COMMENT ON COLUMN teacher_classes.is_class_teacher IS 'Indicates if this teacher is the primary class teacher';
COMMENT ON COLUMN teacher_classes.subject_id IS 'Optional: Specific subject the teacher teaches to this class';

-- Create indexes for performance
CREATE INDEX idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_class_id ON teacher_classes(class_id);
CREATE INDEX idx_teacher_classes_subject_id ON teacher_classes(subject_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all teacher-class assignments
CREATE POLICY "Super admins can manage teacher classes"
ON teacher_classes FOR ALL
USING (is_super_admin());

-- Teachers can view their own class assignments
CREATE POLICY "Teachers can view own class assignments"
ON teacher_classes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teachers t
        WHERE t.id = teacher_classes.teacher_id
        AND t.user_id = auth.uid()
    )
);

-- Everyone can view teacher-class assignments (for displaying teacher info)
CREATE POLICY "Everyone can view teacher class assignments"
ON teacher_classes FOR SELECT
USING (true);

-- =====================================================
-- HELPER FUNCTION: Get Teacher's Assigned Classes
-- =====================================================

CREATE OR REPLACE FUNCTION get_teacher_assigned_classes(teacher_user_id UUID)
RETURNS TABLE (class_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT tc.class_id
    FROM teacher_classes tc
    INNER JOIN teachers t ON t.id = tc.teacher_id
    WHERE t.user_id = teacher_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_teacher_assigned_classes IS 'Returns all class IDs assigned to a teacher by their user_id';

-- =====================================================
-- HELPER FUNCTION: Check if Teacher Has Access to Class
-- =====================================================

CREATE OR REPLACE FUNCTION teacher_has_class_access(teacher_user_id UUID, check_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM teacher_classes tc
        INNER JOIN teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = teacher_user_id
        AND tc.class_id = check_class_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION teacher_has_class_access IS 'Checks if a teacher has access to a specific class';

-- =====================================================
-- UPDATE EXISTING POLICIES FOR CLASS-BASED RESTRICTIONS
-- =====================================================

-- Drop old teacher policies that allow access to all classes
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance_records;
DROP POLICY IF EXISTS "Teachers can view students" ON students;
DROP POLICY IF EXISTS "Teachers can update students" ON students;
DROP POLICY IF EXISTS "Teachers can manage assessment classes" ON assessment_classes;
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;

-- Create new restricted policies for teachers

-- Teachers can only view students in their assigned classes
CREATE POLICY "Teachers can view assigned class students"
ON students FOR SELECT
USING (
    get_user_role() = 'teacher' AND (
        class_id IS NULL OR
        EXISTS (
            SELECT 1 FROM teacher_classes tc
            INNER JOIN teachers t ON t.id = tc.teacher_id
            WHERE t.user_id = auth.uid()
            AND tc.class_id = students.class_id
        )
    )
);

-- Teachers can update students in their assigned classes
CREATE POLICY "Teachers can update assigned class students"
ON students FOR UPDATE
USING (
    get_user_role() = 'teacher' AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        INNER JOIN teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = auth.uid()
        AND tc.class_id = students.class_id
    )
);

-- Teachers can manage attendance only for their assigned classes
CREATE POLICY "Teachers can manage assigned class attendance"
ON attendance_records FOR ALL
USING (
    get_user_role() = 'teacher' AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        INNER JOIN teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = auth.uid()
        AND tc.class_id = attendance_records.class_id
    )
);

-- Teachers can manage assessment classes only for their assigned classes
CREATE POLICY "Teachers can manage assigned assessment classes"
ON assessment_classes FOR ALL
USING (
    get_user_role() = 'teacher' AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        INNER JOIN teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = auth.uid()
        AND tc.class_id = assessment_classes.class_id
    )
);

-- Teachers can manage grades only for students in their assigned classes
CREATE POLICY "Teachers can manage assigned class grades"
ON grades FOR ALL
USING (
    get_user_role() = 'teacher' AND
    EXISTS (
        SELECT 1 FROM students s
        INNER JOIN teacher_classes tc ON tc.class_id = s.class_id
        INNER JOIN teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = auth.uid()
        AND s.id = grades.student_id
    )
);

