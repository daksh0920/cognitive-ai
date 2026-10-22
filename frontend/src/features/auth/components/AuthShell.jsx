
import { BookOpen, Sparkles } from "lucide-react";

function AuthShell({ title, description, children, footer }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/70">
            <BookOpen size={28} />
          </div>

          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Cognitive
            </h1>
            <Sparkles size={18} className="text-emerald-600" />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Your personal AI learning assistant
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
              {footer}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Learn at your own pace. Understand things deeply.
        </p>
      </div>
    </main>
  );
}

export default AuthShell;
