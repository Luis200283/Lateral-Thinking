import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@repo/db";
import { createApp } from "./app";

vi.mock("@repo/db", () => ({
  prisma: {
    post: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    comment: { findMany: vi.fn(), create: vi.fn() },
    postView: { create: vi.fn() },
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
  it("returns an empty list when are no approved comments", async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: "p1" } as any);
    vi.mocked(prisma.comment.findMany).mockResolvedValue([]);

    const res = await app.request("/posts/hello-world/comments");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
