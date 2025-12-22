/**
 * API Route: Create Teacher
 * POST /api/users/create-teacher
 * 
 * Creates a new teacher account (Super Admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createTeacher, CreateTeacherInput } from '../../../lib/api/users';
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

		// Verify user is super admin
		const isSuperAdmin = await verifyUserRole(user.id, [UserRole.SUPER_ADMIN]);
		if (!isSuperAdmin) {
			return res.status(403).json({ error: 'Forbidden - Super Admin access required' });
		}

		// Validate request body
		const input: CreateTeacherInput = req.body;

		if (!input.email || !input.full_name || !input.employee_id || !input.joining_date || !input.temporary_password) {
			return res.status(400).json({ 
				error: 'Missing required fields: email, full_name, employee_id, joining_date, temporary_password' 
			});
		}

		// Create the teacher
		const result = await createTeacher(input);

		if (!result.success) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(201).json({
			success: true,
			message: 'Teacher created successfully',
			data: {
				teacher_id: result.teacher_id,
				user_id: result.user_id,
				email: input.email,
				temporary_password: result.temporary_password,
			},
		});
	} catch (error: any) {
		console.error('Error in create-teacher API:', error);
		return res.status(500).json({ 
			error: 'Internal server error',
			message: error.message 
		});
	}
}

