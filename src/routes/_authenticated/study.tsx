import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateStudyContent } from "@/lib/ai-study.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Brain, ChevronLeft, Layers, ListChecks, Pencil, Plus, Sparkles, Target, Trash2, Loader2, Menu, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({ meta: [{ title: "Study desk — My_Study_Place" }] }),
  component: StudyPage,
});

const CATEGORIES = ["Java", "React", "SQL", "Hibernate", "Spring", "DevOps", "Other"];

type Topic = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  progress: number;
  created_at: string;
};
type Note = { id: string; topic_id: string; title: string; content: string; created_at: string };
type Generated = { id: string; note_id: string; type: "quiz" | "flashcards" | "bullets" | "cheatsheet"; payload: any; created_at: string };

function StudyPage() {
  
  const qc = useQueryClient();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topicsQ = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });

  useEffect(() => {
    if (!selectedTopicId && topicsQ.data && topicsQ.data.length > 0) {
      setSelectedTopicId(topicsQ.data[0].id);
    }
  }, [topicsQ.data, selectedTopicId]);

  const selectedTopic = topicsQ.data?.find((t) => t.id === selectedTopicId) ?? null;

  const stats = useMemo(() => {
    const topics = topicsQ.data ?? [];
    return {
      total: topics.length,
      completed: topics.filter((t) => t.status === "completed").length,
      inProgress: topics.filter((t) => t.status === "in_progress").length,
      pending: topics.filter((t) => t.status === "pending").length,
    };
  }, [topicsQ.data]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1 -ml-1" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              <span className="font-display text-xl font-semibold">My_Study_Place</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 transform border-r border-border bg-background p-4 transition-transform md:relative md:inset-auto md:z-0 md:w-80 md:translate-x-0 md:border-0 md:bg-transparent md:p-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between md:hidden mb-4">
            <span className="font-display text-lg">Topics</span>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close"><X className="size-5" /></button>
          </div>

          <StatsBlock stats={stats} />

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-display text-lg">Topics</h2>
            <TopicDialog mode="create" trigger={<Button size="sm" variant="outline"><Plus className="size-3.5" /> New</Button>} />
          </div>

          <div className="mt-3 space-y-2">
            {topicsQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {topicsQ.data?.length === 0 && (
              <div className="paper-card p-4 text-sm text-muted-foreground">No topics yet. Add your first study topic.</div>
            )}
            {topicsQ.data?.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTopicId(t.id); setSidebarOpen(false); }}
                className={`w-full text-left rounded-lg border p-3 transition ${selectedTopicId === t.id ? "border-primary/60 bg-card lamp-glow" : "border-border bg-card/40 hover:border-primary/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base truncate">{t.title}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{t.category}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-muted-foreground">{t.progress}%</span>
                </div>
                <Progress value={t.progress} className="mt-2 h-1" />
              </button>
            ))}
          </div>
        </aside>
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-background/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="flex-1 min-w-0">
          {!selectedTopic ? (
            <EmptyState />
          ) : (
            <TopicDetail topic={selectedTopic} />
          )}
        </main>
      </div>
    </div>
  );
}

function StatsBlock({ stats }: { stats: { total: number; completed: number; inProgress: number; pending: number } }) {
  return (
    <div className="paper-card p-4">
      <div className="font-display text-sm text-muted-foreground">Your study</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="Done" value={stats.completed} accent="emerald" />
        <Stat label="Active" value={stats.inProgress} accent="amber" />
        <Stat label="Pending" value={stats.pending} />
      </div>
    </div>
  );
}
function Stat({ label, value, accent }: { label: string; value: number; accent?: "amber" | "emerald" }) {
  const color = accent === "amber" ? "text-primary" : accent === "emerald" ? "text-emerald-study" : "text-foreground";
  return (
    <div>
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Topic["status"] }) {
  const map = {
    pending: "border-border text-muted-foreground",
    in_progress: "border-primary/50 text-primary",
    completed: "border-emerald-study/50 text-emerald-study",
  } as const;
  const label = { pending: "Pending", in_progress: "Studying", completed: "Mastered" }[status];
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${map[status]}`}>{label}</span>;
}

