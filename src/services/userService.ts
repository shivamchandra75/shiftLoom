import { supabase } from "@/src/lib/supabase";

export interface User {
  id: string;
  email: string;
  role: "admin" | "user" | null;
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
