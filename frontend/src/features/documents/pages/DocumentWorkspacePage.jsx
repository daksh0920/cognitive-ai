import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  ExternalLink,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Modal from "../../../components/ui/Modal";
import InlineNotice from "../../../components/ui/InlineNotice";
import { getErrorMessage } from "../../../lib/errorMessage";
import {
  getDocument,
  getDocumentContent,
  getDocumentFileBlob,
} from "../api/documentsApi";
import { generateSummary, explainConcept } from "../../ai-actions/api/aiActionsApi";
import { getChatHistory, sendChatMessage } from "../../chat/api/chatApi";
import { generateFlashcardSet, getFlashcardSet, getFlashcardSets, deleteFlashcardSet } from "../../flashcards/api/flashcardsApi";
import { generateDocumentQuiz, getDocumentQuizzes, getDocumentQuiz } from "../../quizzes/api/quizzesApi";

const WORKSPACE_TABS = [
  { id: "content", label: "Content" },
  { id: "chat", label: "Chat" },
  { id: "ai-actions", label: "AI Actions" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quizzes", label: "Quizzes" },
];

function getSets(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.sets ?? payload?.flashcardSets ?? payload?.data?.sets ?? payload?.data?.flashcardSets ?? [];
}

function getMessages(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.messages ?? payload?.history ?? payload?.chatHistory ?? payload?.data?.messages ?? payload?.data?.history ?? [];
}

function getSet(payload) {
  return payload?.set ?? payload?.flashcardSet ?? payload?.data?.set ?? payload?.data?.flashcardSet ?? payload?.data ?? payload;
}

function toReadableResult(payload, keys = []) {
  if (typeof payload === "string") return payload;
  for (const key of keys) {
    if (typeof payload?.[key] === "string") return payload[key];
    if (typeof payload?.data?.[key] === "string") return payload.data[key];
  }
  if (typeof payload?.result === "string") return payload.result;
  if (typeof payload?.text === "string") return payload.text;
  return JSON.stringify(payload, null, 2);
}

function formatCardDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "DATE UNAVAILABLE";
  return `CREATED ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}`;
}

