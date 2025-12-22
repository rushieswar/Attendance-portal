/**
 * TypeScript Types for Database Tables
 * Single School Deployment - Optimized
 * Based on the core concept and database schema
 *
 * NOTE: Students are data entities (NOT users)
 * Only three user roles: super_admin, teacher, parent
 */

// =====================================================
// ENUMS
// =====================================================

export enum UserRole {
	SUPER_ADMIN = 'super_admin',
	TEACHER = 'teacher',
	PARENT = 'parent',
}

export enum AttendanceStatus {
	PRESENT = 'present',
	ABSENT = 'absent',
	LATE = 'late',
}

export enum AttendanceMode {
	DAILY = 'daily',
	PERIOD_WISE = 'period_wise',
}

export enum LeaveStatus {
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected',
}

// =====================================================
// CORE TYPES
// =====================================================

export interface Profile {
	id: string;
	role: UserRole;
	full_name: string;
	phone: string | null;
	address: string | null;
	avatar_url: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

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

export interface AcademicYear {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
	created_at: string;
	updated_at: string;
}

export interface Class {
	id: string;
	academic_year_id: string;
	name: string;
	grade_level: string;
	section: string | null;
	created_at: string;
	updated_at: string;
}

export interface Teacher {
	id: string;
	user_id: string;
	employee_id: string;
	subjects: string[];
	joining_date: string;
	created_at: string;
	updated_at: string;
}

export interface TeacherClass {
	id: string;
	teacher_id: string;
	class_id: string;
	subject_id: string | null;
	is_class_teacher: boolean;
	assigned_at: string;
	created_at: string;
	updated_at: string;
}

export interface Student {
	id: string;
	full_name: string;
	admission_number: string;
	class_id: string | null;
	date_of_birth: string;
	parent_id: string; // Required - students must be linked to a parent
	enrollment_date: string;
	gender: string | null;
	blood_group: string | null;
	address: string | null;
	emergency_contact: string | null;
	medical_conditions: string | null;
	created_at: string;
	updated_at: string;
}

// =====================================================
// ATTENDANCE TYPES
// =====================================================

export interface AttendanceRecord {
	id: string;
	student_id: string;
	class_id: string;
	date: string;
	status: AttendanceStatus;
	period_number: number | null;
	marked_by: string | null;
	remarks: string | null;
	created_at: string;
	updated_at: string;
}

export interface AttendanceSummary {
	student_id: string;
	total_days: number;
	present_days: number;
	absent_days: number;
	late_days: number;
	percentage: number;
}

// =====================================================
// ACADEMIC TYPES
// =====================================================

export interface Subject {
	id: string;
	name: string;
	code: string;
	grade_level: string | null;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface Assessment {
	id: string;
	academic_year_id: string;
	name: string;
	description: string | null;
	assessment_date: string | null;
	max_marks: number;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface AssessmentClass {
	id: string;
	assessment_id: string;
	class_id: string;
	subject_id: string;
	created_at: string;
}

export interface Grade {
	id: string;
	student_id: string;
	assessment_id: string;
	subject_id: string;
	marks_obtained: number;
	remarks: string | null;
	entered_by: string | null;
	created_at: string;
	updated_at: string;
}

// =====================================================
// CALENDAR & ANNOUNCEMENTS TYPES
// =====================================================

export interface CalendarEvent {
	id: string;
	academic_year_id: string;
	title: string;
	description: string | null;
	event_date: string;
	event_type: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface Announcement {
	id: string;
	title: string;
	content: string;
	target_audience: string[];
	created_by: string | null;
	published_at: string | null;
	is_published: boolean;
	created_at: string;
	updated_at: string;
}

export interface AnnouncementAcknowledgment {
	id: string;
	announcement_id: string;
	user_id: string;
	acknowledged_at: string;
}

// =====================================================
// LEAVE MANAGEMENT TYPES
// =====================================================

export interface LeaveApplication {
	id: string;
	student_id: string;
	applied_by: string;
	start_date: string;
	end_date: string;
	reason: string;
	status: LeaveStatus;
	reviewed_by: string | null;
	reviewed_at: string | null;
	review_remarks: string | null;
	created_at: string;
	updated_at: string;
}

// =====================================================
// EXTENDED TYPES WITH RELATIONS
// =====================================================

export interface StudentWithParent extends Student {
	parent: Profile; // Students always have a parent
	class?: Class;
}

export interface TeacherWithProfile extends Teacher {
	profile: Profile;
}

export interface TeacherClassWithDetails extends TeacherClass {
	teacher?: TeacherWithProfile;
	class?: Class;
	subject?: Subject;
}

export interface ClassWithTeachers extends Class {
	teachers?: TeacherWithProfile[];
	academic_year?: AcademicYear;
}

export interface AttendanceWithStudent extends AttendanceRecord {
	student: StudentWithParent;
}

export interface GradeWithDetails extends Grade {
	student: StudentWithParent;
	assessment: Assessment;
	subject: Subject;
}

// =====================================================
// FORM INPUT TYPES
// =====================================================

export interface CreateStudentInput {
	full_name: string;
	admission_number: string;
	class_id: string;
	date_of_birth: string;
	parent_id: string; // Required - link to existing parent user
	enrollment_date: string;
	gender?: string;
	blood_group?: string;
	address?: string;
	emergency_contact?: string;
	medical_conditions?: string;
}

export interface UpdateStudentInput {
	full_name?: string;
	class_id?: string;
	date_of_birth?: string;
	gender?: string;
	blood_group?: string;
	address?: string;
	emergency_contact?: string;
	medical_conditions?: string;
}

export interface CreateTeacherInput {
	full_name: string;
	email: string;
	phone?: string;
	employee_id: string;
	subjects: string[];
	joining_date: string;
	address?: string;
}

export interface AssignTeacherToClassInput {
	teacher_id: string;
	class_id: string;
	subject_id?: string;
	is_class_teacher?: boolean;
}

export interface MarkAttendanceInput {
	student_id: string;
	class_id: string;
	date: string;
	status: AttendanceStatus;
	period_number?: number;
	remarks?: string;
}

export interface CreateAssessmentInput {
	name: string;
	description?: string;
	assessment_date?: string;
	max_marks: number;
	academic_year_id: string;
	classes: {
		class_id: string;
		subject_id: string;
	}[];
}

export interface EnterGradeInput {
	student_id: string;
	assessment_id: string;
	subject_id: string;
	marks_obtained: number;
	remarks?: string;
}

export interface CreateLeaveInput {
	student_id: string;
	start_date: string;
	end_date: string;
	reason: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

// =====================================================
// DASHBOARD STATISTICS TYPES
// =====================================================

export interface DashboardStats {
	total_students: number;
	total_teachers: number;
	total_classes: number;
	attendance_today: {
		present: number;
		absent: number;
		late: number;
		percentage: number;
	};
	recent_announcements: Announcement[];
	upcoming_events: CalendarEvent[];
}

export interface StudentDashboard {
	student: StudentWithProfile;
	attendance_summary: AttendanceSummary;
	recent_grades: GradeWithDetails[];
	upcoming_assessments: Assessment[];
	announcements: Announcement[];
}

export interface TeacherDashboard {
	teacher: TeacherWithProfile;
	assigned_classes: Class[];
	today_attendance_pending: Class[];
	recent_assessments: Assessment[];
	announcements: Announcement[];
}

export interface ParentDashboard {
	children: StudentWithProfile[];
	attendance_summaries: Record<string, AttendanceSummary>;
	recent_grades: Record<string, GradeWithDetails[]>;
	pending_leaves: LeaveApplication[];
	announcements: Announcement[];
}

