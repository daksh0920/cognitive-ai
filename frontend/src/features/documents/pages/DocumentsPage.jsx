import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BrainCircuit,
  BookOpen,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { deleteDocument, getDocuments, uploadDocument } from "../api/documentsApi";
import { getFlashcardSets } from "../../flashcards/api/flashcardsApi";
import Modal from "../../../components/ui/Modal";
import InlineNotice from "../../../components/ui/InlineNotice";
import { getErrorMessage } from "../../../lib/errorMessage";
import { getDocumentQuizzes } from "../../quizzes/api/quizzesApi";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(dateValue) {
  if (!dateValue) return "Uploaded recently";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Uploaded recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Uploaded just now";
  if (minutes < 60) return `Uploaded ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Uploaded ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Uploaded a day ago";
  if (days < 7) return `Uploaded ${days} days ago`;
  return `Uploaded ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function normalizeSets(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.sets)) return payload.sets;
  if (Array.isArray(payload?.flashcardSets)) return payload.flashcardSets;
  if (Array.isArray(payload?.data?.sets)) return payload.data.sets;
  if (Array.isArray(payload?.data?.flashcardSets)) return payload.data.flashcardSets;
  return [];
}

function normalizeQuizzes(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.quizzes)) return payload.quizzes;
  if (Array.isArray(payload?.data?.quizzes)) {
    return payload.data.quizzes;
  }
  return [];
}

function DocumentIcon() {
  return <span className="flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#08bd98] to-[#04b8b8] text-white shadow-[0_7px_13px_rgba(0,185,153,.18)]"><FileText size={28} strokeWidth={1.9} /></span>;
}

