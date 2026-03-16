import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        player1:player1_id(id, email),
        player2:player2_id(id, email)
      `)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Matches table not set up yet:', error.message);
      // Return mock data
      return NextResponse.json({
        matches: [
          {
            id: '1',
            arena_id: '1',
            player1_id: 'user1',
            player2_id: 'user2',
            player1_name: 'Alice',
            player2_name: 'Bob',
            discipline: 'Cards',
            status: 'playing',
            created_at: new Date().toISOString()
          }
        ]
      });
    }

    // Format the matches with user names
    const formattedMatches = matches?.map(match => ({
      ...match,
      player1_name: match.player1?.email?.split('@')[0] || match.player1_name || 'Player 1',
      player2_name: match.player2?.email?.split('@')[0] || match.player2_name || 'Player 2'
    })) || [];

    return NextResponse.json({ matches: formattedMatches });
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
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
    const { discipline = 'Cards', is_ranked = false } = body;

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const playerName = profile?.username || user.email?.split('@')[0] || 'Anonymous';

    // Try to find an existing waiting match for this discipline
    const { data: waitingMatch, error: findError } = await supabase
      .from('matches')
      .select('*')
      .eq('discipline', discipline)
      .eq('status', 'waiting')
      .neq('player1_id', user.id)
      .limit(1)
      .single();

    if (!findError && waitingMatch) {
      // Join existing match
      const { data: updatedMatch, error: joinError } = await supabase
        .from('matches')
        .update({
          player2_id: user.id,
          player2_name: playerName,
          status: 'playing',
          started_at: new Date().toISOString()
        })
        .eq('id', waitingMatch.id)
        .select()
        .single();

      if (joinError) {
        return NextResponse.json({ error: 'Failed to join match' }, { status: 500 });
      }

      return NextResponse.json({ match: updatedMatch, joined: true });
    } else {
      // Create new match
      const { data: newMatch, error: createError } = await supabase
        .from('matches')
        .insert({
          player1_id: user.id,
          player1_name: playerName,
          discipline,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) {
        console.log('Failed to create match:', createError.message);
        return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
      }

      return NextResponse.json({ match: newMatch, created: true });
    }
  } catch (error) {
    console.error('Failed to create/join match:', error);
    return NextResponse.json({ error: 'Failed to create/join match' }, { status: 500 });
  }
}