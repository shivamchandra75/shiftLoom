import { supabase } from "@/src/lib/supabase";

export type UpdateProfileInput = Partial<Pick<User, 'firstName' | 'lastName' | 'role'>>;

export interface User {
  id: string;
  email: string;
  role: "steward" | "chef" | "driver" | null;
  isVerified: boolean;
  firstName: string;
  lastName: string;
}

/**
 * Fetches the user record from the database by ID.
 * Returns null if the user profile doesn't exist yet in public.users.
 */
export async function fetchUser(userId: string): Promise<User | null> {
  const { data: dbUser, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // Supabase PGRST116 indicates single row query returned 0 rows
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return {
    id: dbUser.id,
    email: dbUser.email || "",
    role: dbUser.role,
    isVerified: dbUser.verification_status === "verified",
    firstName: dbUser.first_name || "",
    lastName: dbUser.last_name || "",
  };
}

export async function updateUser(userId: string, updates:UpdateProfileInput){
  if(!updates) { throw new Error("Missing updates or user id"); }

  console.log('updates', updates);
  const formattedUpdates: Record<string, any> = {};

  if (updates.firstName !== undefined) formattedUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) formattedUpdates.last_name = updates.lastName;
  if (updates.role !== undefined) formattedUpdates.role = updates.role;

  const { error }= await supabase.from('users').update(formattedUpdates).eq('id', userId);
  console.log('error', error);
  if (error) throw error;
}
