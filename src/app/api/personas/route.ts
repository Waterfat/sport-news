import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("writer_personas")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ personas: data });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, description, style_prompt, is_active, specialties, writer_type, max_articles } = body;

  if (!name || !style_prompt) {
    return NextResponse.json(
      { error: "name and style_prompt are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("writer_personas")
    .insert({
      name,
      description: description || null,
      style_prompt,
      is_active: is_active ?? true,
      specialties: specialties || { sports: [], leagues: [], teams: [] },
      writer_type: writer_type || "columnist",
      max_articles: max_articles ?? 2,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("writer_personas")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("writer_personas")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
