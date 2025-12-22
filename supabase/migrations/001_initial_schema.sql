-- =====================================================
-- School Management System - Initial Database Schema
-- Single School Deployment - Optimized
-- Based on: Attendance & Academic Management Portal
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles: Students are NOT users - they are data entities managed by parents
CREATE TYPE user_role AS ENUM ('super_admin', 'teacher', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE attendance_mode AS ENUM ('daily', 'period_wise');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- =====================================================
-- SCHOOL SETTINGS (Single Record)
-- =====================================================

-- School Settings Table (Single row for the entire school)
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_school_settings CHECK (id = uuid_generate_v4())
);

-- Insert default school settings
INSERT INTO school_settings (school_name) VALUES ('My School');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles Table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN profiles.role IS 'User role: super_admin, teacher, student, or parent';

-- Academic Years Table
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE academic_years IS 'Academic year definitions';
COMMENT ON COLUMN academic_years.is_current IS 'Only one academic year should be current at a time';

-- Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    section VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(academic_year_id, name, section)
);

COMMENT ON TABLE classes IS 'Class/Grade sections for each academic year';

-- Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    subjects JSONB DEFAULT '[]',
    joining_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE teachers IS 'Teacher-specific information';
COMMENT ON COLUMN teachers.subjects IS 'Array of subjects taught by the teacher';

-- Students Table (Students are data entities, NOT users)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    date_of_birth DATE NOT NULL,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    enrollment_date DATE NOT NULL,
    gender VARCHAR(10),
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact VARCHAR(20),
    medical_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE students IS 'Student records - Students are data entities managed by parents, NOT system users';
COMMENT ON COLUMN students.parent_id IS 'Required reference to parent profile who manages this student';
COMMENT ON COLUMN students.full_name IS 'Student full name - stored directly as students do not have user accounts';

-- =====================================================
-- ATTENDANCE TABLES
-- =====================================================

-- Attendance Records Table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    period_number INTEGER,
    marked_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date, period_number)
);

COMMENT ON TABLE attendance_records IS 'Daily or period-wise attendance records';
COMMENT ON COLUMN attendance_records.period_number IS 'NULL for daily attendance, period number for period-wise';

-- =====================================================
-- ACADEMIC TABLES
-- =====================================================

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    grade_level VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subjects IS 'Subjects offered in the school';

-- Assessments/Exams Table (Flexible structure as per requirements)
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_date DATE,
    max_marks INTEGER NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assessments IS 'Flexible assessment/exam definitions - no hardcoded types';

-- Assessment Class Mapping (Which classes this assessment applies to)
CREATE TABLE assessment_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, class_id, subject_id)
);

COMMENT ON TABLE assessment_classes IS 'Links assessments to specific classes and subjects';

-- Grades/Marks Table
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL,
    remarks TEXT,
    entered_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, assessment_id, subject_id),
    CHECK (marks_obtained >= 0)
);

COMMENT ON TABLE grades IS 'Student marks for assessments';

-- =====================================================
-- CALENDAR & ANNOUNCEMENTS
-- =====================================================

-- Academic Calendar Events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE calendar_events IS 'School calendar events - managed by super admin';

-- Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50)[] NOT NULL, -- ['teachers', 'parents', 'students', 'all']
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE announcements IS 'One-way announcements to different user groups';

-- Announcement Acknowledgments (for parents)
CREATE TABLE announcement_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

COMMENT ON TABLE announcement_acknowledgments IS 'Track which users have acknowledged announcements';

-- =====================================================
-- LEAVE MANAGEMENT
-- =====================================================

-- Leave Applications (by parents)
CREATE TABLE leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    applied_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE leave_applications IS 'Leave applications submitted by parents for students';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- Students indexes
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_admission_number ON students(admission_number);

-- Attendance indexes
CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_class_date ON attendance_records(class_id, date);

-- Grades indexes
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_assessment_id ON grades(assessment_id);

-- Calendar indexes
CREATE INDEX idx_calendar_year ON calendar_events(academic_year_id);
CREATE INDEX idx_calendar_date ON calendar_events(event_date);

