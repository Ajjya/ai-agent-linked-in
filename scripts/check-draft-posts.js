const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDraftPosts() {
  console.log('\n📝 Draft Posts Details\n');

  const posts = await prisma.post.findMany({
    where: { status: 'draft' },
    orderBy: { createdAt: 'desc' }
  });

  posts.forEach((post, index) => {
    console.log(`Post ${index + 1}:`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Content: ${post.content.substring(0, 150)}...`);
    console.log(`  Source: ${post.source || 'N/A'}`);
    console.log(`  Created: ${post.createdAt}`);
    console.log();
  });

  await prisma.$disconnect();
}

checkDraftPosts().catch(console.error);
