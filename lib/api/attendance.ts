/**
 * Attendance API Functions
 * CRUD operations for attendance records
 */

import { supabase } from '../supabase/client';
import type {
	AttendanceRecord,
	AttendanceStatus,
	MarkAttendanceInput,
	AttendanceSummary,
} from '../types/database';

// =====================================================
// MARK ATTENDANCE
// =====================================================

/**
 * Mark attendance for a single student
 */
export async function markAttendance(input: MarkAttendanceInput) {
	const { data, error } = await supabase
		.from('attendance_records')
		.upsert(
			{
				student_id: input.student_id,
				class_id: input.class_id,
				date: input.date,
				status: input.status,
				period_number: input.period_number || null,
				remarks: input.remarks || null,
			},
			{
				onConflict: 'student_id,date,period_number',
			}
		)
		.select()
		.single();

	if (error) {
		console.error('Error marking attendance:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Mark attendance for multiple students at once
 */
export async function markBulkAttendance(
	classId: string,
	date: string,
	attendanceData: Array<{
		student_id: string;
		status: AttendanceStatus;
		remarks?: string;
	}>
) {
	const records = attendanceData.map((item) => ({
		student_id: item.student_id,
		class_id: classId,
		date,
		status: item.status,
		remarks: item.remarks || null,
	}));

	const { data, error } = await supabase
		.from('attendance_records')
		.upsert(records, {
			onConflict: 'student_id,date,period_number',
		})
		.select();

	if (error) {
		console.error('Error marking bulk attendance:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

// =====================================================
// FETCH ATTENDANCE
// =====================================================

/**
 * Get attendance records for a specific date and class
 */
export async function getAttendanceByClassAndDate(classId: string, date: string) {
	const { data, error } = await supabase
		.from('attendance_records')
		.select(
			`
			*,
			student:students(
				*,
				profile:profiles(*)
			)
		`
		)
		.eq('class_id', classId)
		.eq('date', date)
		.order('student.profile.full_name', { ascending: true });

	if (error) {
		console.error('Error fetching attendance:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Get attendance records for a student
 */
export async function getStudentAttendance(
	studentId: string,
	startDate?: string,
	endDate?: string
) {
	let query = supabase
		.from('attendance_records')
		.select('*')
		.eq('student_id', studentId)
		.order('date', { ascending: false });

	if (startDate) {
		query = query.gte('date', startDate);
	}

	if (endDate) {
		query = query.lte('date', endDate);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching student attendance:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Get attendance summary for a student
 */
export async function getStudentAttendanceSummary(
	studentId: string,
	startDate: string,
	endDate: string
): Promise<{ data: AttendanceSummary | null; error: string | null }> {
	const { data, error } = await getStudentAttendance(studentId, startDate, endDate);

	if (error || !data) {
		return { data: null, error: error || 'No data found' };
	}

	const total_days = data.length;
	const present_days = data.filter((r) => r.status === 'present').length;
	const absent_days = data.filter((r) => r.status === 'absent').length;
	const late_days = data.filter((r) => r.status === 'late').length;
	const percentage = total_days > 0 ? (present_days / total_days) * 100 : 0;

	const summary: AttendanceSummary = {
		student_id: studentId,
		total_days,
		present_days,
		absent_days,
		late_days,
		percentage: Math.round(percentage * 100) / 100,
	};

	return { data: summary, error: null };
}

/**
 * Get today's attendance summary for a class
 */
export async function getTodayAttendanceSummary(classId: string) {
	const today = new Date().toISOString().split('T')[0];

	const { data, error } = await supabase
		.from('attendance_records')
		.select('status')
		.eq('class_id', classId)
		.eq('date', today);

	if (error) {
		console.error('Error fetching today attendance summary:', error);
		return { data: null, error: error.message };
	}

	const present = data.filter((r) => r.status === 'present').length;
	const absent = data.filter((r) => r.status === 'absent').length;
	const late = data.filter((r) => r.status === 'late').length;
	const total = data.length;

	return {
		data: {
			present,
			absent,
			late,
			total,
			percentage: total > 0 ? (present / total) * 100 : 0,
		},
		error: null,
	};
}