-- Announcements indexes
CREATE INDEX idx_announcements_published ON announcements(is_published, published_at);

-- Leave applications indexes
CREATE INDEX idx_leave_student_id ON leave_applications(student_id);
CREATE INDEX idx_leave_status ON leave_applications(status);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON leave_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- SCHOOL SETTINGS POLICIES
-- =====================================================

-- Everyone can read school settings
CREATE POLICY "Everyone can read school settings"
ON school_settings FOR SELECT
USING (true);

-- Only super admins can update school settings
CREATE POLICY "Super admins can update school settings"
ON school_settings FOR UPDATE
USING (is_super_admin());

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
USING (is_super_admin());

-- Teachers can view all profiles
CREATE POLICY "Teachers can view all profiles"
ON profiles FOR SELECT
USING (get_user_role() = 'teacher');

-- Parents can view their children's profiles
CREATE POLICY "Parents can view children profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.parent_id = auth.uid()
        AND s.user_id = profiles.id
    )
);

-- Super admins can update profiles
CREATE POLICY "Super admins can update profiles"
ON profiles FOR UPDATE
USING (is_super_admin());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Super admins can insert profiles
CREATE POLICY "Super admins can insert profiles"
ON profiles FOR INSERT
WITH CHECK (is_super_admin());

-- =====================================================
-- STUDENTS POLICIES (Students are data entities, NOT users)
-- =====================================================

-- Super admins can do everything with students
CREATE POLICY "Super admins full access to students"
ON students FOR ALL
USING (is_super_admin());

-- Teachers can view all students
CREATE POLICY "Teachers can view students"
ON students FOR SELECT
USING (get_user_role() = 'teacher');

-- Teachers can update students (for class assignments, etc.)
CREATE POLICY "Teachers can update students"
ON students FOR UPDATE
USING (get_user_role() = 'teacher');

-- Parents can view their children
CREATE POLICY "Parents can view their children"
ON students FOR SELECT
USING (parent_id = auth.uid());

-- Parents can update their children's information
CREATE POLICY "Parents can update their children"
ON students FOR UPDATE
USING (parent_id = auth.uid());

-- =====================================================
-- TEACHERS POLICIES
-- =====================================================

-- Super admins can manage teachers
CREATE POLICY "Super admins can manage teachers"
ON teachers FOR ALL
USING (is_super_admin());

-- Teachers can view their own record
CREATE POLICY "Teachers can view own record"
ON teachers FOR SELECT
USING (user_id = auth.uid());

-- =====================================================
-- ACADEMIC YEARS & CLASSES POLICIES
-- =====================================================

-- Everyone can view academic years
CREATE POLICY "Everyone can view academic years"
ON academic_years FOR SELECT
USING (true);

-- Super admins can manage academic years
CREATE POLICY "Super admins can manage academic years"
ON academic_years FOR ALL
USING (is_super_admin());

-- Everyone can view classes
CREATE POLICY "Everyone can view classes"
ON classes FOR SELECT
USING (true);

-- Super admins can manage classes
CREATE POLICY "Super admins can manage classes"
ON classes FOR ALL
USING (is_super_admin());

-- =====================================================
-- SUBJECTS POLICIES
-- =====================================================

-- Everyone can view subjects
CREATE POLICY "Everyone can view subjects"
ON subjects FOR SELECT
USING (true);

-- Super admins can manage subjects
CREATE POLICY "Super admins can manage subjects"
ON subjects FOR ALL
USING (is_super_admin());

-- =====================================================
-- ATTENDANCE POLICIES
-- =====================================================

-- Super admins can manage all attendance
CREATE POLICY "Super admins can manage attendance"
ON attendance_records FOR ALL
USING (is_super_admin());

-- Teachers can mark and view all attendance
CREATE POLICY "Teachers can manage attendance"
ON attendance_records FOR ALL
USING (get_user_role() = 'teacher');

-- Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance"
ON attendance_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = attendance_records.student_id
        AND s.parent_id = auth.uid()
    )
);

-- =====================================================
-- ASSESSMENTS POLICIES
-- =====================================================

