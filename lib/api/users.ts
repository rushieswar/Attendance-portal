/**
 * User Management API Functions
 * Handles creation of teachers and parents with their associated records
 */

import { supabaseAdmin } from '../supabase/server';
import { UserRole } from '../types/database';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CreateTeacherInput {
	email: string;
	full_name: string;
	phone?: string;
	address?: string;
	employee_id: string;
	subjects: string[];
	joining_date: string; // ISO date string
	temporary_password: string;
}

export interface CreateStudentWithParentInput {
	// Student details
	student_full_name: string;
	admission_number: string;
	class_id: string;
	date_of_birth: string; // ISO date string
	enrollment_date: string; // ISO date string
	gender?: string;
	blood_group?: string;
	student_address?: string;
	emergency_contact?: string;
	medical_conditions?: string;

	// Parent details
	parent_email: string;
	parent_full_name: string;
	parent_phone?: string;
	parent_address?: string;
	temporary_password: string;
}

export interface CreateTeacherResult {
	success: boolean;
	teacher_id?: string;
	user_id?: string;
	temporary_password?: string;
	error?: string;
}

export interface CreateStudentWithParentResult {
	success: boolean;
	student_id?: string;
	parent_id?: string;
	temporary_password?: string;
	error?: string;
}

// =====================================================
// CREATE TEACHER (Super Admin Only)
// =====================================================

/**
 * Creates a new teacher account with auth user, profile, and teacher record
 * This function should only be called from server-side API routes
 */
export async function createTeacher(
	input: CreateTeacherInput
): Promise<CreateTeacherResult> {
	try {
		// 1. Create auth user with temporary password
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email: input.email,
			password: input.temporary_password,
			email_confirm: true, // Auto-confirm email
			user_metadata: {
				full_name: input.full_name,
			},
		});

		if (authError || !authData.user) {
			console.error('Error creating auth user:', authError);
			return {
				success: false,
				error: authError?.message || 'Failed to create auth user',
			};
		}

		const userId = authData.user.id;

		// 2. Create profile record
		const { error: profileError } = await supabaseAdmin.from('profiles').insert({
			id: userId,
			role: UserRole.TEACHER,
			full_name: input.full_name,
			phone: input.phone || null,
			address: input.address || null,
			is_active: true,
		});

		if (profileError) {
			console.error('Error creating profile:', profileError);
			// Rollback: delete auth user
			await supabaseAdmin.auth.admin.deleteUser(userId);
			return {
				success: false,
				error: profileError.message || 'Failed to create profile',
			};
		}

		// 3. Create teacher record
		const { data: teacherData, error: teacherError } = await supabaseAdmin
			.from('teachers')
			.insert({
				user_id: userId,
				employee_id: input.employee_id,
				subjects: input.subjects,
				joining_date: input.joining_date,
			})
			.select('id')
			.single();

		if (teacherError || !teacherData) {
			console.error('Error creating teacher record:', teacherError);
			// Rollback: delete profile and auth user
			await supabaseAdmin.from('profiles').delete().eq('id', userId);
			await supabaseAdmin.auth.admin.deleteUser(userId);
			return {
				success: false,
				error: teacherError?.message || 'Failed to create teacher record',
			};
		}

		return {
			success: true,
			teacher_id: teacherData.id,
			user_id: userId,
			temporary_password: input.temporary_password,
		};
	} catch (error: any) {
		console.error('Unexpected error creating teacher:', error);
		return {
			success: false,
			error: error.message || 'An unexpected error occurred',
		};
	}
}

// =====================================================
// CREATE STUDENT WITH PARENT (Super Admin & Teachers)
// =====================================================

/**
 * Creates a new student record and parent account if parent doesn't exist
 * This function should only be called from server-side API routes
 */
export async function createStudentWithParent(
	input: CreateStudentWithParentInput
): Promise<CreateStudentWithParentResult> {
	try {
		let parentId: string;
		let isNewParent = false;

		// 1. Check if parent already exists by email
		const { data: existingParent, error: parentCheckError } = await supabaseAdmin
			.from('profiles')
			.select('id, role')
			.eq('id', (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === input.parent_email)?.id || '')
			.single();

		if (existingParent && existingParent.role === UserRole.PARENT) {
			// Parent already exists
			parentId = existingParent.id;
		} else {
			// 2. Create new parent auth user
			const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
				email: input.parent_email,
				password: input.temporary_password,
				email_confirm: true,
				user_metadata: {
					full_name: input.parent_full_name,
				},
			});

			if (authError || !authData.user) {
				console.error('Error creating parent auth user:', authError);
				return {
					success: false,
					error: authError?.message || 'Failed to create parent auth user',
				};
			}

			parentId = authData.user.id;
			isNewParent = true;

			// 3. Create parent profile
			const { error: profileError } = await supabaseAdmin.from('profiles').insert({
				id: parentId,
				role: UserRole.PARENT,
				full_name: input.parent_full_name,
				phone: input.parent_phone || null,
				address: input.parent_address || null,
				is_active: true,
			});

			if (profileError) {
				console.error('Error creating parent profile:', profileError);
				// Rollback: delete auth user
				await supabaseAdmin.auth.admin.deleteUser(parentId);
				return {
					success: false,
					error: profileError.message || 'Failed to create parent profile',
				};
			}
		}

		// 4. Create student record
		const { data: studentData, error: studentError } = await supabaseAdmin
			.from('students')
			.insert({
				full_name: input.student_full_name,
				admission_number: input.admission_number,
				class_id: input.class_id,
				date_of_birth: input.date_of_birth,
				parent_id: parentId,
				enrollment_date: input.enrollment_date,
				gender: input.gender || null,
				blood_group: input.blood_group || null,
				address: input.student_address || null,
				emergency_contact: input.emergency_contact || null,
				medical_conditions: input.medical_conditions || null,
			})
			.select('id')
			.single();

		if (studentError || !studentData) {
			console.error('Error creating student record:', studentError);
			// Rollback: delete parent if newly created
			if (isNewParent) {
				await supabaseAdmin.from('profiles').delete().eq('id', parentId);
				await supabaseAdmin.auth.admin.deleteUser(parentId);
			}
			return {
				success: false,
				error: studentError?.message || 'Failed to create student record',
			};
		}

		return {
			success: true,
			student_id: studentData.id,
			parent_id: parentId,
			temporary_password: isNewParent ? input.temporary_password : undefined,
		};
	} catch (error: any) {
		console.error('Unexpected error creating student with parent:', error);
		return {
			success: false,
			error: error.message || 'An unexpected error occurred',
		};
	}
}

