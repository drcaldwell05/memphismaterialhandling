"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";

export function ProjectPhoto() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return (
    <>
      <a className="project-photo-open" href="/mmh-owner-warehouse-4k.webp" ref={trigger} aria-haspopup="dialog" onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.current?.showModal !== "function") return;
        event.preventDefault();
        dialog.current.showModal();
        setOpen(true);
      }}>
        <span aria-hidden="true">⤢</span> View project photo
      </a>
      <dialog className="project-photo-dialog" ref={dialog} aria-labelledby={`${id}-title`} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="project-photo-dialog-inner">
          <div className="project-photo-toolbar">
            <p id={`${id}-title`}>Warehouse storage-system installation</p>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close project photo">Close <span aria-hidden="true">×</span></button>
          </div>
          {open && <Image src="/mmh-owner-warehouse-4k.webp" alt="Full project photograph of warehouse storage-system installation in progress" width={4096} height={4096} unoptimized />}
        </div>
      </dialog>
    </>
  );
}
