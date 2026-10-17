import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";
import { prisma } from "@repo/db";
import { createApp } from "./app";

vi.mock("@repo/db", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    postView: { count: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}));

// Better Auth never loads in tests: we only exercise OUR code,
// mounted on the same app (health, /me, /posts, /comments, /stats, /tags).
vi.mock("./auth", () => ({
  auth: { handler: vi.fn() },
}));

// The JWKS round-trip is jose's job (already proven manually in M3).
// Here we control its verdict: resolve = valid token, reject = bad token.
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
}));

const app = createApp();

const adminPayload = {
  payload: { sub: "admin-1" },
  protectedHeader: { alg: "EdDSA" },
};

function validToken() {
  vi.mocked(jwtVerify).mockResolvedValue(adminPayload as any);
}

function adminUser() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
}

function authedAsAdmin() {
  validToken();
  adminUser();
  vi.mocked(prisma.post.findUnique).mockResolvedValue(null);
}

function post(path: string, body: unknown, token?: string) {
  return app.request(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function authed(
  path: string,
  method: string,
  body?: unknown,
  token = "admin-token",
) {
  return app.request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("POST /posts", () => {
  it("401s without a token", async () => {
    const res = await post("/posts", { title: "x", content: "y" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("401s with an invalid token", async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("bad signature"));

    const res = await post("/posts", { title: "x", content: "y" }, "bad-token");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("403s for non-admin users", async () => {
    validToken();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "USER" } as any);

    const res = await post(
      "/posts",
      { title: "x", content: "y" },
      "user-token",
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("400s with invalid_body for a bad payload", async () => {
    authedAsAdmin();

    const res = await post("/posts", { title: "" }, "admin-token");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("creates a draft with a generated slug (201)", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.create).mockResolvedValue({
      id: "p1",
      title: "Mi segundo post",
      slug: "mi-segundo-post",
      status: "DRAFT",
    } as any);

    const res = await post(
      "/posts",
      { title: "Mi segundo post", content: "# Hola" },
      "admin-token",
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("mi-segundo-post");
    // The author comes from the JWT, never from the request body.
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorId: "admin-1" }),
      }),
    );
  });

  it("suffixes the slug on collision", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.findUnique)
      .mockResolvedValueOnce({ id: "taken" } as any)
      .mockResolvedValue(null);
    vi.mocked(prisma.post.create).mockResolvedValue({
      id: "p2",
      slug: "mi-post-2",
    } as any);

    const res = await post(
      "/posts",
      { title: "Mi post", content: "y" },
      "admin-token",
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ slug: "mi-post-2" });
  });
});

describe("GET /posts", () => {
  it("401s without a token", async () => {
    const res = await app.request("/posts");
    expect(res.status).toBe(401);
  });

  it("returns the admin list including drafts", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.findMany).mockResolvedValue([]);

    const res = await app.request("/posts", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 0, items: [] });
  });
});

