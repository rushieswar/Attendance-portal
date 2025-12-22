/**
 * Authentication Hooks
 * React hooks for managing authentication state
 */

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { UserRole, type Profile } from '../types/database';

// =====================================================
// AUTHENTICATION HOOK
// =====================================================

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
			if (session?.user) {
				fetchProfile(session.user.id);
			} else {
				setLoading(false);
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			if (session?.user) {
				fetchProfile(session.user.id);
			} else {
				setProfile(null);
				setLoading(false);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const fetchProfile = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (error) throw error;

			setProfile(data);
		} catch (error) {
			console.error('Error fetching profile:', error);
			setProfile(null);
		} finally {
			setLoading(false);
		}
	};

	return {
		user,
		profile,
		loading,
		isAuthenticated: !!user,
		role: profile?.role as UserRole | null,
		isSuperAdmin: profile?.role === UserRole.SUPER_ADMIN,
		isTeacher: profile?.role === UserRole.TEACHER,
		isStudent: profile?.role === UserRole.STUDENT,
		isParent: profile?.role === UserRole.PARENT,
	};
}

// =====================================================
// ROLE-BASED ACCESS HOOK
// =====================================================

export function useRequireAuth(allowedRoles?: UserRole[]) {
	const { user, profile, loading } = useAuth();
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		if (loading) return;

		if (!user) {
			// Redirect to login
			window.location.href = '/auth-pages/login';
			return;
		}

		if (allowedRoles && profile) {
			const hasPermission = allowedRoles.includes(profile.role as UserRole);
			setAuthorized(hasPermission);

			if (!hasPermission) {
				// Redirect to unauthorized page
				window.location.href = '/unauthorized';
			}
		} else {
			setAuthorized(true);
		}
	}, [user, profile, loading, allowedRoles]);

	return {
		user,
		profile,
		loading,
		authorized,
	};
}

// =====================================================
// PROFILE HOOK
// =====================================================

export function useProfile() {
	const { user, profile, loading } = useAuth();

	const updateProfile = async (updates: Partial<Profile>) => {
		if (!user) return { error: 'Not authenticated' };

		const { error } = await supabase
			.from('profiles')
			.update(updates)
			.eq('id', user.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	};

	return {
		profile,
		loading,
		updateProfile,
	};
}

// =====================================================
// SESSION HOOK
// =====================================================

export function useSession() {
	const [session, setSession] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);

	return { session, loading };
}

