"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@repo/ui/playground";
import type { CommentItem } from "../lib/api";
import CommentThread, {
  type CommentNode,
  type FlatReply,
  type ReplyHandler,
} from "./CommentThread";

interface CommentTreeNode {
  comment: CommentNode;
  children: CommentTreeNode[];
}

interface CommentThreadData {
  root: CommentNode;
  replies: FlatReply[];
}

export interface CommentListProps {
  comments: CommentItem[];
  onReply: ReplyHandler;
  replyAuthorName: string;
  replyFromSession: boolean;
  visibleLimit?: number;
}

const DEFAULT_VISIBLE_LIMIT = 5;

function timestamp(comment: CommentNode): number {
  const value = Date.parse(comment.createdAt);
  return Number.isNaN(value) ? 0 : value;
}

function sortByCreatedAt(comments: CommentNode[]): CommentNode[] {
  return [...comments].sort((a, b) => timestamp(a) - timestamp(b));
}

/**
 * Convierte la lista plana de la API en un árbol de raíces y respuestas.
 * Los comentarios cuyo padre no viene en la lista se muestran como raíces
 * para no perderlos.
 */
function buildTree(comments: CommentNode[]): CommentTreeNode[] {
  const ids = new Set(comments.map((comment) => comment.id));
  const childrenByParent = new Map<string, CommentNode[]>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    const parentId = comment.parentId ?? null;
    if (parentId === null || parentId === comment.id || !ids.has(parentId)) {
      roots.push(comment);
      continue;
    }
    const siblings = childrenByParent.get(parentId);
    if (siblings) {
      siblings.push(comment);
    } else {
      childrenByParent.set(parentId, [comment]);
    }
  }

  const seen = new Set<string>();

  function build(comment: CommentNode): CommentTreeNode {
    seen.add(comment.id);
    const replies = sortByCreatedAt(
      (childrenByParent.get(comment.id) ?? []).filter(
        (reply) => !seen.has(reply.id),
      ),
    );
    return { comment, children: replies.map(build) };
  }

  const tree = sortByCreatedAt(roots).map(build);

  // Defensa ante datos incoherentes (por ejemplo, un ciclo de parentId):
  // cualquier nodo no visitado se muestra igualmente.
  const detached = sortByCreatedAt(
    comments.filter((comment) => !seen.has(comment.id)),
  );
  for (const comment of detached) {
    if (seen.has(comment.id)) continue;
    tree.push(build(comment));
  }

  return tree;
}

function displayName(comment: CommentNode): string {
  return comment.user?.name ?? comment.authorName ?? "Anónimo";
}

/**
 * Aplana las respuestas de un hilo en orden cronológico: la subconversación
 * vive en un solo nivel, sin sangrías que encogen cada respuesta.
 */
function flattenReplies(root: CommentTreeNode): FlatReply[] {
  const flat: FlatReply[] = [];
  function walk(nodes: CommentTreeNode[], parent: CommentNode): void {
    for (const node of nodes) {
      flat.push({
        comment: node.comment,
        parentName: parent.id === root.comment.id ? null : displayName(parent),
      });
      walk(node.children, node.comment);
    }
  }
  walk(root.children, root.comment);
  return flat.sort((a, b) => timestamp(a.comment) - timestamp(b.comment));
}

export default function CommentList({
  comments,
  onReply,
  replyAuthorName,
  replyFromSession,
  visibleLimit = DEFAULT_VISIBLE_LIMIT,
}: CommentListProps) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  const rawId = useId();
  const listId = `comments-list-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const tree = useMemo(() => buildTree(comments), [comments]);
  const threads = useMemo<CommentThreadData[]>(
    () =>
      tree.map((node) => ({
        root: node.comment,
        replies: flattenReplies(node),
      })),
    [tree],
  );
  const limit = Number.isFinite(visibleLimit)
    ? Math.max(1, Math.floor(visibleLimit))
    : DEFAULT_VISIBLE_LIMIT;

  // Al plegar, la lista se acorta mucho: devolvemos la vista al inicio
  // para que la persona no se quede mirando el final de la página.
  useEffect(() => {
    if (expanded || !shouldScrollRef.current) return;
    shouldScrollRef.current = false;
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  if (threads.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        Todavía no hay comentarios. Sé la primera persona en dejar uno.
      </p>
    );
  }

  const hiddenCount = threads.length - limit;
  const showToggle = hiddenCount > 0;
  const visibleThreads = expanded ? threads : threads.slice(0, limit);
  const scrollable = expanded && showToggle;

  function collapse(): void {
    shouldScrollRef.current = true;
    setExpanded(false);
  }

  return (
    <div ref={listRef} className="scroll-mt-24">
      <div
        id={listId}
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? "Lista de comentarios desplazable" : undefined}
        className={
          scrollable
            ? "comments-scroll overflow-y-auto overscroll-contain px-1 pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-ink"
            : undefined
        }
        style={scrollable ? { maxHeight: "min(65vh, 40rem)" } : undefined}
      >
        <ul className="grid gap-5">
          {visibleThreads.map((thread) => (
            <CommentThread
              key={thread.root.id}
              comment={thread.root}
              replies={thread.replies}
              onReply={onReply}
              replyAuthorName={replyAuthorName}
              replyFromSession={replyFromSession}
            />
          ))}
        </ul>
      </div>

      {showToggle ? (
        <div className="mt-6">
          {expanded ? (
            <Button
              as="button"
              variant="outline"
              size="sm"
              aria-expanded={true}
              aria-controls={listId}
              onClick={collapse}
            >
              Ver menos
            </Button>
          ) : (
            <Button
              as="button"
              variant="outline"
              size="sm"
              aria-expanded={false}
              aria-controls={listId}
              onClick={() => setExpanded(true)}
            >
              Ver más comentarios ({hiddenCount})
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