function ContentTab({ document, documentId }) {
  const [fileUrl, setFileUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const isPdf = (document?.fileExtension || "").toLowerCase() === ".pdf";

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    async function loadContent() {
      setIsLoading(true);
      setError("");
      try {
        if (isPdf) {
          const blob = await getDocumentFileBlob(documentId);
          objectUrl = URL.createObjectURL(blob);
          if (active) setFileUrl(objectUrl);
        } else {
          const response = await getDocumentContent(documentId, { page: 1, limit: 100 });
          if (active) setTextContent(response.content || "No extracted text is available for this file.");
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Unable to open this document."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadContent();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, isPdf]);

  return (
    <section className="overflow-hidden rounded-[10px] border border-[#dfe3e8] bg-white">
      <div className="flex h-[61px] items-center justify-between border-b border-[#e1e5e9] px-[18px]">
        <h2 className="text-[14px] font-medium text-[#444d5b]">Document Viewer</h2>
        {isPdf && fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#316fd0] hover:text-[#174fa8]"><ExternalLink size={17} />Open in new tab</a>}
      </div>
      <div className="h-[min(68vh,660px)] min-h-[420px] bg-[#262626]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-3 bg-white text-[14px] text-[#778191]"><LoaderCircle size={22} className="animate-spin text-[#08b99a]" />Loading document...</div>
        ) : error ? (
          <div className="flex h-full items-center justify-center bg-white p-7"><InlineNotice>{error}</InlineNotice></div>
        ) : isPdf && fileUrl ? (
          <iframe title={document?.originalName || "Document viewer"} src={fileUrl} className="h-full w-full border-0 bg-[#262626]" />
        ) : (
          <div className="h-full overflow-y-auto bg-white px-7 py-6 text-[15px] leading-7 text-[#303949] sm:px-10 sm:py-8"><pre className="whitespace-pre-wrap font-sans">{textContent}</pre></div>
        )}
      </div>
    </section>
  );
}

function ChatTab({ documentId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const payload = await getChatHistory(documentId);
      setMessages(getMessages(payload));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load the conversation."));
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => { setIsLoading(true); loadHistory(); }, [loadHistory]);

  async function handleSend(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || isSending) return;
    setError("");
    setIsSending(true);
    setMessage("");
    // Optimistically show the user's new message while the API replies.
    setMessages((current) => [...current, { role: "user", content: text, _id: `local-${Date.now()}` }]);
    try {
      await sendChatMessage(documentId, text);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to send this message."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="flex min-h-[610px] flex-col overflow-hidden rounded-[19px] border border-[#e8ebef] bg-white shadow-[0_8px_24px_rgba(24,39,75,.035)]">
      <div className="flex-1 space-y-6 overflow-y-auto px-[22px] py-[24px] sm:px-[27px]">
        {error && <InlineNotice>{error}</InlineNotice>}
        {isLoading ? <div className="flex justify-center py-20"><LoaderCircle className="animate-spin text-[#08b99a]" size={24} /></div> : messages.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[16px] bg-[#d9fbef] text-[#0a9f80]"><Sparkles size={27} /></span>
            <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.04em] text-[#242c3a]">Ask about this document</h3>
            <p className="mt-2 max-w-[390px] text-[14px] leading-6 text-[#7a8493]">Ask a question, request an explanation, or explore an idea from your learning material.</p>
          </div>
        ) : messages.map((item, index) => {
          const role = item.role || item.sender || item.author || "assistant";
          const isUser = ["user", "human", "student"].includes(String(role).toLowerCase());
          const content = item.content || item.message || item.text || "";
          return isUser ? (
            <div key={item._id || item.id || index} className="flex items-start justify-end gap-[12px]">
              <div className="max-w-[70%] rounded-[18px] rounded-tr-[5px] bg-gradient-to-r from-[#08bd97] to-[#04b9a5] px-[20px] py-[15px] text-[15px] leading-6 text-white shadow-[0_6px_12px_rgba(0,185,153,.14)]">{content}</div>
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[#edf1f7] text-[14px] font-semibold text-[#6e7888]">{(item.username || "A").slice(0, 1).toUpperCase()}</span>
            </div>
          ) : (
            <div key={item._id || item.id || index} className="flex items-start gap-[12px]">
              <span className="mt-[3px] flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#08c39d] to-[#079f81] text-white shadow-[0_6px_12px_rgba(0,185,153,.14)]"><Sparkles size={21} /></span>
              <div className="max-w-[72%] rounded-[17px] rounded-tl-[5px] border border-[#e7eaee] bg-white px-[20px] py-[17px] text-[15px] leading-[1.65] text-[#3f4856] shadow-[0_2px_6px_rgba(24,39,75,.035)] whitespace-pre-wrap">{content}</div>
            </div>
          );
        })}
        {isSending && <div className="flex items-center gap-2 pl-[54px] text-[13px] text-[#7d8795]"><LoaderCircle size={16} className="animate-spin text-[#0ab99a]" />Thinking...</div>}
      </div>
      <form onSubmit={handleSend} className="flex shrink-0 items-center gap-[13px] border-t border-[#edf0f3] px-[23px] py-[21px] sm:px-[24px]">
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a follow-up question..." aria-label="Ask a follow-up question" className="cognitive-input h-[54px] flex-1 rounded-[12px] border-[#dfe4ea] bg-[#fdfdfe] text-[14px] placeholder:text-[#98a1ae]" />
        <button type="submit" disabled={!message.trim() || isSending} aria-label="Send message" className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#a1e8d8] to-[#7fd8c3] text-white shadow-[0_7px_14px_rgba(0,185,153,.15)] transition hover:brightness-95 disabled:opacity-50"><Send size={23} /></button>
      </form>
    </section>
  );
}

function AiActionsTab({ documentId }) {
  const [summary, setSummary] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState("");

  async function handleSummary() {
    setError(""); setIsSummarizing(true);
    try {
      const result = await generateSummary(documentId);
      setSummary(toReadableResult(result, ["summary", "content", "text", "result"]));
      setShowSummary(true);
    } catch (err) { setError(getErrorMessage(err, "Unable to generate a summary.")); }
    finally { setIsSummarizing(false); }
  }

  async function handleExplain(event) {
    event.preventDefault();
    if (!concept.trim()) return;
    setError(""); setIsExplaining(true); setExplanation("");
    try {
      const result = await explainConcept(documentId, concept.trim());
      setExplanation(toReadableResult(result, ["explanation", "content", "text", "result"]));
    } catch (err) { setError(getErrorMessage(err, "Unable to explain this concept.")); }
    finally { setIsExplaining(false); }
  }

  return (
    <>
      <section className="overflow-hidden rounded-[19px] border border-[#e8ebef] bg-white shadow-[0_8px_24px_rgba(24,39,75,.035)]">
        <header className="flex items-center gap-[15px] border-b border-[#e9edf0] px-[28px] py-[25px]">
          <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-gradient-to-br from-[#09c49c] to-[#099d80] text-white shadow-[0_7px_14px_rgba(0,185,153,.16)]"><Sparkles size={25} /></span>
          <div><h2 className="text-[19px] font-semibold tracking-[-0.04em] text-[#171d2b]">AI Assistant</h2><p className="mt-1 text-[13px] text-[#7b8593]">Powered by advanced AI</p></div>
        </header>
        <div className="space-y-[27px] px-[27px] py-[28px]">
          {error && <InlineNotice>{error}</InlineNotice>}
          <article className="flex flex-col gap-5 rounded-[15px] border border-[#e8ebef] px-[23px] py-[24px] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex items-center gap-[10px]"><span className="flex h-[37px] w-[37px] items-center justify-center rounded-[10px] bg-[#e0f7ff] text-[#3383dc]"><BookOpen size={19} /></span><h3 className="text-[17px] font-semibold tracking-[-0.035em] text-[#171d2b]">Generate Summary</h3></div><p className="mt-[10px] text-[14px] text-[#7b8492]">Get a concise summary of the entire document.</p></div>
            <button type="button" disabled={isSummarizing} onClick={handleSummary} className="cognitive-primary min-w-[145px] shrink-0">{isSummarizing && <LoaderCircle size={17} className="animate-spin" />}{isSummarizing ? "Loading..." : "Generate Summary"}</button>
          </article>
          <article className="rounded-[15px] border border-[#e8ebef] px-[23px] py-[24px] shadow-[0_3px_6px_rgba(24,39,75,.025)]">
            <div className="flex items-center gap-[10px]"><span className="flex h-[37px] w-[37px] items-center justify-center rounded-[10px] bg-[#fff3d6] text-[#bf8b20]"><Lightbulb size={20} /></span><h3 className="text-[17px] font-semibold tracking-[-0.035em] text-[#171d2b]">Explain a Concept</h3></div>
            <p className="mt-[10px] text-[14px] text-[#7b8492]">Enter a topic or concept from the document to get a detailed explanation.</p>
            <form onSubmit={handleExplain} className="mt-[19px] flex flex-col gap-[13px] sm:flex-row">
              <input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="e.g., 'React Hooks'" className="cognitive-input h-[52px] flex-1 rounded-[12px] border-[#dfe4ea] text-[14px] placeholder:text-[#98a1ae]" />
              <button type="submit" disabled={!concept.trim() || isExplaining} className="cognitive-primary min-w-[100px]">{isExplaining ? <LoaderCircle size={17} className="animate-spin" /> : null}{isExplaining ? "Explaining..." : "Explain"}</button>
            </form>
            {explanation && <div className="mt-5 rounded-[13px] border border-[#e6ebf0] bg-[#f8fafc] p-5"><h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#667181]">Explanation</h4><p className="whitespace-pre-wrap text-[14px] leading-7 text-[#3f4856]">{explanation}</p></div>}
          </article>
        </div>
      </section>
      <Modal open={showSummary} onClose={() => setShowSummary(false)} title="Generated Summary" widthClass="max-w-[620px]" contentClassName="pt-[24px]">
        <div className="max-h-[62vh] overflow-y-auto pr-2 text-[15px] leading-[1.75] text-[#3f4856] whitespace-pre-wrap">{summary}</div>
      </Modal>
    </>
  );
}

function FlashcardsTab({ documentId, requestedSetId }) {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState(requestedSetId || "");
  const [cards, setCards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [setToDelete, setSetToDelete] = useState(null);
  const [isDeletingSet, setIsDeletingSet] = useState(false);

  const loadSets = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const payload = await getFlashcardSets(documentId);
      const nextSets = getSets(payload);
      setSets(nextSets);
      setSelectedSetId((current) => {
        if (requestedSetId && nextSets.some((set) => String(set._id || set.id) === requestedSetId)) return requestedSetId;
        if (current && nextSets.some((set) => String(set._id || set.id) === current)) return current;
        return "";
      });
    } catch (err) { setError(getErrorMessage(err, "Unable to load flashcard sets.")); }
    finally { setIsLoading(false); }
  }, [documentId, requestedSetId]);

  useEffect(() => { loadSets(); }, [loadSets]);

  useEffect(() => {
    let active = true;
    async function loadSet() {
      if (!selectedSetId) { setCards([]); setCardIndex(0); setRevealed(false); return; }
      try {
        const payload = await getFlashcardSet(documentId, selectedSetId);
        const set = getSet(payload);
        if (active) { setCards(set.cards ?? set.flashcards ?? []); setCardIndex(0); setRevealed(false); }
      } catch (err) { if (active) setError(getErrorMessage(err, "Unable to open this flashcard set.")); }
    }
    loadSet();
    return () => { active = false; };
  }, [documentId, selectedSetId]);

  async function handleDeleteSet() {
    const deletingId = String(setToDelete?._id || setToDelete?.id || "");
    if (!deletingId || isDeletingSet) return;
    setIsDeletingSet(true);
    setError("");
    try {
      await deleteFlashcardSet(documentId, deletingId);
      if (String(selectedSetId) === deletingId) setSelectedSetId("");
      setDeleteModalOpen(false);
      setSetToDelete(null);
      await loadSets();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete this flashcard set."));
    } finally {
      setIsDeletingSet(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true); setError("");
    try {
      const result = await generateFlashcardSet(documentId, 10);
      await loadSets();
      const generated = getSet(result);
      const generatedId = generated?._id || generated?.id;
      if (generatedId) setSelectedSetId(String(generatedId));
    } catch (err) { setError(getErrorMessage(err, "Unable to generate flashcards.")); }
    finally { setIsGenerating(false); }
  }

  const currentCard = cards[cardIndex];
  if (selectedSetId && currentCard) {
    const question = currentCard.question || currentCard.front || currentCard.prompt || "Question unavailable";
    const answer = currentCard.answer || currentCard.back || currentCard.response || "Answer unavailable";
    return (
      <section className="min-h-[520px] rounded-[19px] border border-[#e8ebef] bg-white px-7 py-8 shadow-[0_8px_24px_rgba(24,39,75,.035)] sm:px-11">
        <button type="button" onClick={() => setSelectedSetId("")} className="inline-flex items-center gap-2 text-[14px] text-[#5d6675] hover:text-[#0b9b81]"><ArrowLeft size={18} />Back to Sets</button>
        <div className="mx-auto mt-[29px] flex min-h-[330px] max-w-[800px] flex-col rounded-[20px] border border-[#e8ebef] bg-white px-8 py-9 shadow-[0_8px_22px_rgba(24,39,75,.05)] transition-colors duration-150" onClick={() => setRevealed((value) => !value)} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setRevealed((value) => !value)}>
          <div className="flex items-start justify-between"><span className="rounded-md bg-[#f1f4f8] px-4 py-2 text-[11px] font-medium uppercase text-[#687283]">{currentCard.difficulty || "Easy"}</span><button type="button" aria-label="Mark flashcard" onClick={(event) => event.stopPropagation()} className="rounded-xl bg-[#f2f5f9] p-3 text-[#99a4b3]"><Star size={18} /></button></div>
          <div className="flex flex-1 flex-col items-center justify-center text-center"><p className={`max-w-[670px] text-[20px] font-semibold leading-8 tracking-[-0.025em] ${revealed ? "text-[#079b7f]" : "text-[#242c3a]"}`}>{revealed ? answer : question}</p><p className="mt-12 inline-flex items-center gap-2 text-[13px] text-[#9aa3b0]"><RotateCcw size={15} />{revealed ? "Click to see question" : "Click to reveal answer"}</p></div>
        </div>
        <div className="mt-[24px] flex items-center justify-center gap-[13px]">
          <button type="button" onClick={() => { setCardIndex((index) => Math.max(0, index - 1)); setRevealed(false); }} disabled={cardIndex === 0} className="cognitive-secondary min-h-[50px] bg-[#f2f5f9] disabled:opacity-45"><ArrowLeft size={17} />Previous</button>
          <span className="flex h-[50px] min-w-[76px] items-center justify-center rounded-[12px] border border-[#e1e6ec] bg-white px-4 text-[14px] text-[#4b5565]">{cardIndex + 1} / {cards.length}</span>
          <button type="button" onClick={() => { setCardIndex((index) => Math.min(cards.length - 1, index + 1)); setRevealed(false); }} disabled={cardIndex >= cards.length - 1} className="cognitive-secondary min-h-[50px] bg-[#f2f5f9] disabled:opacity-45">Next<ArrowLeft size={17} className="rotate-180" /></button>
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-[19px] border border-[#e8ebef] bg-white shadow-[0_8px_24px_rgba(24,39,75,.035)] ${!isLoading && sets.length > 0 ? "min-h-[440px] px-[39px] pb-[35px] pt-[52px]" : "min-h-[510px] px-[27px] py-[29px]"}`}>
      {error && <InlineNotice className="mb-5">{error}</InlineNotice>}
      {isLoading ? <div className="flex min-h-[450px] items-center justify-center"><LoaderCircle size={24} className="animate-spin text-[#08b99a]" /></div> : sets.length === 0 ? (
        <div className="flex min-h-[450px] flex-col items-center justify-center text-center">
          <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[20px] bg-[#d1faec] text-[#0b9d7d]"><BrainCircuit size={36} /></span>
          <h3 className="mt-[28px] text-[20px] font-semibold tracking-[-0.04em] text-[#171d2b]">No Flashcards Yet</h3>
          <p className="mt-[12px] max-w-[460px] text-[14px] leading-6 text-[#7b8594]">Generate flashcards from your document to start learning and<br className="hidden sm:block" /> reinforce your knowledge.</p>
          <button type="button" onClick={handleGenerate} disabled={isGenerating} className="cognitive-primary mt-[37px] min-h-[57px] px-[28px]">{isGenerating ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={19} />} {isGenerating ? "Generating..." : "Generate Flashcards"}</button>
        </div>
      ) : (
        <>
          <div className="mb-[31px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-[20px] font-semibold tracking-[-0.04em] text-[#171d2b]">Your Flashcard Sets</h3><p className="mt-2 text-[14px] text-[#7d8795]">{sets.length} {sets.length === 1 ? "set" : "sets"} available</p></div><button type="button" onClick={handleGenerate} disabled={isGenerating} className="cognitive-primary">{isGenerating ? <LoaderCircle size={17} className="animate-spin" /> : <span className="text-[20px] leading-none">+</span>}Generate New Set</button></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sets.map((set, index) => {
              const setId = String(set._id || set.id || index);
              const count = set.cards?.length ?? set.cardCount ?? set.cardsCount ?? 0;
              return <article key={setId} className="min-h-[265px] rounded-[19px] border border-[#e4e9ee] bg-white p-[26px] text-left shadow-[0_3px_9px_rgba(24,39,75,.025)] transition hover:border-[#70e0c2] hover:shadow-[0_8px_18px_rgba(0,185,153,.09)]">
                <div className="flex items-start justify-between"><button type="button" onClick={() => setSelectedSetId(setId)} aria-label={`Study ${set.title || set.name || "flashcard set"}`} className="flex h-[58px] w-[58px] items-center justify-center rounded-[16px] bg-[#d2faed] text-[#159b7f]"><BrainCircuit size={27} /></button><button type="button" onClick={() => { setSetToDelete(set); setDeleteModalOpen(true); }} aria-label={`Delete ${set.title || set.name || "flashcard set"}`} title="Delete flashcard set" className="rounded-lg p-1.5 text-[#a1acba] transition hover:bg-[#fff1f3] hover:text-[#d82d4d]"><Trash2 size={18} /></button></div>
                <button type="button" onClick={() => setSelectedSetId(setId)} className="block w-full text-left">
                  <h4 className="mt-[21px] text-[16px] font-semibold text-[#252d3b]">{set.title || set.name || "Flashcard Set"}</h4>
                  <p className="mt-[10px] text-[12px] font-medium uppercase text-[#818b99]">{formatCardDate(set.createdAt || set.created_at)}</p>
                  <div className="mt-[20px] border-t border-[#edf0f3] pt-[16px]"><span className="inline-flex rounded-[9px] border border-[#bcefe1] bg-[#e7faf3] px-[14px] py-[9px] text-[14px] font-medium text-[#258d74]">{count} cards</span></div>
                </button>
              </article>;
            })}
          </div>
        </>
      )}
      <Modal open={deleteModalOpen} onClose={() => { if (!isDeletingSet) { setDeleteModalOpen(false); setSetToDelete(null); } }} title="Delete Flashcard Set?" widthClass="max-w-[615px]" contentClassName="pt-[24px]">
        <p className="text-[14px] leading-6 text-[#5c6674]">Are you sure you want to delete this flashcard set? This action cannot be undone and all cards will be permanently removed.</p>
        <div className="mt-[28px] flex justify-end gap-[12px]"><button type="button" onClick={() => { setDeleteModalOpen(false); setSetToDelete(null); }} disabled={isDeletingSet} className="cognitive-secondary min-h-[49px] bg-[#f4f7fa]">Cancel</button><button type="button" onClick={handleDeleteSet} disabled={isDeletingSet} className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-[12px] bg-[#e92340] px-[23px] text-[14px] font-semibold text-white shadow-[0_7px_13px_rgba(233,35,64,.15)] transition hover:bg-[#d81936] disabled:cursor-not-allowed disabled:opacity-60">{isDeletingSet ? <><LoaderCircle size={17} className="animate-spin" />Deleting...</> : "Delete Set"}</button></div>
      </Modal>
    </section>
  );
}

function readLastQuizAttempt(quizId, documentId) {
  try {
    const raw = localStorage.getItem(`cognitive:last-quiz-attempt:${quizId}`);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return stored?.documentId === String(documentId) ? stored : null;
  } catch {
    return null;
  }
}

function QuizzesTab({ documentId }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState("5");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingQuizId, setOpeningQuizId] = useState("");
  const [error, setError] = useState("");

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getDocumentQuizzes(documentId);
      const items = Array.isArray(result) ? result : result?.quizzes ?? result?.data?.quizzes ?? [];
      setQuizzes(items);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load quizzes."));
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  async function handleGenerate(event) {
    event.preventDefault();
    setError("");
    const count = Number(questionCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setError("Choose between 1 and 20 questions.");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateDocumentQuiz(documentId, count);
      const generatedQuiz = result?.quiz ?? result?.data?.quiz;
      if (!generatedQuiz?._id) throw new Error("The server did not return the generated quiz.");
      setQuizzes((previous) => [generatedQuiz, ...previous.filter((item) => String(item._id) !== String(generatedQuiz._id))]);
      setModalOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to generate the quiz."));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleStartQuiz(quizId) {
    setOpeningQuizId(quizId);
    setError("");
    try {
      const result = await getDocumentQuiz(documentId, quizId);
      const loadedQuiz = result?.quiz ?? result?.data?.quiz;
      if (!loadedQuiz?.questions?.length) throw new Error("This quiz has no questions.");
      navigate(`/quizzes/${quizId}?documentId=${encodeURIComponent(documentId)}`, {
        state: { quiz: { ...loadedQuiz, documentId }, documentId },
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to open this quiz."));
    } finally {
      setOpeningQuizId("");
    }
  }

  function handleViewResults(quizId, attempt) {
    const query = new URLSearchParams({ documentId, attemptId: attempt.attemptId });
    navigate(`/quizzes/${quizId}/results?${query.toString()}`);
  }

  return (
    <>
      <section className="min-h-[440px] rounded-[10px] border border-[#e1e5e9] bg-white p-[25px] shadow-[0_2px_5px_rgba(24,39,75,.02)]">
        <div className="flex justify-end">
          <button type="button" onClick={() => { setError(""); setModalOpen(true); }} className="cognitive-primary min-h-[52px]">
            <span className="text-[21px] leading-none">+</span>Generate Quiz
          </button>
        </div>
        {error && <InlineNotice className="mt-5">{error}</InlineNotice>}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center gap-3 text-[14px] text-[#778191]"><LoaderCircle size={22} className="animate-spin text-[#08b99a]" />Loading quizzes...</div>
        ) : quizzes.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <span className="flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-[#d4faed] text-[#159b7f]"><BrainCircuit size={30} /></span>
            <h3 className="mt-5 text-[19px] font-semibold text-[#252d3b]">No Quizzes Yet</h3>
            <p className="mt-2 max-w-[420px] text-[14px] leading-6 text-[#7b8594]">Generate a quiz from this document to test your understanding.</p>
          </div>
        ) : (
          <div className="mt-[25px] grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => {
              const quizId = String(quiz._id || quiz.id);
              const lastAttempt = readLastQuizAttempt(quizId, documentId);
              const count = quiz.questionCount ?? quiz.questions?.length ?? 0;
              const createdAt = quiz.createdAt ? new Date(quiz.createdAt) : null;
              const createdLabel = createdAt && !Number.isNaN(createdAt.getTime())
                ? `CREATED ${createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}`
                : "CREATED RECENTLY";
              return (
                <article key={quizId} className="min-h-[290px] rounded-[19px] border border-[#e4e9ee] bg-white p-[24px] shadow-[0_3px_9px_rgba(24,39,75,.025)] transition hover:border-[#70e0c2] hover:shadow-[0_8px_18px_rgba(0,185,153,.09)]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-[9px] border border-[#bcefe1] bg-[#e7faf3] px-[12px] py-[8px] text-[12px] font-semibold text-[#258d74]">
                      {lastAttempt?.scorePercentage != null ? `Score: ${lastAttempt.scorePercentage}` : "Quiz"}
                    </span>
                    <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#d4faed] text-[#159b7f]"><BrainCircuit size={22} /></span>
                  </div>
                  <h3 className="mt-[19px] line-clamp-2 text-[16px] font-semibold leading-6 text-[#252d3b]" title={quiz.title}>{quiz.title || "Document Quiz"}</h3>
                  <p className="mt-2 text-[12px] font-medium uppercase text-[#818b99]">{createdLabel}</p>
                  <div className="mt-[19px] border-t border-[#edf0f3] pt-[15px]"><span className="inline-flex rounded-[9px] border border-[#e5e9ee] bg-[#f9fafb] px-[13px] py-[9px] text-[13px] font-medium text-[#4c5665]">{count} Questions</span></div>
                  {lastAttempt ? (
                    <button type="button" onClick={() => handleViewResults(quizId, lastAttempt)} className="cognitive-secondary mt-4 min-h-[47px] w-full bg-[#f2f5f9]">View Results</button>
                  ) : (
                    <button type="button" onClick={() => handleStartQuiz(quizId)} disabled={openingQuizId === quizId} className="cognitive-primary mt-4 min-h-[47px] w-full">
                      {openingQuizId === quizId ? <><LoaderCircle size={17} className="animate-spin" />Opening...</> : "Start Quiz"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal open={modalOpen} onClose={() => { if (!isGenerating) setModalOpen(false); }} title="Generate New Quiz" widthClass="max-w-[600px]" contentClassName="pt-[24px]">
        <form onSubmit={handleGenerate}>
          <label htmlFor="question-count" className="mb-[10px] block text-[13px] font-medium text-[#424b59]">Number of Questions</label>
          <input id="question-count" type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} className="cognitive-input h-[44px] rounded-[9px] text-[14px]" />
          <div className="mt-[27px] flex justify-end gap-[12px]">
            <button type="button" onClick={() => setModalOpen(false)} disabled={isGenerating} className="cognitive-secondary min-h-[50px] bg-[#f4f7fa]">Cancel</button>
            <button type="submit" disabled={isGenerating || !questionCount || Number(questionCount) < 1 || Number(questionCount) > 20} className="cognitive-primary min-h-[50px]">
              {isGenerating ? <><LoaderCircle size={17} className="animate-spin" />Generating...</> : "Generate"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function DocumentWorkspacePage() {
  const { documentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "content";
  const requestedSetId = searchParams.get("setId") || "";
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDocument() {
      setIsLoading(true); setError("");
      try {
        const result = await getDocument(documentId);
        if (active) setDocument(result);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Unable to load this document."));
      } finally { if (active) setIsLoading(false); }
    }
    loadDocument();
    return () => { active = false; };
  }, [documentId]);

  function changeTab(tab) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    next.delete("setId");
    setSearchParams(next);
  }

  const tabContent = useMemo(() => {
    if (!document) return null;
    switch (activeTab) {
      case "chat": return <ChatTab documentId={documentId} />;
      case "ai-actions": return <AiActionsTab documentId={documentId} />;
      case "flashcards": return <FlashcardsTab key={`${documentId}-${requestedSetId}`} documentId={documentId} requestedSetId={requestedSetId} />;
      case "quizzes": return <QuizzesTab documentId={documentId} />;
      default: return <ContentTab document={document} documentId={documentId} />;
    }
  }, [activeTab, document, documentId, requestedSetId]);

  return (
    <div>
      <Link to="/documents" className="mb-[26px] inline-flex items-center gap-[10px] text-[14px] text-[#626d7b] transition hover:text-[#0b9d83]"><ArrowLeft size={19} />Back to Documents</Link>
      <h1 className="cognitive-heading max-w-full truncate text-[28px] leading-[1.2] text-[#171d2b]" title={document?.originalName}>{isLoading ? "Loading document..." : document?.originalName || "Document"}</h1>
      <div className="mt-[22px] mb-[29px] flex overflow-x-auto border-b border-[#e8ebef]">
        {WORKSPACE_TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => changeTab(tab.id)} className={`relative flex min-w-[112px] items-center justify-center whitespace-nowrap px-[23px] pb-[18px] pt-[16px] text-[14px] font-medium transition ${activeTab === tab.id ? "text-[#179d83]" : "text-[#505a69] hover:text-[#179d83]"}`}>
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#12bd9a]" />}
          </button>
        ))}
      </div>
      {error ? <InlineNotice>{error}</InlineNotice> : isLoading ? <div className="flex min-h-[420px] items-center justify-center"><LoaderCircle size={26} className="animate-spin text-[#08b99a]" /></div> : tabContent}
    </div>
  );
}

export default DocumentWorkspacePage;
