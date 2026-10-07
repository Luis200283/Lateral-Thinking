import { prisma } from "../src/index";

async function main() {
  const author = await prisma.user.upsert({
    where: { email: "luis@luishswe.com" },
    update: {},
    create: { email: "luis@luishswe.com", name: "Luis", role: "ADMIN" },
  });

  await prisma.post.upsert({
    where: { slug: "hello-world" },
    update: {},
    create: {
      title: "Hello world",
      slug: "hello-world",
      content: "# Hello\n\nMy first post.",
      excerpt: "My first post.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: author.id,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