describe("GET /posts/:slug", () => {
  it("401s without a token", async () => {
    const res = await app.request("/posts/mi-post");
    expect(res.status).toBe(401);
  });

  it("returns a draft to admins (public API would 404)", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.findUnique).mockResolvedValue({
      id: "p1",
      slug: "mi-post",
      status: "DRAFT",
    } as any);

    const res = await app.request("/posts/mi-post", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ slug: "mi-post" });
    expect(prisma.post.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "mi-post" } }),
    );
  });

  it("404s on unknown slug", async () => {
    authedAsAdmin();

    const res = await app.request("/posts/no-existe", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("PATCH /posts/:id", () => {
  it("401s without a token", async () => {
    const res = await app.request("/posts/p1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("400s with invalid_body for a bad payload", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.findUnique).mockResolvedValue({
      id: "p1",
      slug: "mi-post",
    } as any);

    const res = await authed("/posts/p1", "PATCH", { title: "" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("404s on unknown id", async () => {
    authedAsAdmin();

    const res = await authed("/posts/missing", "PATCH", { title: "x" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("edits a post but keeps its slug and publishedAt", async () => {
    authedAsAdmin();
    const publishedAt = new Date("2026-01-01T00:00:00.000Z");
    const existing = {
      id: "p1",
      slug: "mi-post",
      status: "PUBLISHED",
      publishedAt,
      tags: [],
    };
    vi.mocked(prisma.post.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.post.update).mockResolvedValue({
      ...existing,
      title: "Nuevo título",
    } as any);

    const res = await authed("/posts/p1", "PATCH", { title: "Nuevo título" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "Nuevo título" });
    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          title: "Nuevo título",
          slug: "mi-post",
          publishedAt,
        }),
      }),
    );
  });

  it("sets publishedAt when a draft is published", async () => {
    authedAsAdmin();
    const existing = {
      id: "p2",
      slug: "borrador",
      status: "DRAFT",
      publishedAt: null,
      tags: [],
    };
    vi.mocked(prisma.post.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.post.update).mockResolvedValue({
      ...existing,
      status: "PUBLISHED",
    } as any);

    const res = await authed("/posts/p2", "PATCH", { status: "PUBLISHED" });

    expect(res.status).toBe(200);
    const updateArg = vi.mocked(prisma.post.update).mock.calls[0]![0];
    expect(
      (updateArg.data as { publishedAt: unknown }).publishedAt,
    ).toBeInstanceOf(Date);
  });
});

describe("DELETE /posts/:id", () => {
  it("401s without a token", async () => {
    const res = await app.request("/posts/p1", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("404s on unknown id", async () => {
    authedAsAdmin();

    const res = await authed("/posts/missing", "DELETE");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("deletes by stable id (not slug)", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ id: "p1" } as any);
    vi.mocked(prisma.post.delete).mockResolvedValue({ id: "p1" } as any);

    const res = await authed("/posts/p1", "DELETE");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("GET /comments (lista completa)", () => {
  it("401s without a token", async () => {
    const res = await app.request("/comments");
    expect(res.status).toBe(401);
  });

  it("returns all comments without moderation filter", async () => {
    authedAsAdmin();
    const items = [{ id: "c1" }, { id: "c2" }];
    vi.mocked(prisma.comment.findMany).mockResolvedValue(items as any);

    const res = await app.request("/comments", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 2, items });
    const call = vi.mocked(prisma.comment.findMany).mock.calls[0]?.[0];
    expect(call?.where).toBeUndefined();
  });
});

describe("DELETE /comments/:id", () => {
  it("deletes a comment", async () => {
    authedAsAdmin();
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      id: "c1",
    } as any);
    vi.mocked(prisma.comment.delete).mockResolvedValue({ id: "c1" } as any);

    const res = await authed("/comments/c1", "DELETE");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });

  it("404s on unknown id", async () => {
    authedAsAdmin();
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

    const res = await authed("/comments/missing", "DELETE");
    expect(res.status).toBe(404);
  });
});

describe("GET /stats", () => {
  it("401s without a token", async () => {
    const res = await app.request("/stats");
    expect(res.status).toBe(401);
  });

  it("returns dashboard counters and top posts", async () => {
    authedAsAdmin();
    vi.mocked(prisma.post.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3);
    vi.mocked(prisma.postView.count).mockResolvedValue(150);
    vi.mocked(prisma.comment.count).mockResolvedValue(4);
    vi.mocked(prisma.post.findMany).mockResolvedValue([
      { id: "p1", title: "Top", slug: "top", _count: { views: 42 } },
    ] as any);

    const res = await app.request("/stats", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalPosts: 10,
      published: 7,
      drafts: 3,
      totalViews: 150,
      totalComments: 4,
      topPosts: [{ id: "p1", title: "Top", slug: "top", views: 42 }],
    });
  });
});

describe("GET /tags", () => {
  it("401s without a token", async () => {
    const res = await app.request("/tags");
    expect(res.status).toBe(401);
  });

  it("returns the tag list", async () => {
    authedAsAdmin();
    const items = [{ id: "t1", name: "JS", slug: "js" }];
    vi.mocked(prisma.tag.findMany).mockResolvedValue(items as any);

    const res = await app.request("/tags", {
      headers: { Authorization: "Bearer admin-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 1, items });
  });
});
