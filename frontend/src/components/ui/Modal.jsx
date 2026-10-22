import { useEffect } from "react";
import { X } from "lucide-react";

function Modal({ open, onClose, title, subtitle, children, widthClass = "max-w-[600px]", contentClassName = "" }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cognitive-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className={`cognitive-modal ${widthClass}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-4 px-7 pb-0 pt-7 sm:px-9 sm:pt-9">
          <div>
            <h2 className="text-[23px] font-semibold leading-tight tracking-[-0.055em] text-[#171d2b]">{title}</h2>
            {subtitle && <p className="mt-2 text-[14px] leading-5 text-[#778191]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-1 -mt-1 rounded-lg p-1.5 text-[#9aa3b0] transition hover:bg-slate-100 hover:text-slate-700">
            <X size={21} />
          </button>
        </div>
        <div className={`px-7 pb-7 pt-6 sm:px-9 sm:pb-9 ${contentClassName}`}>{children}</div>
      </section>
    </div>
  );
}

export default Modal;
