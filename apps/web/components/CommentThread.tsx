"use client";

import { useId, useRef, useState } from "react";
import { Button, Tag } from "@repo/ui/playground";
import type { CommentItem } from "../lib/api";
import { formatDate } from "../lib/ui";
import EmojiPicker from "./EmojiPicker";

/** Contrato de respuesta compartido con Comments.tsx. */
export type ReplyHandler = (
  parentId: string,
  content: string,
  authorName: string,
) => Promise<CommentItem | null>;

/** Comentario de la API con su relación de anidado (la añade el backend). */
export type CommentNode = CommentItem & { parentId?: string | null };

/** Respuesta plana dentro del hilo de un comentario raíz. */
export interface FlatReply {
  comment: CommentNode;
  parentName: string | null;
}

interface CommentThreadProps {
  comment: CommentNode;
  replies: FlatReply[];
  onReply: ReplyHandler;
  replyAuthorName: string;
  replyFromSession: boolean;
}

const FIELD =
  "w-full rounded-chip border-[1.5px] border-ink bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted";
const LABEL =
  "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted";
const TOGGLE =
  "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-coral-ink transition-colors hover:text-ink";

const MAX_CONTENT_LENGTH = 2000;

type ReplyStatus =
  { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string };

interface CommentCardProps {
  comment: CommentNode;
  variant: "root" | "reply";
  parentName?: string | null;
  onReply: ReplyHandler;
  replyAuthorName: string;
  replyFromSession: boolean;
  onReplyCreated?: () => void;
}

function CommentCard({
  comment,
  variant,
  parentName = null,
  onReply,
  replyAuthorName,
  replyFromSession,
  onReplyCreated,
}: CommentCardProps) {
  const [replying, setReplying] = useState(false);
  const [name, setName] = useState(replyAuthorName);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ReplyStatus>({ kind: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseId = useId();
  const formId = `${baseId}-reply-form`;
  const nameId = `${baseId}-reply-name`;
  const contentId = `${baseId}-reply-content`;

  const isReply = variant === "reply";

  function openReply(): void {
    setName(replyAuthorName);
    setStatus({ kind: "idle" });
    setReplying(true);
  }

  function closeReply(): void {
    setReplying(false);
    setContent("");
    setStatus({ kind: "idle" });
  }

  function toggleReply(): void {
    if (replying) {
      closeReply();
    } else {
      openReply();
    }
  }

  function insertEmoji(emoji: string): void {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? start;
    const nextContent = (
      content.slice(0, start) +
      emoji +
      content.slice(end)
    ).slice(0, MAX_CONTENT_LENGTH);
    setContent(nextContent);
    const cursor = Math.min(start + emoji.length, nextContent.length);
    window.requestAnimationFrame(() => {
      const next = textareaRef.current;
      if (!next) return;
      next.focus();
      next.setSelectionRange(cursor, cursor);
    });
  }

  async function submitReply(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (status.kind === "sending") return;

    const trimmedContent = content.trim();
    const author = (replyFromSession ? replyAuthorName : name).trim();

    if (trimmedContent.length === 0) {
      setStatus({
        kind: "error",
        message: "Escribe una respuesta antes de enviarla.",
      });
      return;
    }
    if (author.length === 0) {
      setStatus({
        kind: "error",
        message: "El nombre es obligatorio para responder.",
      });
      return;
    }

    setStatus({ kind: "sending" });
    let created: CommentItem | null = null;
    try {
      created = await onReply(comment.id, trimmedContent, author);
    } catch {
      created = null;
    }
    if (created === null) {
      setStatus({
        kind: "error",
        message: "No se pudo enviar la respuesta. Inténtalo de nuevo.",
      });
      return;
    }

    setContent("");
    setStatus({ kind: "idle" });
    setReplying(false);
    onReplyCreated?.();
  }

  return (
    <article
      className={`rounded-card border-[1.5px] border-ink p-5 shadow-[3px_3px_0_var(--color-ink)] ${
        isReply ? "bg-paper" : "bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Tag tone="plain">
          {comment.user?.name ?? comment.authorName ?? "Anónimo"}
        </Tag>
        <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
          {formatDate(comment.createdAt)}
        </span>
        <button
          type="button"
          onClick={toggleReply}
          aria-expanded={replying}
          aria-controls={formId}
          className="ml-auto rounded-pill border-[1.5px] border-ink bg-surface px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
        >
          Responder
        </button>
      </div>

      {parentName ? (
        <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted">
          ↳ En respuesta a {parentName}
        </p>
      ) : null}

      <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">
        {comment.content}
      </p>

      <div id={formId}>
        {replying ? (
          <form
            onSubmit={submitReply}
            className={`mt-4 grid gap-3 rounded-chip border-[1.5px] border-ink/15 p-3.5 ${
              isReply ? "bg-surface" : "bg-paper"
            }`}
          >
            {replyFromSession ? (
              <p className="font-mono text-sm tracking-[0.02em] text-ink">
                {replyAuthorName}
              </p>
            ) : (
              <div className="grid gap-1.5">
                <label htmlFor={nameId} className={LABEL}>
                  Nombre *
                </label>
                <input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  required
                  className={FIELD}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <label htmlFor={contentId} className={LABEL}>
                Respuesta *
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <textarea
                  id={contentId}
                  ref={textareaRef}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  required
                  className={`${FIELD} min-w-0 flex-1`}
                />
                <EmojiPicker
                  onSelect={insertEmoji}
                  label="Insertar emoji en la respuesta"
                  className="shrink-0 sm:self-start"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                as="button"
                type="submit"
                size="sm"
                aria-disabled={status.kind === "sending"}
                className="aria-disabled:pointer-events-none aria-disabled:opacity-60"
              >
                {status.kind === "sending" ? "Enviando…" : "Enviar respuesta"}
              </Button>
              <Button
                as="button"
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeReply}
              >
                Cancelar
              </Button>
              {status.kind === "error" ? (
                <p
                  role="alert"
                  className="font-mono text-[0.6875rem] tracking-[0.1em] text-coral-ink"
                >
                  {status.message}
                </p>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export default function CommentThread({
  comment,
  replies,
  onReply,
  replyAuthorName,
  replyFromSession,
}: CommentThreadProps) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const rawId = useId();
  const threadId = `comment-thread-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <li>
      <CommentCard
        comment={comment}
        variant="root"
        onReply={onReply}
        replyAuthorName={replyAuthorName}
        replyFromSession={replyFromSession}
        onReplyCreated={() => setRepliesOpen(true)}
      />

      {replies.length > 0 ? (
        <div className="mt-3 pl-1">
          <button
            type="button"
            aria-expanded={repliesOpen}
            aria-controls={threadId}
            onClick={() => setRepliesOpen((value) => !value)}
            className={TOGGLE}
          >
            {repliesOpen
              ? "Ocultar respuestas"
              : `Ver respuestas (${replies.length})`}
          </button>
        </div>
      ) : null}

      {replies.length > 0 && repliesOpen ? (
        <ul
          id={threadId}
          className="mt-4 grid gap-4 border-l-[1.5px] border-ink/20 pl-4 sm:pl-5"
        >
          {replies.map((reply) => (
            <li key={reply.comment.id}>
              <CommentCard
                comment={reply.comment}
                variant="reply"
                parentName={reply.parentName}
                onReply={onReply}
                replyAuthorName={replyAuthorName}
                replyFromSession={replyFromSession}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
