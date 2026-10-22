import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import InlineNotice from "../../../components/ui/InlineNotice";
import { getErrorMessage } from "../../../lib/errorMessage";
import { getDocumentQuiz, submitDocumentQuiz } from "../api/quizzesApi";

function QuizAttemptPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = String(
    state?.documentId || state?.quiz?.documentId || state?.quiz?.document || searchParams.get("documentId") || ""
  );

  const [quiz, setQuiz] = useState(state?.quiz ?? null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(!state?.quiz);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadQuiz() {
      if (quiz?.questions?.length) { setIsLoading(false); return; }
      if (!documentId || !quizId) {
        setLoadError("The document or quiz link is missing. Please reopen the quiz from its document page.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        const payload = await getDocumentQuiz(documentId, quizId);
        const loadedQuiz = payload?.quiz ?? payload?.data?.quiz ?? null;
        if (active) {
          setQuiz(loadedQuiz ? { ...loadedQuiz, documentId } : null);
          if (!loadedQuiz) setLoadError("The quiz could not be found.");
        }
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error, "Unable to load this quiz."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadQuiz();
    return () => { active = false; };
  }, [documentId, quizId, quiz]);

  const questions = quiz?.questions ?? [];
  const current = questions[currentIndex];
  const options = current?.options ?? current?.choices ?? [];
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[key] !== undefined && answers[key] !== null).length,
    [answers]
  );

  async function handleSubmitQuiz() {
    if (isSubmitting) return;
    if (!documentId) {
      setSubmitError("The document ID is missing. Please reopen this quiz from the document page.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = await submitDocumentQuiz(documentId, quizId, answers);
      const attempt = payload?.attempt ?? payload?.data?.attempt;
      if (!attempt?._id) throw new Error("The server did not return a saved quiz attempt.");
      const query = new URLSearchParams({ documentId, attemptId: String(attempt._id) });
      try {
        localStorage.setItem(`cognitive:last-quiz-attempt:${quizId}`, JSON.stringify({ documentId, attemptId: String(attempt._id), scorePercentage: attempt.scorePercentage }));
      } catch { /* Storage is optional; URL state still works. */ }
      navigate(`/quizzes/${quizId}/results?${query.toString()}`, {
        state: { quiz: { ...quiz, documentId }, attempt, documentId },
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Unable to submit the quiz. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return (
    <div className="flex min-h-[420px] items-center justify-center gap-3 text-[14px] text-[#778191]">
      <LoaderCircle size={25} className="animate-spin text-[#08b99a]" />Loading quiz...
    </div>
  );

  if (loadError || !quiz || questions.length === 0) return (
    <div className="mx-auto max-w-[1060px] py-[30px]">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[14px] text-[#626d7b] hover:text-[#0b9d83]"><ArrowLeft size={18} />Back to Document</button>
      <section className="mt-6 rounded-[19px] border border-[#e7eaee] bg-white p-10 text-center">
        <h1 className="text-[23px] font-semibold tracking-[-0.04em] text-[#171d2b]">Quiz data unavailable</h1>
        <div className="mt-4"><InlineNotice>{loadError || "This quiz has no questions."}</InlineNotice></div>
      </section>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1060px] pt-[0px]">
      <h1 className="mb-[38px] text-[27px] font-semibold tracking-[-0.055em] text-[#171d2b]">{quiz.title || "Quiz"}</h1>
      <div className="mb-[27px] flex items-center justify-between text-[14px] font-medium text-[#5f6978]"><span>Question {currentIndex + 1} of {questions.length}</span><span className="text-[#778191]">{answeredCount} answered</span></div>
      <div className="mb-[29px] h-[9px] overflow-hidden rounded-full bg-[#eef2f6]"><div className="h-full rounded-full bg-gradient-to-r from-[#05bd98] to-[#02b9a5] transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
      <section className="rounded-[19px] border border-[#dfe5eb] bg-white px-[28px] pb-[28px] pt-[29px] shadow-[0_7px_20px_rgba(24,39,75,.045)] sm:px-[29px]">
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-[#bdeee0] bg-[#edfbf6] px-[16px] py-[10px] text-[13px] font-semibold text-[#258d74]"><span className="h-[9px] w-[9px] rounded-full bg-[#4bc5a6]" />Question {currentIndex + 1}</span>
        <h2 className="mt-[28px] text-[19px] font-semibold tracking-[-0.025em] text-[#222a38]">{current.question || current.prompt}</h2>
        <div className="mt-[32px] space-y-[14px]">
          {options.map((option, index) => {
            const label = typeof option === "string" ? option : option?.text || option?.label || option?.value || "";
            const selected = answers[currentIndex] === index;
            return <button key={`${label}-${index}`} type="button" disabled={isSubmitting} onClick={() => setAnswers((previous) => ({ ...previous, [currentIndex]: index }))} className={`flex min-h-[57px] w-full items-center gap-[18px] rounded-[14px] border px-[17px] text-left text-[14px] transition ${selected ? "border-[#78d9c2] bg-[#fdfffe] text-[#263341] shadow-[0_3px_8px_rgba(24,39,75,.06)]" : "border-[#dfe5eb] bg-[#fdfdfe] text-[#4c5664] hover:border-[#b4e8dc]"} disabled:cursor-not-allowed`}>
              <span className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-[#36c6a4]" : "border-[#cdd6df]"}`}>{selected && <span className="h-[11px] w-[11px] rounded-full bg-[#36c6a4]" />}</span>{label}
            </button>;
          })}
        </div>
      </section>
      {submitError && <div className="mt-5"><InlineNotice>{submitError}</InlineNotice></div>}
      <div className="mt-[38px] flex items-center justify-between">
        <button type="button" onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))} disabled={currentIndex === 0 || isSubmitting} className="inline-flex items-center gap-2 rounded-[12px] px-[18px] py-[13px] text-[14px] font-medium text-[#6c7684] hover:bg-white disabled:opacity-45"><ArrowLeft size={18} />Previous</button>
        {currentIndex < questions.length - 1 ? <button type="button" onClick={() => setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))} disabled={isSubmitting} className="cognitive-primary min-h-[51px]">Next<ArrowRight size={18} /></button> : <button type="button" onClick={handleSubmitQuiz} disabled={isSubmitting} className="cognitive-primary min-h-[51px] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <><LoaderCircle size={18} className="animate-spin" />Submitting...</> : <><CheckCircle2 size={18} />Submit Quiz</>}</button>}
      </div>
      <div className="mt-[2px] flex justify-center gap-[8px]">
        {questions.map((_, index) => <button key={index} type="button" aria-label={`Go to question ${index + 1}`} disabled={isSubmitting} onClick={() => setCurrentIndex(index)} className={`flex h-[40px] min-w-[40px] items-center justify-center rounded-[10px] text-[13px] font-semibold transition ${index === currentIndex ? "bg-gradient-to-br from-[#08bd97] to-[#04b9a5] text-white shadow-[0_5px_10px_rgba(0,185,153,.15)]" : "bg-[#f1f4f8] text-[#5c6675] hover:bg-[#e6ebf1]"} disabled:cursor-not-allowed`}>{index + 1}</button>)}
      </div>
    </div>
  );
}

export default QuizAttemptPage;
