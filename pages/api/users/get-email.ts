/**
 * API Route: Get User Email
 * GET /api/users/get-email?userId=xxx
 * 
 * Fetches user email from auth.users table (requires service role)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	// Only allow GET requests
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const { userId } = req.query;

		if (!userId || typeof userId !== 'string') {
			return res.status(400).json({ error: 'User ID is required' });
		}

		// Fetch user email from auth.users using admin client
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

		if (authError) {
			console.error('Error fetching user email:', authError);
			return res.status(500).json({ error: 'Failed to fetch user email' });
		}

		return res.status(200).json({ 
			email: authData?.user?.email || null 
		});
	} catch (error) {
		console.error('Error in get-email API:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
}

