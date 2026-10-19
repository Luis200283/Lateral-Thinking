import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@repo/db";
import { createApp } from "./app";

vi.mock("@repo/db", () => ({
  prisma: {
    post: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    comment: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    postView: { create: vi.fn() },
    readSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tag: { findMany: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /health", () => {
  it("return ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /posts", () => {
  it("return a paginated list", async () => {
    vi.mocked(prisma.post.count).mockResolvedValue(0);
    vi.mocked(prisma.post.findMany).mockResolvedValue([]);

    const res = await app.request("/posts");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      items: [],
    });
  });

  it("reject an invalid limit", async () => {
    const res = await app.request("/posts?limit=999");
    expect(res.status).toBe(400);
  });

  it("filters by tag slug", async () => {
    vi.mocked(prisma.post.count).mockResolvedValue(1);
    vi.mocked(prisma.post.findMany).mockResolvedValue([]);

    const res = await app.request("/posts?tag=javascript");
    expect(res.status).toBe(200);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          tags: { some: { slug: "javascript" } },
        }),
      }),
    );
    expect(prisma.post.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { slug: "javascript" } },
        }),
      }),
    );
  });

  it("filters by free-text query in title/content (case-insensitive)", async () => {
    vi.mocked(prisma.post.count).mockResolvedValue(1);
    vi.mocked(prisma.post.findMany).mockResolvedValue([]);

    const res = await app.request("/posts?q=hello");
    expect(res.status).toBe(200);

    const firstCall = vi.mocked(prisma.post.findMany).mock.calls[0]?.[0];
    const where = firstCall?.where as Record<string, unknown> | undefined;
    expect(where?.status).toBe("PUBLISHED");
    expect(where?.OR).toEqual([
      { title: { contains: "hello", mode: "insensitive" } },
      { content: { contains: "hello", mode: "insensitive" } },
    ]);
  });
});

describe("GET /posts/:slug", () => {
  it("404s when the post does not exist", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValueOnce(null);

    const res = await app.request("/posts/nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("GET /posts/:slug/comments", () => {
  it("returns an empty list when there are no comments", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.comment.findMany).mockResolvedValue([]);

    const res = await app.request("/posts/hello-world/comments");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    // Sin filtro de moderación: todos los comentarios son públicos.
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { postId: "p1" } }),
    );
  });

  it("includes parentId in the selected fields", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.comment.findMany).mockResolvedValue([]);

    const res = await app.request("/posts/hello-world/comments");

    expect(res.status).toBe(200);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ parentId: true }),
      }),
    );
  });
});

describe("POST /posts/:slug/comments", () => {
  it("publishes automatically with approved: true", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "c1" } as never);

    const res = await app.request("/posts/hello-world/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Hola", authorName: "Ana" }),
    });

    expect(res.status).toBe(201);
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postId: "p1", approved: true }),
      }),
    );
  });

  it("creates a reply when parentId belongs to the same post", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.comment.findFirst).mockResolvedValue({ id: "c0" } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "c2" } as never);

    const res = await app.request("/posts/hello-world/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: "Respuesta",
        authorName: "Ana",
        parentId: "c0",
      }),
    });

    expect(res.status).toBe(201);
    expect(prisma.comment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c0", postId: "p1" },
      }),
    );
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: "c0", postId: "p1" }),
      }),
    );
  });

  it("rejects a parentId from another post without creating anything", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.comment.findFirst).mockResolvedValue(null as never);

    const res = await app.request("/posts/hello-world/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Respuesta", parentId: "c-other" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_parent" });
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });
});

describe("POST /posts/:slug/heartbeat", () => {
  it("creates a ReadSession on first heartbeat", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.readSession.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.readSession.create).mockResolvedValue({
      id: "r1",
      postId: "p1",
      sessionId: "s1",
      activeSeconds: 10,
      maxScrollDepth: 50,
      completed: false,
    } as never);

    const res = await app.request("/posts/hello-world/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "s1",
        activeSeconds: 10,
        maxScrollDepth: 50,
        completed: false,
      }),
    });

    expect(res.status).toBe(201);
    expect(prisma.readSession.findUnique).toHaveBeenCalledWith({
      where: { postId_sessionId: { postId: "p1", sessionId: "s1" } },
    });
    expect(prisma.readSession.create).toHaveBeenCalledWith({
      data: {
        postId: "p1",
        sessionId: "s1",
        activeSeconds: 10,
        maxScrollDepth: 50,
        completed: false,
      },
    });
  });

  it("accumulates activeSeconds, max scroll and OR completed", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.readSession.findUnique).mockResolvedValue({
      id: "r1",
      postId: "p1",
      sessionId: "s1",
      activeSeconds: 10,
      maxScrollDepth: 50,
      completed: false,
    } as never);
    vi.mocked(prisma.readSession.update).mockResolvedValue({
      id: "r1",
      postId: "p1",
      sessionId: "s1",
      activeSeconds: 15,
      maxScrollDepth: 80,
      completed: true,
    } as never);

    const res = await app.request("/posts/hello-world/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "s1",
        activeSeconds: 5,
        maxScrollDepth: 80,
        completed: true,
      }),
    });

    expect(res.status).toBe(200);
    expect(prisma.readSession.update).toHaveBeenCalledWith({
      where: { postId_sessionId: { postId: "p1", sessionId: "s1" } },
      data: {
        activeSeconds: 15,
        maxScrollDepth: 80,
        completed: true,
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it("keeps max scroll when incoming depth is lower", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.readSession.findUnique).mockResolvedValue({
      id: "r1",
      postId: "p1",
      sessionId: "s1",
      activeSeconds: 20,
      maxScrollDepth: 90,
      completed: true,
    } as never);
    vi.mocked(prisma.readSession.update).mockResolvedValue({
      id: "r1",
      activeSeconds: 25,
      maxScrollDepth: 90,
      completed: true,
    } as never);

    const res = await app.request("/posts/hello-world/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "s1",
        activeSeconds: 5,
        maxScrollDepth: 30,
        completed: false,
      }),
    });

    expect(res.status).toBe(200);
    expect(prisma.readSession.update).toHaveBeenCalledWith({
      where: { postId_sessionId: { postId: "p1", sessionId: "s1" } },
      data: {
        activeSeconds: 25,
        maxScrollDepth: 90,
        completed: true,
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it("404s when the slug does not exist", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue(null as never);

    const res = await app.request("/posts/nope/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "s1",
        activeSeconds: 5,
        maxScrollDepth: 10,
        completed: false,
      }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(prisma.readSession.findUnique).not.toHaveBeenCalled();
  });
});

describe("GET /tags", () => {
  it("lists tags with published post counts", async () => {
    const rows = [
      {
        id: "t1",
        name: "JavaScript",
        slug: "javascript",
        _count: { posts: 2 },
      },
    ];
    vi.mocked(prisma.tag.findMany).mockResolvedValue(rows as never);

    const res = await app.request("/tags");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
        select: expect.objectContaining({
          id: true,
          name: true,
          slug: true,
          _count: expect.anything(),
        }),
      }),
    );
  });
});