function EmptyState() {
  return (
    <div className="paper-card lamp-glow flex h-full min-h-[60vh] flex-col items-center justify-center p-10 text-center">
      <Sparkles className="size-8 text-primary" />
      <h2 className="mt-4 font-display text-3xl">Begin a topic to start studying</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Add Java, React, SQL, Spring, Hibernate, DevOps — anything you're learning. Drop your notes inside and My_Study_Place will turn them into quizzes, flashcards, summaries and cheatsheets.
      </p>
      <TopicDialog mode="create" trigger={<Button className="mt-6"><Plus className="size-4" /> Add your first topic</Button>} />
    </div>
  );
}

function TopicDetail({ topic }: { topic: Topic }) {
  const qc = useQueryClient();
  const notesQ = useQuery({
    queryKey: ["notes", topic.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("topic_id", topic.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  useEffect(() => {
    if (notesQ.data && notesQ.data.length > 0 && (!selectedNoteId || !notesQ.data.find(n => n.id === selectedNoteId))) {
      setSelectedNoteId(notesQ.data[0].id);
    } else if (notesQ.data && notesQ.data.length === 0) {
      setSelectedNoteId(null);
    }
  }, [notesQ.data, selectedNoteId]);

  const selectedNote = notesQ.data?.find(n => n.id === selectedNoteId) ?? null;

  const updateStatus = useMutation({
    mutationFn: async (vars: { status: Topic["status"]; progress?: number }) => {
      const { error } = await supabase.from("topics").update(vars).eq("id", topic.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });

  const deleteTopic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("topics").delete().eq("id", topic.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); toast.success("Topic removed"); },
  });

  return (
    <div className="space-y-6">
      {/* Topic header */}
      <div className="paper-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">{topic.category}</Badge>
              <StatusBadge status={topic.status} />
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl">{topic.title}</h1>
            {topic.description && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{topic.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <TopicDialog mode="edit" topic={topic} trigger={<Button variant="outline" size="sm"><Pencil className="size-3.5" /> Edit</Button>} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"><Trash2 className="size-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this topic?</AlertDialogTitle>
                  <AlertDialogDescription>All notes and generated study material for "{topic.title}" will be removed. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTopic.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Progress {topic.progress}%</Label>
            <input
              type="range" min={0} max={100} value={topic.progress}
              onChange={(e) => updateStatus.mutate({ status: topic.status, progress: Number(e.target.value) })}
              className="mt-2 w-full accent-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "in_progress", "completed"] as const).map((s) => (
              <Button
                key={s} size="sm"
                variant={topic.status === s ? "default" : "outline"}
                onClick={() => updateStatus.mutate({ status: s, progress: s === "completed" ? 100 : s === "in_progress" && topic.progress === 0 ? 25 : topic.progress })}
              >
                {s === "pending" ? "Pending" : s === "in_progress" ? "Studying" : "Mastered"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes + AI workspace */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <NotesList notes={notesQ.data ?? []} topicId={topic.id} selectedNoteId={selectedNoteId} onSelect={setSelectedNoteId} />
        {selectedNote ? <NoteWorkspace note={selectedNote} /> : (
          <div className="paper-card flex min-h-[40vh] items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Add a note with your study material to start generating quizzes, flashcards, summaries and cheatsheets.
          </div>
        )}
      </div>
    </div>
  );
}

function NotesList({ notes, topicId, selectedNoteId, onSelect }: { notes: Note[]; topicId: string; selectedNoteId: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes", topicId] }); toast.success("Note removed"); },
  });

  return (
    <div className="paper-card p-4 space-y-3 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Notes</h3>
        <NoteDialog topicId={topicId} trigger={<Button size="sm" variant="outline"><Plus className="size-3.5" /></Button>} />
      </div>
      {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
      {notes.map((n) => (
        <div key={n.id} className={`rounded-md border p-3 transition ${selectedNoteId === n.id ? "border-primary/60 bg-accent/30" : "border-border"}`}>
          <button onClick={() => onSelect(n.id)} className="block w-full text-left">
            <div className="font-medium text-sm truncate">{n.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{n.content.slice(0, 120)}</div>
          </button>
          <div className="mt-2 flex justify-end gap-1">
            <NoteDialog topicId={topicId} note={n} trigger={<Button size="sm" variant="ghost" className="h-7 px-2"><Pencil className="size-3" /></Button>} />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => del.mutate(n.id)}><Trash2 className="size-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoteWorkspace({ note }: { note: Note }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateStudyContent);
  const [pending, setPending] = useState<string | null>(null);

  const contentQ = useQuery({
    queryKey: ["generated", note.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("generated_content").select("*").eq("note_id", note.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Generated[];
    },
  });

  async function run(type: Generated["type"]) {
    setPending(type);
    try {
      await generate({ data: { noteId: note.id, type } });
      await qc.invalidateQueries({ queryKey: ["generated", note.id] });
      toast.success(`${labelFor(type)} ready`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setPending(null); }
  }

  const latest = (type: Generated["type"]) => contentQ.data?.find((g) => g.type === type) ?? null;

  return (
    <div className="paper-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl">{note.title}</h3>
      </div>

      <Tabs defaultValue="bullets" className="mt-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bullets"><ListChecks className="size-3.5" /> Key Points</TabsTrigger>
          <TabsTrigger value="quiz"><Brain className="size-3.5" /> Quiz</TabsTrigger>
          <TabsTrigger value="flashcards"><Layers className="size-3.5" /> Flashcards</TabsTrigger>
          <TabsTrigger value="cheatsheet"><Target className="size-3.5" /> Cheatsheet</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
        </TabsList>

        {(["bullets", "quiz", "flashcards", "cheatsheet"] as const).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{descFor(type)}</p>
              <Button size="sm" onClick={() => run(type)} disabled={pending === type}>
                {pending === type ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {latest(type) ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <div className="mt-4">
              {pending === type ? <SkeletonBlock /> : <RenderGenerated type={type} item={latest(type)} />}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="source" className="mt-4">
          <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/40 border border-border rounded-md p-4 max-h-[60vh] overflow-auto">{note.content}</pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 w-3/4 bg-muted rounded" />
      <div className="h-4 w-5/6 bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded" />
    </div>
  );
}

function RenderGenerated({ type, item }: { type: Generated["type"]; item: Generated | null }) {
  if (!item) return <p className="text-sm text-muted-foreground">Click Generate to create from this note.</p>;
  if (type === "bullets") return <BulletsView payload={item.payload} />;
  if (type === "quiz") return <QuizView payload={item.payload} />;
  if (type === "flashcards") return <FlashcardsView payload={item.payload} />;
  return <CheatsheetView payload={item.payload} />;
}

function BulletsView({ payload }: { payload: any }) {
  const pts: string[] = payload?.points ?? [];
  return (
    <ul className="space-y-2">
      {pts.map((p, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

function QuizView({ payload }: { payload: any }) {
  const questions: Array<{ question: string; options: string[]; answerIndex: number; explanation: string }> = payload?.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [reveal, setReveal] = useState(false);
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border border-border p-4">
          <div className="font-medium text-sm">{qi + 1}. {q.question}</div>
          <div className="mt-3 space-y-1.5">
            {q.options.map((opt, oi) => {
              const picked = answers[qi] === oi;
              const correct = reveal && oi === q.answerIndex;
              const wrong = reveal && picked && oi !== q.answerIndex;
              return (
                <button
                  key={oi}
                  onClick={() => setAnswers({ ...answers, [qi]: oi })}
                  className={`block w-full text-left rounded-md border px-3 py-2 text-sm transition ${correct ? "border-emerald-study/60 bg-emerald-study/10" : wrong ? "border-destructive/60 bg-destructive/10" : picked ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {reveal && <p className="mt-3 text-xs text-muted-foreground"><span className="text-primary">Why:</span> {q.explanation}</p>}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => { setReveal(false); setAnswers({}); }}>Reset</Button>
        <div className="flex items-center gap-3">
          {reveal && <span className="text-sm">Score: <strong className="text-primary">{score}/{questions.length}</strong></span>}
          <Button size="sm" onClick={() => setReveal(true)}>Check answers</Button>
        </div>
      </div>
    </div>
  );
}

function FlashcardsView({ payload }: { payload: any }) {
  const cards: Array<{ front: string; back: string }> = payload?.cards ?? [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (cards.length === 0) return null;
  const card = cards[idx];
  return (
    <div className="space-y-4">
      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[200px] paper-card lamp-glow flex items-center justify-center p-8 text-center transition hover:border-primary/40"
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{flipped ? "Answer" : "Question"}</div>
          <div className="mt-3 font-display text-xl md:text-2xl">{flipped ? card.back : card.front}</div>
        </div>
      </button>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => { setIdx((idx - 1 + cards.length) % cards.length); setFlipped(false); }}>Prev</Button>
        <span className="text-xs text-muted-foreground">{idx + 1} / {cards.length}</span>
        <Button size="sm" onClick={() => { setIdx((idx + 1) % cards.length); setFlipped(false); }}>Next</Button>
      </div>
    </div>
  );
}

function CheatsheetView({ payload }: { payload: any }) {
  const sections: Array<{ title: string; content: string }> = payload?.sections ?? [];
  return (
    <div className="space-y-5">
      {sections.map((s, i) => (
        <div key={i}>
          <h4 className="font-display text-lg text-primary">{s.title}</h4>
          <pre className="mt-2 whitespace-pre-wrap text-sm font-mono bg-muted/40 border border-border rounded-md p-3">{s.content}</pre>
        </div>
      ))}
    </div>
  );
}

function labelFor(t: Generated["type"]) { return ({ quiz: "Quiz", flashcards: "Flashcards", bullets: "Summary", cheatsheet: "Cheatsheet" })[t]; }
function descFor(t: Generated["type"]) {
  return ({
    bullets: "Crisp key points pulled from your notes.",
    quiz: "Multiple-choice questions with explanations.",
    flashcards: "Flip-cards for active recall.",
    cheatsheet: "Reference with code examples.",
  })[t];
}

/* ---------- Dialogs ---------- */

function TopicDialog({ mode, topic, trigger }: { mode: "create" | "edit"; topic?: Topic; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(topic?.title ?? "");
  const [category, setCategory] = useState(topic?.category ?? "Java");
  const [description, setDescription] = useState(topic?.description ?? "");

  useEffect(() => { if (open && topic) { setTitle(topic.title); setCategory(topic.category); setDescription(topic.description ?? ""); } }, [open, topic]);

  const mut = useMutation({
    mutationFn: async () => {
      if (mode === "edit" && topic) {
        const { error } = await supabase.from("topics").update({ title, category, description }).eq("id", topic.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        const { error } = await supabase.from("topics").insert({ title, category, description, user_id: u.user.id });
        if (error) throw error;
        setTitle(""); setDescription("");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); setOpen(false); toast.success(mode === "edit" ? "Topic updated" : "Topic added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "edit" ? "Edit topic" : "New topic"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spring Boot Fundamentals" className="mt-1" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do you want to learn here?" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!title.trim() || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Create topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ topicId, note, trigger }: { topicId: string; note?: Note; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  useEffect(() => { if (open && note) { setTitle(note.title); setContent(note.content); } }, [open, note]);

  const mut = useMutation({
    mutationFn: async () => {
      if (note) {
        const { error } = await supabase.from("notes").update({ title, content }).eq("id", note.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        const { error } = await supabase.from("notes").insert({ topic_id: topicId, title, content, user_id: u.user.id });
        if (error) throw error;
        setTitle(""); setContent("");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes", topicId] }); setOpen(false); toast.success(note ? "Note updated" : "Note added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Java Streams & Lambdas" className="mt-1" />
          </div>
          <div>
            <Label>Study material</Label>
            <Textarea
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your study material here — lecture notes, documentation, code, anything. The longer and more specific, the better the AI-generated study aids."
              className="mt-1 min-h-[260px] font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{content.length} characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!title.trim() || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            {note ? "Save" : "Create note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
