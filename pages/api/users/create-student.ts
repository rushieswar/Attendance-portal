/**
 * API Route: Create Student with Parent
 * POST /api/users/create-student
 * 
 * Creates a new student and parent account (Super Admin & Teachers)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createStudentWithParent, CreateStudentWithParentInput } from '../../../lib/api/users';
import { supabase } from '../../../lib/supabase/client';
import { verifyUserRole } from '../../../lib/supabase/server';
import { UserRole } from '../../../lib/types/database';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		// Get the authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized - No token provided' });
		}

		const token = authHeader.substring(7);

		// Verify the token and get user
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);

		if (authError || !user) {
			return res.status(401).json({ error: 'Unauthorized - Invalid token' });
		}

		// Verify user is super admin or teacher
		const hasPermission = await verifyUserRole(user.id, [UserRole.SUPER_ADMIN, UserRole.TEACHER]);
		if (!hasPermission) {
			return res.status(403).json({ error: 'Forbidden - Super Admin or Teacher access required' });
		}

		// Validate request body
		const input: CreateStudentWithParentInput = req.body;

		if (!input.student_full_name || !input.admission_number || !input.class_id || 
			!input.date_of_birth || !input.enrollment_date || !input.parent_email || 
			!input.parent_full_name || !input.temporary_password) {
			return res.status(400).json({ 
				error: 'Missing required fields: student_full_name, admission_number, class_id, date_of_birth, enrollment_date, parent_email, parent_full_name, temporary_password' 
			});
		}

		// Create the student with parent
		const result = await createStudentWithParent(input);

		if (!result.success) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(201).json({
			success: true,
			message: 'Student and parent created successfully',
			data: {
				student_id: result.student_id,
				parent_id: result.parent_id,
				parent_email: input.parent_email,
				temporary_password: result.temporary_password,
			},
		});
	} catch (error: any) {
		console.error('Error in create-student API:', error);
		return res.status(500).json({ 
			error: 'Internal server error',
			message: error.message 
		});
	}
}

