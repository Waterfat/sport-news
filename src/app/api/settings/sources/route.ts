import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: 取得所有爬蟲來源
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("crawl_sources")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// POST: 新增爬蟲來源
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, base_url } = body as { name: string; base_url: string };

    if (!name || !base_url) {
      return NextResponse.json(
        { error: "name and base_url are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("crawl_sources")
      .insert({ name, base_url })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// PUT: 更新爬蟲來源
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, base_url, is_active, crawl_images } = body as {
      id: number;
      name?: string;
      base_url?: string;
      is_active?: boolean;
      crawl_images?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (base_url !== undefined) updateData.base_url = base_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (crawl_images !== undefined) updateData.crawl_images = crawl_images;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("crawl_sources")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// DELETE: 刪除爬蟲來源
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "valid numeric id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("crawl_sources")
      .delete()
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