-- Everyone can view assessments
CREATE POLICY "Everyone can view assessments"
ON assessments FOR SELECT
USING (true);

-- Super admins and teachers can manage assessments
CREATE POLICY "Super admins can manage assessments"
ON assessments FOR ALL
USING (is_super_admin());

CREATE POLICY "Teachers can manage assessments"
ON assessments FOR ALL
USING (get_user_role() = 'teacher');

-- Everyone can view assessment classes
CREATE POLICY "Everyone can view assessment classes"
ON assessment_classes FOR SELECT
USING (true);

-- Super admins and teachers can manage assessment classes
CREATE POLICY "Super admins can manage assessment classes"
ON assessment_classes FOR ALL
USING (is_super_admin());

CREATE POLICY "Teachers can manage assessment classes"
ON assessment_classes FOR ALL
USING (get_user_role() = 'teacher');

-- =====================================================
-- GRADES POLICIES
-- =====================================================

-- Super admins can manage grades
CREATE POLICY "Super admins can manage grades"
ON grades FOR ALL
USING (is_super_admin());

-- Teachers can manage grades
CREATE POLICY "Teachers can manage grades"
ON grades FOR ALL
USING (get_user_role() = 'teacher');

-- Parents can view their children's grades
CREATE POLICY "Parents can view children grades"
ON grades FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = grades.student_id
        AND s.parent_id = auth.uid()
    )
);

-- =====================================================
-- CALENDAR EVENTS POLICIES
-- =====================================================

-- Everyone can view calendar events
CREATE POLICY "Everyone can view calendar"
ON calendar_events FOR SELECT
USING (true);

-- Super admins can manage calendar events
CREATE POLICY "Super admins can manage calendar"
ON calendar_events FOR ALL
USING (is_super_admin());

-- =====================================================
-- ANNOUNCEMENTS POLICIES
-- =====================================================

-- Super admins can manage announcements
CREATE POLICY "Super admins can manage announcements"
ON announcements FOR ALL
USING (is_super_admin());

-- All users can view published announcements targeted to them
CREATE POLICY "Users can view relevant announcements"
ON announcements FOR SELECT
USING (
    is_published = true
    AND (
        'all' = ANY(target_audience)
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND (p.role::text = ANY(target_audience))
        )
    )
);

-- Users can acknowledge announcements
CREATE POLICY "Users can acknowledge announcements"
ON announcement_acknowledgments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own acknowledgments"
ON announcement_acknowledgments FOR SELECT
USING (user_id = auth.uid());

-- =====================================================
-- LEAVE APPLICATIONS POLICIES
-- =====================================================

-- Parents can create leave applications for their children
CREATE POLICY "Parents can create leave applications"
ON leave_applications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = leave_applications.student_id
        AND s.parent_id = auth.uid()
    )
);

-- Parents can view their own leave applications
CREATE POLICY "Parents can view own leave applications"
ON leave_applications FOR SELECT
USING (applied_by = auth.uid());

-- Teachers and admins can view and manage leave applications
CREATE POLICY "Staff can view leave applications"
ON leave_applications FOR SELECT
USING (get_user_role() IN ('super_admin', 'teacher'));

CREATE POLICY "Staff can update leave applications"
ON leave_applications FOR UPDATE
USING (get_user_role() IN ('super_admin', 'teacher'));

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get attendance percentage for a student
CREATE OR REPLACE FUNCTION get_attendance_percentage(
    p_student_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
    total_days INTEGER;
    present_days INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_days
    FROM attendance_records
    WHERE student_id = p_student_id
    AND date BETWEEN p_start_date AND p_end_date;

    SELECT COUNT(*) INTO present_days
    FROM attendance_records
    WHERE student_id = p_student_id
    AND date BETWEEN p_start_date AND p_end_date
    AND status = 'present';

    IF total_days = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((present_days::DECIMAL / total_days::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================

-- This schema is optimized for single-school deployment
-- All school_id references have been removed
-- RLS policies ensure role-based access control
-- Helper functions simplify policy definitions
