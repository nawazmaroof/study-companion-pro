import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  noteId: z.string().uuid(),
  type: z.enum(["quiz", "flashcards", "bullets", "cheatsheet"]),
});

const SYSTEM = `You are an expert study coach. Always respond with STRICT JSON that matches the requested schema. Be concise, technically accurate, and tailored to programming and IT topics (Java, React, SQL, Hibernate, Spring, DevOps).`;

function promptFor(type: string, title: string, content: string) {
  const base = `Topic: "${title}"\n\nStudy material:\n"""\n${content.slice(0, 12000)}\n"""\n\n`;
  if (type === "quiz") {
    return base + `Generate 8 multiple-choice questions. Return JSON: {"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":0|1|2|3,"explanation":string}]}`;
  }
  if (type === "flashcards") {
    return base + `Generate 10 study flashcards. Return JSON: {"cards":[{"front":string,"back":string}]}`;
  }
  if (type === "bullets") {
    return base + `Summarize the most important things to understand as crisp bullet points (max 12). Return JSON: {"points":[string]}`;
  }
  return base + `Build a cheatsheet of the key concepts with code examples where useful. Return JSON: {"sections":[{"title":string,"content":string}]} where content is markdown.`;
}

export const generateStudyContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: note, error: noteErr } = await context.supabase
      .from("notes")
      .select("id, title, content, user_id")
      .eq("id", data.noteId)
      .single();
    if (noteErr || !note) throw new Error("Note not found");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: promptFor(data.type, note.title, note.content) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit hit — please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    const { data: saved, error: saveErr } = await context.supabase
      .from("generated_content")
      .insert({ note_id: data.noteId, type: data.type, user_id: context.userId, payload: payload as never })
      .select()
      .single();
    if (saveErr) throw new Error(saveErr.message);
    return saved;
  });
