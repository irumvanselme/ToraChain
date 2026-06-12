import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn.ts";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Controlled wrapper around the native `<dialog>` (DaisyUI `modal`). Opens and
 * closes the dialog in sync with the `open` prop and reports backdrop / Escape
 * dismissals through `onClose`.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className={cn("modal-box", className)}>
        {title && <h3 className="text-lg font-bold">{title}</h3>}
        {children && <div className="py-4">{children}</div>}
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
