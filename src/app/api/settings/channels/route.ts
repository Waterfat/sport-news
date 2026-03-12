import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: 取得所有發布頻道
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("publish_channels")
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

// POST: 新增發布頻道
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, config, is_active } = body as {
      name: string;
      type: string;
      config: Record<string, string>;
      is_active?: boolean;
    };

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("publish_channels")
      .insert({
        name,
        type,
        config: config || {},
        is_active: is_active !== undefined ? is_active : true,
      })
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

// PUT: 更新發布頻道
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, type, config, is_active } = body as {
      id: number;
      name?: string;
      type?: string;
      config?: Record<string, string>;
      is_active?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (config !== undefined) updateData.config = config;
    if (is_active !== undefined) updateData.is_active = is_active;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("publish_channels")
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

// DELETE: 刪除發布頻道
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "valid numeric id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("publish_channels")
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
