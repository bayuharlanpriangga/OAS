"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { callOasGlobal } from "@/lib/shared/legacy-store";

interface OasModalDialogProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  titleExtra?: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function OasModalDialog({
  id,
  open,
  onClose,
  title,
  titleExtra,
  maxWidth = "560px",
  footer,
  children,
}: OasModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      dialog.returnValue = "";
      callOasGlobal("closeInfoPopover");
      onCloseRef.current();
    };

    dialog.addEventListener("close", handleNativeClose);

    // Fallback light-dismiss for browsers without native <dialog closedby="any">
    const supportsClosedBy =
      typeof HTMLDialogElement !== "undefined" &&
      "closedBy" in HTMLDialogElement.prototype;

    if (supportsClosedBy) {
      return () => {
        dialog.removeEventListener("close", handleNativeClose);
      };
    }

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className="oas-dialog"
      aria-labelledby={titleId}
      style={{ maxWidth }}
      {...({ closedby: "any" } as Record<string, string>)}
    >
      <div className="modal-head">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <h2 id={titleId} className="modal-title" style={{ margin: 0 }}>
            {title}
          </h2>
          {titleExtra}
        </div>
        <button
          type="button"
          className="modal-close"
          aria-label="Tutup dialog"
          onClick={onClose}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer ? <div className="modal-footer">{footer}</div> : null}
    </dialog>
  );
}
