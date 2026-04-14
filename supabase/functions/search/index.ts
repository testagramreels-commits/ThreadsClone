import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q") ?? "";
    const type = url.searchParams.get("type") ?? "all"; // all | users | threads | hashtags
    const limit = parseInt(url.searchParams.get("limit") ?? "20");

    if (!query.trim()) {
      return new Response(JSON.stringify({ data: { users: [], threads: [], hashtags: [] } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { users: any[]; threads: any[]; hashtags: string[] } = {
      users: [],
      threads: [],
      hashtags: [],
    };

    // Parallel search
    const promises: Promise<void>[] = [];

    if (type === "all" || type === "users") {
      promises.push(
        supabase
          .from("user_profiles")
          .select("id, username, avatar_url, bio")
          .ilike("username", `%${query}%`)
          .limit(limit)
          .then(({ data }) => {
            results.users = data ?? [];
          })
      );
    }

    if (type === "all" || type === "threads") {
      promises.push(
        supabase.rpc("get_threads_with_stats", {
          p_user_id: userId,
          p_limit: limit,
          p_offset: 0,
          p_media_type: null,
          p_following_only: false,
        }).then(({ data }) => {
          // Filter by content
          results.threads = (data ?? []).filter((t: any) =>
            t.content?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, limit);
        })
      );
    }

    if (type === "all" || type === "hashtags") {
      promises.push(
        supabase
          .from("threads")
          .select("content")
          .ilike("content", `%#${query}%`)
          .limit(200)
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            const regex = new RegExp(`#(${query}\\w*)`, "gi");
            (data ?? []).forEach((t: any) => {
              let match;
              while ((match = regex.exec(t.content)) !== null) {
                const tag = match[1].toLowerCase();
                counts[tag] = (counts[tag] ?? 0) + 1;
              }
            });
            results.hashtags = Object.entries(counts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([tag]) => `#${tag}`);
          })
      );
    }

    await Promise.all(promises);

    return new Response(JSON.stringify({ data: results }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=5, stale-while-revalidate=15",
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
