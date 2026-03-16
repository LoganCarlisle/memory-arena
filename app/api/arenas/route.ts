import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: arenas, error } = await supabase
      .from('arenas')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Arenas table not set up yet:', error.message);
      // Return mock data
      return NextResponse.json({
        arenas: [
          {
            id: '1',
            title: "Cards Championship",
            discipline: 'Cards',
            player_count: 1284,
            max_players: 2000,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'active'
          },
          {
            id: '2',
            title: "Numbers League",
            discipline: 'Numbers',
            player_count: 743,
            max_players: 1000,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'active'
          }
        ]
      });
    }

    return NextResponse.json({ arenas: arenas || [] });
  } catch (error) {
    console.error('Failed to fetch arenas:', error);
    return NextResponse.json({ error: 'Failed to fetch arenas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, discipline, max_players = 100, duration_minutes = 60 } = body;

    const { data: arena, error } = await supabase
      .from('arenas')
      .insert({
        title,
        discipline,
        max_players,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + duration_minutes * 60 * 1000).toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.log('Failed to create arena:', error.message);
      return NextResponse.json({ error: 'Failed to create arena' }, { status: 500 });
    }

    return NextResponse.json({ arena });
  } catch (error) {
    console.error('Failed to create arena:', error);
    return NextResponse.json({ error: 'Failed to create arena' }, { status: 500 });
  }
}