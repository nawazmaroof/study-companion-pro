import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, Layers, ListChecks, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scriptorium — Your Personal Study Workspace" },
      { name: "description", content: "Paste your notes. Get quizzes, flashcards, bullet summaries and code cheatsheets. Built for developers studying Java, React, SQL, Spring, Hibernate and DevOps." },
    ],
  }),
  component: Landing,
});

const TRACKS = ["Java", "React", "SQL", "Hibernate", "Spring", "DevOps"];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <span className="font-display text-xl font-semibold tracking-tight">Scriptorium</span>
        </Link>
        <Link
          to="/study"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/60 hover:text-primary transition"
        >
          Open study desk
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-12 pb-20 md:pt-24 md:pb-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            AI study companion for developers
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight">
            A quiet desk for <em className="text-primary not-italic">deep study</em>.
            <br />
            <span className="text-muted-foreground">Notes in. Mastery out.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            Drop your study material — lecture notes, docs, code, anything. Scriptorium turns it into
            quizzes, flashcards, bullet summaries and code cheatsheets, and tracks every topic you're
            studying so nothing slips.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="lamp-glow rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Open your study desk
            </Link>
            <a href="#features" className="rounded-md border border-border px-6 py-3 text-sm font-medium hover:border-primary/60 transition">
              See how it works
            </a>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {TRACKS.map((t) => (
              <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-mono">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pb-24">
          {[
            { i: Brain, t: "Quizzes", d: "Multiple-choice questions with explanations, generated from your notes." },
            { i: Layers, t: "Flashcards", d: "Flip-cards to drill definitions, syntax and concepts on the go." },
            { i: ListChecks, t: "Bullet Summary", d: "The crucial points distilled — perfect for a quick revision pass." },
            { i: Target, t: "Cheatsheet", d: "A reference of concepts and code examples you can keep open while coding." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="paper-card p-6">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-4 font-display text-xl">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built for focused, distraction-free study.
      </footer>
    </div>
  );
}
