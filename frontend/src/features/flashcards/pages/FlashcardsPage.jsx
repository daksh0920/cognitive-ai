
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  ArrowUpRight,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import { getDocuments } from "../../documents/api/documentsApi";
import { getFlashcardSets } from "../api/flashcardsApi";
import InlineNotice from "../../../components/ui/InlineNotice";
import { getErrorMessage } from "../../../lib/errorMessage";

function getSets(payload) {
  if (Array.isArray(payload)) return payload;

  return (
    payload?.sets ??
    payload?.flashcardSets ??
    payload?.data?.sets ??
    payload?.data?.flashcardSets ??
    []
  );
}

function relativeCreatedAt(value) {
  if (!value) return "CREATED RECENTLY";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "CREATED RECENTLY";
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );

  if (minutes < 1) return "CREATED JUST NOW";

  if (minutes < 60) {
    return `CREATED ${minutes} ${
      minutes === 1 ? "MINUTE" : "MINUTES"
    } AGO`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `CREATED ${hours} ${
      hours === 1 ? "HOUR" : "HOURS"
    } AGO`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) return "CREATED 1 DAY AGO";

  if (days < 7) return `CREATED ${days} DAYS AGO`;

  return `CREATED ${date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase()}`;
}

function FlashcardsPage() {
  const navigate = useNavigate();

  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAllSets() {
      setIsLoading(true);
      setError("");

      try {
        const result = await getDocuments({
          page: 1,
          limit: 100,
        });

        const documents = result.documents ?? [];

        const requested = await Promise.allSettled(
          documents.map(async (document) => {
            const setsResult = await getFlashcardSets(
              document._id
            );

            return getSets(setsResult).map((set) => ({
              ...set,
              documentId: document._id,
              documentName: document.originalName,
            }));
          })
        );

        const allSets = requested.flatMap((entry) =>
          entry.status === "fulfilled" ? entry.value : []
        );

        if (active) {
          setSets(
            allSets.sort(
              (a, b) =>
                new Date(b.createdAt || b.created_at || 0) -
                new Date(a.createdAt || a.created_at || 0)
            )
          );
        }
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              "Unable to load flashcard sets."
            )
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAllSets();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="cognitive-heading mb-[39px] text-[28px] leading-[1.2] text-[#171d2b]">
        All Flashcard Sets
      </h1>

      {error && (
        <InlineNotice className="mb-5">
          {error}
        </InlineNotice>
      )}

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoaderCircle
            size={25}
            className="animate-spin text-[#08b99a]"
          />
        </div>
      ) : sets.length === 0 ? (
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[19px] border border-[#e7eaee] bg-white p-8 text-center shadow-[0_7px_22px_rgba(20,40,70,.025)]">
          <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[19px] bg-[#d4faed] text-[#129c7f]">
            <BookOpen size={34} />
          </span>

          <h2 className="mt-6 text-[20px] font-semibold tracking-[-0.04em] text-[#171d2b]">
            No flashcard sets yet
          </h2>

          <p className="mt-2 max-w-[420px] text-[14px] leading-6 text-[#778191]">
            Open a document and generate flashcards to see
            your study sets here.
          </p>

          <button
            type="button"
            onClick={() => navigate("/documents")}
            className="cognitive-primary mt-6"
          >
            <Sparkles size={18} />
            Browse Documents
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-[21px] sm:grid-cols-2 xl:grid-cols-4">
          {sets.map((set, index) => {
            const id = set._id || set.id || `set-${index}`;

            const count =
              set.cards?.length ??
              set.cardCount ??
              set.cardsCount ??
              0;

            return (
              <article
                key={id}
                className="group rounded-[19px] border border-[#e4e9ee] bg-white p-[25px] shadow-[0_3px_10px_rgba(24,39,75,.02)] transition hover:border-[#80e2c8] hover:shadow-[0_8px_20px_rgba(0,185,153,.07)]"
              >
                <div className="flex min-h-[83px] items-start gap-[17px]">
                  <span className="flex h-[57px] w-[57px] shrink-0 items-center justify-center rounded-[15px] bg-[#d4faed] text-[#179c80]">
                    <BookOpen size={28} />
                  </span>

                  <div className="min-w-0 pt-[2px]">
                    <h2 className="line-clamp-2 text-[16px] font-semibold leading-[1.55] tracking-[-0.025em] text-[#242c3a]">
                      {set.title ||
                        set.name ||
                        set.documentName ||
                        "Flashcard Set"}
                    </h2>

                    <p className="mt-[5px] text-[11px] font-medium tracking-[.01em] text-[#85909e]">
                      {relativeCreatedAt(
                        set.createdAt || set.created_at
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-[17px]">
                  <span className="inline-flex rounded-[9px] border border-[#e5e9ee] bg-[#f9fafb] px-[13px] py-[10px] text-[13px] font-medium text-[#4c5665]">
                    {count} Cards
                  </span>
                </div>


                <button
                  type="button"
                  disabled={!set.documentId}
                  onClick={() =>
                    navigate(`/documents/${set.documentId}?tab=content`)
                  }
                  className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#e4e9ee] bg-[#fbfcfd] px-3 py-3 text-left transition hover:border-[#80e2c8] hover:bg-[#f0fcf7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d4faed] text-[#159b7f]">
                    <FileText size={20} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-[#85909e]">
                      Source document
                    </span>

                    <span
                      className="mt-1 block truncate text-[13px] font-semibold text-[#303949]"
                      title={set.documentName || "Open document"}
                    >
                      {set.documentName || "Open document"}
                    </span>
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-[#788493]"
                  />
                </button>

                <div className="mt-[27px] border-t border-[#edf0f3] pt-[18px]">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/documents/${set.documentId}?tab=flashcards&setId=${id}`
                      )
                    }
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-[#e1fbf2] to-[#d2f9ed] text-[14px] font-semibold text-[#24886f] transition group-hover:from-[#08bd97] group-hover:to-[#04b9a5] group-hover:text-white"
                  >
                    <Sparkles size={18} />
                    Study Now
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FlashcardsPage;
