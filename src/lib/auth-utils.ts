import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a profile exists for the current user (belt & suspenders approach)
 * This prevents edge cases where the database trigger might not fire
 */
export async function ensureProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "No authenticated user" };
    }

    // Upsert profile - will create if doesn't exist, do nothing if it does
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        email: user.email ?? "",
        updated_at: new Date().toISOString()
      }, { 
        onConflict: "user_id",
        ignoreDuplicates: false 
      });

    if (error) {
      console.error("Failed to ensure profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error ensuring profile:", error);
    return { success: false, error: "Unexpected error" };
  }
}
