/**
 * Supabase Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { UserRole, type Profile } from '../lib/types/database';

// =====================================================
// CONTEXT TYPES
// =====================================================

interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	loading: boolean;
	signIn: (email: string, password: string) => Promise<{ error: string | null }>;
	signOut: () => Promise<void>;
	isAuthenticated: boolean;
	role: UserRole | null;
	isSuperAdmin: boolean;
	isTeacher: boolean;
	isStudent: boolean;
	isParent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// PROVIDER COMPONENT
// =====================================================

interface AuthProviderProps {
	children: ReactNode;
}

export function SupabaseAuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Get initial session
		const initializeAuth = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				setUser(session?.user ?? null);

				if (session?.user) {
					await fetchProfile(session.user.id);
				}
			} catch (error) {
				console.error('Error initializing auth:', error);
			} finally {
				setLoading(false);
			}
		};

		initializeAuth();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			setUser(session?.user ?? null);

			if (session?.user) {
				await fetchProfile(session.user.id);
			} else {
				setProfile(null);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
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
		}
	};

	const signIn = async (email: string, password: string) => {
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				return { error: error.message };
			}

			return { error: null };
		} catch (error: any) {
			return { error: error.message || 'An error occurred during sign in' };
		}
	};

	const signOut = async () => {
		try {
			await supabase.auth.signOut();
			setUser(null);
			setProfile(null);
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	const value: AuthContextType = {
		user,
		profile,
		loading,
		signIn,
		signOut,
		isAuthenticated: !!user,
		role: profile?.role as UserRole | null,
		isSuperAdmin: profile?.role === UserRole.SUPER_ADMIN,
		isTeacher: profile?.role === UserRole.TEACHER,
		isStudent: profile?.role === UserRole.STUDENT,
		isParent: profile?.role === UserRole.PARENT,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =====================================================
// HOOK TO USE AUTH CONTEXT
// =====================================================

export function useSupabaseAuth() {
	const context = useContext(AuthContext);

	if (context === undefined) {
		throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
	}

	return context;
}

