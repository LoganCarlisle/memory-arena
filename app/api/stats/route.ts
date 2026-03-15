import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get total online users (users active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let onlineUsers = 0;
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fiveMinutesAgo);

      if (!error && count !== null) {
        onlineUsers = count;
      }
    } catch (err) {
      console.log('Database not set up yet, using 0 online users');
    }

    // Get active players per discipline
    let disciplineStats = null;
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('discipline')
        .gte('created_at', fiveMinutesAgo);

      if (!error && data) {
        disciplineStats = data;
      }
    } catch (err) {
      console.log('Using default discipline counts');
    }

    // Count players per discipline
    const disciplineCounts: Record<string, number> = {
      'Cards': 0,
      'Numbers': 0,
      'Words': 0,
      'Names & Faces': 0,
      'Images': 0,
      'Surprise': 0,
    };

    if (disciplineStats) {
      disciplineStats.forEach(session => {
        const key = session.discipline === 'names_faces' ? 'Names & Faces' :
                   session.discipline === 'cards' ? 'Cards' :
                   session.discipline === 'numbers' ? 'Numbers' :
                   session.discipline === 'words' ? 'Words' :
                   session.discipline === 'images' ? 'Images' :
                   session.discipline === 'surprise' ? 'Surprise' : session.discipline;
        disciplineCounts[key] = (disciplineCounts[key] || 0) + 1;
      });
    }

    // Get live arenas
    let arenas: any[] = [];
    try {
      const { data, error } = await supabase
        .from('arenas')
        .select('id, title, player_count, ends_at, status')
        .eq('status', 'active');

      if (!error && data) {
        arenas = data;
      }
    } catch (err) {
      console.log('Using default arenas');
      // Default arenas if database not set up
      arenas = [
        {
          id: '1',
          title: "March Cards Slam",
          player_count: 1284,
          ends_at: new Date(Date.now() + 47 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          id: '2',
          title: "Numbers 1000 Challenge",
          player_count: 743,
          ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          id: '3',
          title: "World Tour Qualifier",
          player_count: 512,
          ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          id: '4',
          title: "Surprise Mix League",
          player_count: 329,
          ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'active'
        }
      ];
    }

    // Get recent activity
    let recentActivity: any[] = [];
    try {
      const { data, error } = await supabase
        .from('game_results')
        .select('user_id, discipline, score, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        recentActivity = data;
      }
    } catch (err) {
      console.log('Using default activity');
      // Default activity if database not set up
      recentActivity = [
        {
          user_id: '1',
          discipline: 'Cards',
          score: 0.92,
          created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString()
        },
        {
          user_id: '2',
          discipline: 'Numbers',
          score: 0.87,
          created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        },
        {
          user_id: '3',
          discipline: 'Words',
          score: 0.95,
          created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
        }
      ];
    }

    return NextResponse.json({
      onlineUsers,
      disciplineCounts,
      arenas,
      recentActivity,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    // Return default data on any error
    return NextResponse.json({
      onlineUsers: 0,
      disciplineCounts: {
        'Cards': 0,
        'Numbers': 0,
        'Words': 0,
        'Names & Faces': 0,
        'Images': 0,
        'Surprise': 0,
      },
      arenas: [],
      recentActivity: [],
    });
  }
}