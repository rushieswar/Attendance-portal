/**
 * Authentication Helper Functions
 * Handles user authentication, role checking, and session management
 */

import { supabase } from '../supabase/client';
import { UserRole, type Profile } from '../types/database';

// =====================================================
// AUTHENTICATION FUNCTIONS
// =====================================================

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		return { data: null, error: error.message };
	}

	return { data, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut() {
	const { error } = await supabase.auth.signOut();

	if (error) {
		return { error: error.message };
	}

	return { error: null };
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		console.error('Error fetching user:', error);
		return null;
	}

	return user;
}

/**
 * Get the current user's profile with role information
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
	const user = await getCurrentUser();

	if (!user) {
		return null;
	}

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	if (error) {
		console.error('Error fetching profile:', error);
		return null;
	}

	return profile;
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
	const profile = await getCurrentUserProfile();

	if (!profile) {
		return false;
	}

	return profile.role === role;
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
	const profile = await getCurrentUserProfile();

	if (!profile) {
		return false;
	}

	return roles.includes(profile.role as UserRole);
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
	return hasRole(UserRole.SUPER_ADMIN);
}

/**
 * Check if the current user is a teacher
 */
export async function isTeacher(): Promise<boolean> {
	return hasRole(UserRole.TEACHER);
}

/**
 * Check if the current user is a parent
 */
export async function isParent(): Promise<boolean> {
	return hasRole(UserRole.PARENT);
}

/**
 * Check if the current user has staff privileges (super admin or teacher)
 */
export async function isStaff(): Promise<boolean> {
	return hasAnyRole([UserRole.SUPER_ADMIN, UserRole.TEACHER]);
}

// =====================================================
// PASSWORD MANAGEMENT
// =====================================================

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${window.location.origin}/auth/reset-password`,
	});

	if (error) {
		return { error: error.message };
	}

	return { error: null };
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
	const { error } = await supabase.auth.updateUser({
		password: newPassword,
	});

	if (error) {
		return { error: error.message };
	}

	return { error: null };
}

