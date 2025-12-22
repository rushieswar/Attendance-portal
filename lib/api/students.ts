/**
 * Student API Functions
 * CRUD operations for students
 *
 * NOTE: Students are data entities (NOT users)
 * Students do not have login credentials or user accounts
 */

import { supabase } from '../supabase/client';
import type { Student, StudentWithParent, CreateStudentInput } from '../types/database';

// =====================================================
// FETCH STUDENTS
// =====================================================

/**
 * Get all students (with pagination)
 */
export async function getStudents(page = 1, pageSize = 20) {
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, error, count } = await supabase
		.from('students')
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*),
			class:classes(*)
		`,
			{ count: 'exact' }
		)
		.range(from, to)
		.order('full_name', { ascending: true });

	if (error) {
		console.error('Error fetching students:', error);
		return { data: null, error: error.message, count: 0 };
	}

	return { data, error: null, count: count || 0 };
}

/**
 * Get a single student by ID
 */
export async function getStudentById(studentId: string) {
	const { data, error } = await supabase
		.from('students')
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*),
			class:classes(*)
		`
		)
		.eq('id', studentId)
		.single();

	if (error) {
		console.error('Error fetching student:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Get students by class ID
 */
export async function getStudentsByClass(classId: string) {
	const { data, error } = await supabase
		.from('students')
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*)
		`
		)
		.eq('class_id', classId)
		.order('full_name', { ascending: true });

	if (error) {
		console.error('Error fetching students by class:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Search students by name or admission number
 */
export async function searchStudents(query: string) {
	const { data, error } = await supabase
		.from('students')
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*)
		`
		)
		.or(`admission_number.ilike.%${query}%,full_name.ilike.%${query}%`)
		.limit(10);

	if (error) {
		console.error('Error searching students:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Get students by parent ID
 */
export async function getStudentsByParent(parentId: string) {
	const { data, error } = await supabase
		.from('students')
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*),
			class:classes(*)
		`
		)
		.eq('parent_id', parentId)
		.order('full_name', { ascending: true });

	if (error) {
		console.error('Error fetching students by parent:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

// =====================================================
// CREATE STUDENT
// =====================================================

/**
 * Create a new student record
 * Students are data entities linked to parent users
 * No user account is created for students
 */
export async function createStudent(input: CreateStudentInput) {
	const { data, error } = await supabase
		.from('students')
		.insert([input])
		.select(
			`
			*,
			parent:profiles!students_parent_id_fkey(*),
			class:classes(*)
		`
		)
		.single();

	if (error) {
		console.error('Error creating student:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

// =====================================================
// UPDATE STUDENT
// =====================================================

/**
 * Update student information
 */
export async function updateStudent(studentId: string, updates: Partial<Student>) {
	const { data, error } = await supabase
		.from('students')
		.update(updates)
		.eq('id', studentId)
		.select()
		.single();

	if (error) {
		console.error('Error updating student:', error);
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

// =====================================================
// DELETE STUDENT
// =====================================================

/**
 * Delete a student (soft delete by setting is_active to false)
 */
export async function deleteStudent(studentId: string) {
	// Get the user_id first
	const { data: student } = await supabase
		.from('students')
		.select('user_id')
		.eq('id', studentId)
		.single();

	if (!student) {
		return { error: 'Student not found' };
	}

	// Soft delete by deactivating the profile
	const { error } = await supabase
		.from('profiles')
		.update({ is_active: false })
		.eq('id', student.user_id);

	if (error) {
		console.error('Error deleting student:', error);
		return { error: error.message };
	}

	return { error: null };
}

