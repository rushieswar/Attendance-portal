/**
 * Database Types for Supabase
 * 
 * These types will be auto-generated once you create your database schema.
 * For now, we'll define them manually based on the core concept.
 * 
 * To auto-generate in the future, run:
 * npx supabase gen types typescript --project-id your-project-id > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					role: 'super_admin' | 'teacher' | 'student' | 'parent';
					full_name: string;
					phone: string | null;
					address: string | null;
					avatar_url: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					role: 'super_admin' | 'teacher' | 'student' | 'parent';
					full_name: string;
					phone?: string | null;
					address?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					role?: 'super_admin' | 'teacher' | 'student' | 'parent';
					full_name?: string;
					phone?: string | null;
					address?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			schools: {
				Row: {
					id: string;
					name: string;
					address: string;
					contact_email: string;
					contact_phone: string;
					settings: Json | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					address: string;
					contact_email: string;
					contact_phone: string;
					settings?: Json | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					address?: string;
					contact_email?: string;
					contact_phone?: string;
					settings?: Json | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			academic_years: {
				Row: {
					id: string;
					school_id: string;
					name: string;
					start_date: string;
					end_date: string;
					is_current: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					school_id: string;
					name: string;
					start_date: string;
					end_date: string;
					is_current?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					school_id?: string;
					name?: string;
					start_date?: string;
					end_date?: string;
					is_current?: boolean;
					created_at?: string;
					updated_at?: string;
				};
			};
			// Add more table types here as we build them
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			user_role: 'super_admin' | 'teacher' | 'student' | 'parent';
			attendance_status: 'present' | 'absent' | 'late';
		};
	};
}

