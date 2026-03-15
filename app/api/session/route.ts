import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Try to update session, but don't fail if table doesn't exist
      try {
        const { error } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.log('Session table not set up yet:', error.message);
        }
      } catch (err) {
        console.log('Session update skipped - database not ready');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('Session update error (non-critical):', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 200 }); // Return 200 to avoid HTML responses
  }
}