function UploadDocumentModal({ open, onClose, onUpload, isUploading, error }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null);
      setTitle("");
      setValidationError("");
    }
  }, [open]);

  function chooseFile(nextFile) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".pdf")) {
      setValidationError("Please select a PDF file.");
      setFile(null);
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setValidationError("The PDF must be 10 MB or smaller.");
      setFile(null);
      return;
    }
    setValidationError("");
    setFile(nextFile);
    if (!title) setTitle(nextFile.name.replace(/\.pdf$/i, ""));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setValidationError("Choose a PDF file to upload.");
      return;
    }
    if (!title.trim()) {
      setValidationError("Enter a document title.");
      return;
    }
    await onUpload(file, title.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload New Document" subtitle="Add a PDF document to your library" contentClassName="pt-[25px]">
      <form onSubmit={handleSubmit}>
        <label htmlFor="document-title" className="mb-[10px] block text-[12px] font-semibold uppercase tracking-[0.015em] text-[#414a58]">Document Title</label>
        <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a document title" className="cognitive-input mb-[25px] h-[55px] rounded-[13px] text-[14px]" maxLength={120} />

        <label className="mb-[10px] block text-[12px] font-semibold uppercase tracking-[0.015em] text-[#414a58]">PDF File</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}
          className="flex min-h-[232px] w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-[#d6dde5] bg-[#fcfcfd] px-5 py-6 text-center transition hover:border-[#0bbc98] hover:bg-[#fbfefd]"
        >
          <span className="mb-[18px] flex h-[66px] w-[66px] items-center justify-center rounded-[16px] bg-[#d4faed] text-[#079e7e]"><Upload size={31} strokeWidth={2.1} /></span>
          {file ? (
            <>
              <span className="max-w-full break-all text-[14px] font-medium text-[#16997f]">{file.name}</span>
              <span className="mt-1 text-[13px] text-[#818a98]">{formatFileSize(file.size)} · PDF</span>
            </>
          ) : (
            <>
              <span className="text-[14px] font-medium text-[#667181]">Choose a PDF to upload</span>
              <span className="mt-2 text-[13px] text-[#8b94a1]">PDF up to 10MB</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />

        {(validationError || error) && <InlineNotice className="mt-4" type="error">{validationError || error}</InlineNotice>}

        <div className="mt-[31px] grid grid-cols-2 gap-[14px]">
          <button type="button" onClick={onClose} disabled={isUploading} className="cognitive-secondary h-[52px] text-[14px]">Cancel</button>
          <button type="submit" disabled={isUploading} className="cognitive-primary h-[52px] text-[14px]">
            {isUploading && <LoaderCircle size={17} className="animate-spin" />}
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentCard({ document, flashcardCount, quizCount,deleting, onDelete }) {
  return (
    <article className="group relative flex min-h-[289px] flex-col rounded-[19px] border border-[#e7eaee] bg-white px-[21px] pb-[22px] pt-[29px] shadow-[0_5px_14px_rgba(25,40,70,.02)] transition-all duration-150 hover:border-[#bcefe1] hover:bg-[#f3faf8] hover:shadow-[0_8px_20px_rgba(22,73,66,.06)]">
      <Link to={`/documents/${document._id}?tab=content`} aria-label={`Open ${document.originalName}`} className="absolute inset-0 z-0 rounded-[19px]" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <DocumentIcon />
        <button type="button" onClick={() => onDelete(document)} disabled={deleting} aria-label={`Delete ${document.originalName}`} title="Delete document" className="rounded-lg p-1.5 text-[#9aabb8] opacity-0 transition hover:bg-white hover:text-rose-500 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40">
          {deleting ? <LoaderCircle size={19} className="animate-spin" /> : <Trash2 size={19} />}
        </button>
      </div>

      <h2 title={document.originalName} className="relative z-10 mt-[19px] truncate text-[17px] font-semibold tracking-[-0.035em] text-[#171d2b]">{document.originalName}</h2>
      <p className="relative z-10 mt-[10px] text-[13px] text-[#758191]">{formatFileSize(document.size)}</p>

      <div className="relative z-10 mt-[13px] flex flex-wrap items-center gap-[10px]">
        <span className="inline-flex items-center gap-[6px] rounded-[9px] bg-[#f8f0fd] px-[12px] py-[7px] text-[12px] font-medium text-[#9b49be]"><BookOpen size={16} />{flashcardCount} Flashcards</span>
        <span className="inline-flex items-center gap-[6px] rounded-[9px] bg-[#e8fbf4] px-[12px] py-[7px] text-[12px] font-medium text-[#319b7d]"><BrainCircuit size={15} />{quizCount} Quizzes</span>
      </div>

      <div className="relative z-10 mt-auto border-t border-[#ebeff1] pt-[18px]">
        <p className="flex items-center gap-[7px] text-[13px] text-[#7d8895]"><Clock3 size={16} strokeWidth={1.8} />{relativeTime(document.createdAt)}</p>
      </div>
    </article>
  );
}

function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [flashcardCounts, setFlashcardCounts] = useState({});
  const [quizCounts, setQuizCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getDocuments({
        page: 1,
        limit: 100,
      });

      const nextDocuments = data.documents ?? [];
      setDocuments(nextDocuments);

      // Fetch flashcard-set and quiz counts for each document.
      const results = await Promise.allSettled(
        nextDocuments.map(async (document) => {
          const [flashcardResult, quizResult] =
            await Promise.allSettled([
              getFlashcardSets(document._id),
              getDocumentQuizzes(document._id),
            ]);

          const sets =
            flashcardResult.status === "fulfilled"
              ? normalizeSets(flashcardResult.value)
              : [];

          const quizzes =
            quizResult.status === "fulfilled"
              ? normalizeQuizzes(quizResult.value)
              : [];

          return {
            documentId: String(document._id),
            flashcardCount: sets.length,
            quizCount: quizzes.length,
          };
        })
      );

      const nextFlashcardCounts = {};
      const nextQuizCounts = {};

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;

        const {
          documentId,
          flashcardCount,
          quizCount,
        } = result.value;

        nextFlashcardCounts[documentId] = flashcardCount;
        nextQuizCounts[documentId] = quizCount;
      });

      setFlashcardCounts(nextFlashcardCounts);
      setQuizCounts(nextQuizCounts);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load documents. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function handleUpload(file, title) {
    setError("");
    setNotice("");
    setIsUploading(true);
    try {
      const response = await uploadDocument(file, title);
      setNotice(response.message || "Document uploaded successfully.");
      setModalOpen(false);
      await fetchDocuments();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed. Please check the file and try again."));
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete(document) {
    setError("");
    setNotice("");
    setDocumentToDelete(document);
    setDeleteModalOpen(true);
  }

  async function confirmDeleteDocument() {
    if (!documentToDelete) return;
    setError("");
    setNotice("");
    setDeletingId(documentToDelete._id);
    try {
      const response = await deleteDocument(documentToDelete._id);
      setNotice(response.message || "Document deleted successfully.");
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
      await fetchDocuments();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete this document. Please try again."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-[44px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="cognitive-heading text-[28px] leading-[1.2] text-[#171d2b]">My Documents</h1>
          <p className="mt-[12px] text-[15px] text-[#778191]">Manage and organize your learning materials</p>
        </div>
        <button type="button" onClick={() => { setError(""); setModalOpen(true); }} className="cognitive-primary h-[52px] shrink-0 px-[23px]">
          <Plus size={20} strokeWidth={2.2} />Upload Document
        </button>
      </div>

      {error && !deleteModalOpen && <InlineNotice className="mb-5" type="error">{error}</InlineNotice>}
      {notice && !error && <InlineNotice className="mb-5" type="success">{notice}</InlineNotice>}

      {isLoading ? (
        <div className="flex min-h-[230px] items-center justify-center gap-3 text-[14px] text-[#7a8492]"><LoaderCircle size={22} className="animate-spin text-[#08b99a]" />Loading documents...</div>
      ) : documents.length === 0 ? (
        <section className="flex min-h-[350px] flex-col items-center justify-center rounded-[19px] border border-[#e7eaee] bg-white p-8 text-center shadow-[0_5px_18px_rgba(24,39,75,0.025)]">
          <span className="flex h-[64px] w-[64px] items-center justify-center rounded-[17px] bg-[#d9fbef] text-[#099d7e]"><UploadCloud size={29} /></span>
          <h2 className="mt-5 text-[19px] font-semibold tracking-[-0.04em] text-[#171d2b]">No documents yet</h2>
          <p className="mt-2 max-w-[410px] text-[14px] leading-6 text-[#778191]">Upload a PDF document to start learning from your study materials.</p>
          <button type="button" onClick={() => setModalOpen(true)} className="cognitive-primary mt-6"><Plus size={18} />Upload Document</button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-[23px] sm:grid-cols-2 xl:grid-cols-4">
          {documents.map((document) => (
            <DocumentCard key={document._id} document={document} flashcardCount={flashcardCounts[document._id] ?? 0} quizCount={quizCounts[document._id] ?? 0}deleting={deletingId === document._id} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <UploadDocumentModal open={modalOpen} onClose={() => !isUploading && setModalOpen(false)} onUpload={handleUpload} isUploading={isUploading} error={error} />
      <Modal open={deleteModalOpen} onClose={() => !deletingId && setDeleteModalOpen(false)} title="Delete Document?" widthClass="max-w-[615px]" contentClassName="pt-[24px]">
        <p className="text-[14px] leading-6 text-[#5c6674]">Are you sure you want to delete this document? This action cannot be undone and its chat history and flashcard sets will also be removed.</p>
        {error && <InlineNotice className="mt-4">{error}</InlineNotice>}
        <div className="mt-[28px] flex justify-end gap-[12px]"><button type="button" onClick={() => setDeleteModalOpen(false)} disabled={Boolean(deletingId)} className="cognitive-secondary min-h-[49px] bg-[#f4f7fa]">Cancel</button><button type="button" onClick={confirmDeleteDocument} disabled={Boolean(deletingId)} className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-[12px] bg-[#e92340] px-[23px] text-[14px] font-semibold text-white shadow-[0_7px_13px_rgba(233,35,64,.15)] transition hover:bg-[#d81936] disabled:opacity-60">{deletingId && <LoaderCircle size={16} className="animate-spin" />}{deletingId ? "Deleting..." : "Delete Document"}</button></div>
      </Modal>
    </div>
  );
}

export default DocumentsPage;
