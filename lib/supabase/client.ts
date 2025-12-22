/**
 * Supabase Client for Browser/Client-Side Usage
 * 
 * This client is safe to use in the browser as it only uses the anon key.
 * Row Level Security (RLS) policies will protect your data.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase environment variables. Please check your .env.local file.'
	);
}

/**
 * Supabase client for client-side operations
 * Automatically handles authentication state
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storage: typeof window !== 'undefined' ? window.localStorage : undefined,
	},
});

/**
 * Helper function to get the current user
 */
export const getCurrentUser = async () => {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		console.error('Error fetching user:', error);
		return null;
	}

	return user;
};

/**
 * Helper function to get the current session
 */
export const getCurrentSession = async () => {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error) {
		console.error('Error fetching session:', error);
		return null;
	}

	return session;
};

/**
 * Helper function to sign out
 */
export const signOut = async () => {
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('Error signing out:', error);
		throw error;
	}
};

