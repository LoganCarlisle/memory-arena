import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { discipline, score, percentage } = body as {
      discipline?: string;
      score?: number;
      percentage?: number;
    };

    if (!discipline || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase.from('game_results').insert([
      {
        user_id: user.id,
        discipline,
        score,
        percentage,
      },
    ]);

    if (error) {
      console.log('Game results insert failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Game results route error:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
