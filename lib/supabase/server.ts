/**
 * Supabase Client for Server-Side Usage
 * 
 * This client uses the service role key and should ONLY be used on the server.
 * It bypasses Row Level Security (RLS) policies - use with caution!
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
	throw new Error(
		'Missing Supabase server environment variables. Please check your .env.local file.'
	);
}

/**
 * Supabase admin client for server-side operations
 * ⚠️ WARNING: This client bypasses RLS policies. Use only when necessary.
 * 
 * Use cases:
 * - Admin operations that need to bypass RLS
 * - Background jobs and cron tasks
 * - Data migrations
 * - System-level operations
 */
export const supabaseAdmin = createClient<Database>(
	supabaseUrl,
	supabaseServiceRoleKey,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	}
);

/**
 * Helper function to verify user role
 * Use this in API routes to check permissions
 */
export const verifyUserRole = async (
	userId: string,
	allowedRoles: string[]
): Promise<boolean> => {
	const { data: profile, error } = await supabaseAdmin
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.single();

	if (error || !profile) {
		console.error('Error fetching user role:', error);
		return false;
	}

	return allowedRoles.includes(profile.role);
};

