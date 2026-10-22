import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, BrainCircuit, Clock3, FileText, LoaderCircle } from "lucide-react";
import { getDocuments } from "../../documents/api/documentsApi";
import { getFlashcardSets } from "../../flashcards/api/flashcardsApi";
import { getDocumentQuizzes } from "../../quizzes/api/quizzesApi";
import { getErrorMessage } from "../../../lib/errorMessage";

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", "");
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <article className="flex min-h-[151px] items-start justify-between rounded-[19px] border border-[#e9ecf0] bg-white px-[28px] py-[28px] shadow-[0_7px_22px_rgba(20,40,70,0.035)]">
      <div className="pt-[15px]">
        <p className="text-[13px] font-medium uppercase tracking-[0.01em] text-[#778191]">{label}</p>
        <p className="mt-[16px] text-[34px] font-semibold leading-none tracking-[-0.045em] text-[#171d2b]">{value}</p>
      </div>
      <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-[15px] text-white shadow-[0_9px_15px_rgba(20,40,70,0.12)] ${color}`}>
        <Icon size={23} strokeWidth={2} />
      </div>
    </article>
  );
}

function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [totalDocumentCount, setTotalDocumentCount] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const result = await getDocuments({ page: 1, limit: 100 });
        const docs = result.documents ?? [];
        if (!active) return;
        setDocuments(docs);
        setTotalDocumentCount(result.pagination?.totalDocuments ?? docs.length);

        // The backend currently exposes flashcard sets per document, so aggregate those real records.
        const [collections, quizCollections] = await Promise.all([
          Promise.allSettled(docs.map((doc) => getFlashcardSets(doc._id))),
          Promise.allSettled(docs.map((doc) => getDocumentQuizzes(doc._id))),
        ]);
        const totalCards = collections.reduce((sum, item) => {
          if (item.status !== "fulfilled") return sum;
          const payload = item.value;
          const sets = Array.isArray(payload) ? payload : payload?.sets ?? payload?.flashcardSets ?? payload?.data?.sets ?? payload?.data?.flashcardSets ?? [];
          return sum + sets.reduce((cardSum, set) => cardSum + (set.cards?.length ?? set.cardCount ?? set.cardsCount ?? 0), 0);
        }, 0);
        const totalQuizzes = quizCollections.reduce((sum, item) => {
          if (item.status !== "fulfilled") return sum;
          const payload = item.value;
          const quizzes = Array.isArray(payload) ? payload : payload?.quizzes ?? payload?.data?.quizzes ?? [];
          return sum + quizzes.length;
        }, 0);
        if (active) {
          setFlashcardCount(totalCards);
          setQuizCount(totalQuizzes);
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Unable to load your learning overview."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const recentDocuments = useMemo(() => [...documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4), [documents]);

  return (
    <div>
      <div className="mb-[28px]">
        <h1 className="cognitive-heading text-[28px] leading-[1.2] text-[#171d2b]">Dashboard</h1>
        <p className="mt-[12px] text-[15px] text-[#778191]">Track your learning progress and activity</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-[25px] grid grid-cols-1 gap-[28px] md:grid-cols-3">
        <StatCard label="Total Documents" value={isLoading ? "—" : totalDocumentCount} icon={FileText} color="bg-gradient-to-br from-[#42b7f5] to-[#00aee3]" />
        <StatCard label="Total Flashcards" value={isLoading ? "—" : flashcardCount} icon={BookOpen} color="bg-gradient-to-br from-[#d66be6] to-[#e532ab]" />
        <StatCard label="Total Quizzes" value={isLoading ? "—" : quizCount} icon={BrainCircuit} color="bg-gradient-to-br from-[#05c6a0] to-[#00b79a]" />
      </div>

      <section className="rounded-[19px] border border-[#e8ebef] bg-white px-[38px] pb-[27px] pt-[36px] shadow-[0_8px_24px_rgba(24,39,75,0.035)]">
        <div className="mb-[28px] flex items-center gap-[14px]">
          <div className="flex h-[47px] w-[47px] items-center justify-center rounded-[15px] bg-[#edf1f7] text-[#647084]"><Clock3 size={24} strokeWidth={1.9} /></div>
          <h2 className="text-[21px] font-medium tracking-[-0.04em] text-[#171d2b]">Recent Activity</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-[#778191]"><LoaderCircle size={19} className="animate-spin text-[#08b99a]" />Loading activity...</div>
        ) : recentDocuments.length === 0 ? (
          <div className="rounded-[15px] border border-[#eceef2] px-5 py-10 text-center">
            <FileText size={28} className="mx-auto text-[#a4adba]" />
            <p className="mt-3 text-[15px] font-medium text-[#273142]">No activity yet</p>
            <p className="mt-1 text-[14px] text-[#7a8493]">Upload a document to start your learning journey.</p>
            <Link to="/documents" className="mt-4 inline-flex text-[14px] font-semibold text-[#0b9c83]">Go to Documents</Link>
          </div>
        ) : (
          <div className="space-y-[14px]">
            {recentDocuments.map((document) => (
              <article key={document._id} className="flex min-h-[86px] items-center gap-3 rounded-[15px] border border-[#e9ecf1] bg-[#fdfdfe] px-[19px] py-[14px]">
                <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#39b9ea]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-[#293343]"><span className="font-medium text-[#172033]">Uploaded Document:</span> {document.originalName}</p>
                  <p className="mt-[6px] text-[12px] text-[#7c8795]">{formatDateTime(document.createdAt)}</p>
                </div>
                <Link to={`/documents/${document._id}?tab=content`} className="px-[18px] text-[13px] font-semibold text-[#149b80] transition hover:text-[#087d68]">View</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
