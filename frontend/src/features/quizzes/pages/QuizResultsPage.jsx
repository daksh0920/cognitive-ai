import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, CircleX, Target, Trophy, LoaderCircle } from "lucide-react";
import InlineNotice from "../../../components/ui/InlineNotice";
import { getErrorMessage } from "../../../lib/errorMessage";
import { getDocumentQuizAttempt } from "../api/quizzesApi";

function normalizeOption(option) {
  if (typeof option === "string") return option;
  return option?.text || option?.label || option?.value || "";
}

function QuizResultsPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = String(state?.documentId || state?.quiz?.documentId || state?.quiz?.document || searchParams.get("documentId") || "");
  const attemptId = String(state?.attempt?._id || searchParams.get("attemptId") || "");

  const [quiz, setQuiz] = useState(state?.quiz ?? null);
  const [attempt, setAttempt] = useState(state?.attempt ?? null);
  const [isLoading, setIsLoading] = useState(!state?.attempt);
  const [error, setError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(Boolean(state?.attempt));

  useEffect(() => {
    let active = true;
    async function loadResults() {
      if (attempt?.answers?.length) { setIsLoading(false); return; }
      if (!documentId || !quizId || !attemptId) {
        setError("The saved quiz result details are missing. Please open results from a completed quiz.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const payload = await getDocumentQuizAttempt(documentId, quizId, attemptId);
        if (!active) return;
        setQuiz(payload?.quiz ?? null);
        setAttempt(payload?.attempt ?? null);
        setShowSuccessToast(false);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError, "Unable to load the saved quiz results."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadResults();
    return () => { active = false; };
  }, [documentId, quizId, attemptId, attempt]);

  useEffect(() => {
    if (!showSuccessToast) return undefined;
    const timeoutId = window.setTimeout(() => setShowSuccessToast(false), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [showSuccessToast]);

  const questions = attempt?.answers ?? quiz?.questions ?? [];
  const result = useMemo(() => {
    if (attempt) return {
      correct: Number(attempt.correctCount ?? 0),
      total: Number(attempt.totalQuestions ?? questions.length),
      percent: Number(attempt.scorePercentage ?? 0),
    };
    const correct = questions.filter((question) => question.isCorrect).length;
    return { correct, total: questions.length, percent: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
  }, [attempt, questions]);

  if (isLoading) return <div className="flex min-h-[420px] items-center justify-center"><LoaderCircle size={26} className="animate-spin text-[#08b99a]" /></div>;

  if (error || !attempt || questions.length === 0) return (
    <div className="mx-auto max-w-[1100px] py-8">
      <Link to={documentId ? `/documents/${documentId}?tab=quizzes` : "/documents"} className="inline-flex items-center gap-2 text-[14px] text-[#626d7b]"><ArrowLeft size={18} />Back to Document</Link>
      <section className="mt-6 rounded-[19px] border border-[#e7eaee] bg-white p-10 text-center">
        <h1 className="text-[23px] font-semibold">Quiz results unavailable</h1>
        <div className="mt-4">{error ? <InlineNotice>{error}</InlineNotice> : <p className="text-[14px] text-[#778191]">The saved quiz attempt could not be found.</p>}</div>
      </section>
    </div>
  );

  const incorrect = Math.max(0, result.total - result.correct);
  const encouragement = result.percent >= 80 ? "Excellent work!" : result.percent >= 50 ? "Good effort! Keep going." : "Keep practicing!";
  const quizTitle = (quiz?.title || "Quiz").replace(/\s*-\s*Quiz$/i, "");
  const backToQuizList = () => documentId ? navigate(`/documents/${documentId}?tab=quizzes`) : navigate(-1);

  return (
    <div className="mx-auto max-w-[1210px] pb-8">
      {showSuccessToast && <div role="status" className="fixed right-[18px] top-[16px] z-50 flex items-center gap-[11px] rounded-[12px] border border-[#e8ebef] bg-white px-[17px] py-[14px] text-[14px] text-[#485260] shadow-[0_10px_28px_rgba(15,23,42,.14)]"><span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#d4f7e5] text-[#42b963]"><CheckCircle2 size={17} strokeWidth={3} /></span>Quiz submitted successfully!</div>}
      <button type="button" onClick={backToQuizList} className="mb-[35px] inline-flex items-center gap-[10px] text-[14px] text-[#626d7b] hover:text-[#0b9d83]"><ArrowLeft size={18} />Back to Document</button>
      <h1 className="mb-[39px] text-[27px] font-semibold tracking-[-0.055em] text-[#171d2b]">{quizTitle} - Quiz Results</h1>

      <section className="rounded-[19px] border border-[#dfe5eb] bg-white px-6 py-[39px] shadow-[0_7px_20px_rgba(24,39,75,.04)] sm:px-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[19px] bg-[#d4faed] text-[#0e9e7f] shadow-[0_7px_15px_rgba(0,185,153,.14)]"><Trophy size={35} strokeWidth={1.9} /></span>
          <p className="mt-[28px] text-[15px] font-semibold uppercase tracking-[.02em] text-[#5f6978]">Your Score</p>
          <p className={`mt-[9px] text-[55px] font-bold leading-none tracking-[-0.055em] ${result.percent < 50 ? "text-[#e83251]" : "text-[#0d9f80]"}`}>{result.percent}%</p>
          <p className="mt-[18px] text-[19px] text-[#3f4856]">{encouragement}</p>
          <div className="mt-[48px] flex flex-wrap items-center justify-center gap-[15px]">
            <span className="inline-flex items-center gap-2 rounded-[13px] border border-[#e5e9ef] bg-[#fafbfc] px-[18px] py-[12px] text-[14px] font-medium text-[#596372]"><Target size={18} />{result.total} Total</span>
            <span className="inline-flex items-center gap-2 rounded-[13px] border border-[#bdeee0] bg-[#eafbf4] px-[18px] py-[12px] text-[14px] font-medium text-[#278c73]"><CheckCircle2 size={18} />{result.correct} Correct</span>
            <span className="inline-flex items-center gap-2 rounded-[13px] border border-[#f3ccd4] bg-[#fff2f4] px-[18px] py-[12px] text-[14px] font-medium text-[#bf2943]"><CircleX size={18} />{incorrect} Incorrect</span>
          </div>
        </div>
      </section>

      <div className="mb-[20px] mt-[42px] flex items-center gap-[13px]"><BookOpen size={23} className="text-[#606b7a]" /><h2 className="text-[21px] font-semibold tracking-[-0.04em] text-[#202837]">Detailed Review</h2></div>
      <div className="space-y-[25px]">
        {questions.map((question, index) => {
          const options = question.options ?? question.choices ?? [];
          const selectedIndex = question.selectedIndex ?? null;
          const correctIndex = question.correctIndex ?? question.answerIndex ?? question.correctOptionIndex;
          const isCorrect = Boolean(question.isCorrect) || (selectedIndex !== null && correctIndex !== undefined && selectedIndex === correctIndex);
          return (
            <article key={question.questionId || question._id || index} className="rounded-[19px] border border-[#dfe5eb] bg-white p-[25px] shadow-[0_5px_16px_rgba(24,39,75,.025)] sm:p-[29px]">
              <div className="flex items-start justify-between gap-4"><div><span className="inline-flex rounded-[9px] border border-[#e4e8ed] bg-[#fafbfc] px-[14px] py-[8px] text-[12px] font-medium text-[#5e6877]">Question {index + 1}</span><h3 className="mt-[18px] text-[17px] font-semibold text-[#252d3a]">{question.question || question.prompt}</h3></div><span className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] ${isCorrect ? "border border-[#b4efdc] bg-[#eafbf4] text-[#2eaa86]" : "border border-[#f4ccd5] bg-[#fff1f4] text-[#d52d4d]"}`}>{isCorrect ? <CheckCircle2 size={23} /> : <CircleX size={23} />}</span></div>
              <div className="mt-[25px] space-y-[12px]">{options.map((option, optionIndex) => {
                const label = normalizeOption(option);
                const isAnswer = correctIndex !== undefined && optionIndex === correctIndex;
                const isSelected = selectedIndex === optionIndex;
                const classes = isAnswer ? "border-[#72dfbf] bg-[#eafbf4] text-[#356b5b]" : isSelected ? "border-[#ee9ead] bg-[#fff1f4] text-[#9c3045]" : "border-[#e2e7ed] bg-[#fcfcfd] text-[#525c6a]";
                return <div key={`${label}-${optionIndex}`} className={`flex min-h-[55px] items-center justify-between gap-3 rounded-[10px] border px-[18px] py-[12px] text-[14px] ${classes}`}><span>{label}</span>{isAnswer && <span className="rounded-[8px] border border-[#a5e7d3] bg-[#d9f8ed] px-[10px] py-[5px] text-[11px] font-semibold text-[#258d74]">Correct</span>}{isSelected && !isAnswer && <span className="rounded-[8px] border border-[#efb4bf] bg-[#ffe2e7] px-[10px] py-[5px] text-[11px] font-semibold text-[#b02b44]">Your Answer</span>}</div>;
              })}</div>
              {question.explanation && <div className="mt-[19px] flex gap-[13px] rounded-[13px] border border-[#e6ebf0] bg-[#f8fafc] px-[18px] py-[17px]"><BookOpen size={20} className="mt-0.5 shrink-0 text-[#7b8795]" /><div><p className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#687382]">Explanation</p><p className="mt-1 text-[14px] leading-6 text-[#4e5866]">{question.explanation}</p></div></div>}
            </article>
          );
        })}
      </div>
      <div className="mt-8 flex justify-end"><button type="button" onClick={backToQuizList} className="cognitive-primary">Back to Quiz List</button></div>
    </div>
  );
}

export default QuizResultsPage;
