import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: Fetch comments for an article
export async function GET(request: NextRequest) {
  try {
    const articleId = request.nextUrl.searchParams.get("article_id");

    if (!articleId) {
      return NextResponse.json(
        { error: "article_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("comments")
      .select("id, article_id, author_name, content, created_at")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// POST: Create a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article_id, author_name, content } = body as {
      article_id: string;
      author_name: string;
      content: string;
    };

    // Validation
    if (!article_id) {
      return NextResponse.json(
        { error: "article_id is required" },
        { status: 400 }
      );
    }

    if (!author_name || author_name.trim().length === 0) {
      return NextResponse.json(
        { error: "author_name is required" },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "content must be 1000 characters or less" },
        { status: 400 }
      );
    }

    if (author_name.length > 100) {
      return NextResponse.json(
        { error: "author_name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({
        article_id,
        author_name: author_name.trim(),
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
