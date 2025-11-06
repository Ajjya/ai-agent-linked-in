const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRSSStatus() {
  console.log('\n📊 RSS Items Status Check\n');

  const totalRSSItems = await prisma.rssItem.count();
  const processedRSSItems = await prisma.rssItem.count({ where: { processed: true } });
  const notProcessedRSSItems = await prisma.rssItem.count({ where: { processed: false } });

  console.log(`Total RSS Items: ${totalRSSItems}`);
  console.log(`  ├─ Processed: ${processedRSSItems}`);
  console.log(`  └─ Not processed: ${notProcessedRSSItems}\n`);

  if (notProcessedRSSItems > 0) {
    console.log('📋 Not processed items:');
    const items = await prisma.rssItem.findMany({
      where: { processed: false },
      take: 5,
      select: { guid: true, title: true, pubDate: true }
    });
    items.forEach(item => {
      console.log(`  - ${item.title} (${item.pubDate.toLocaleDateString()})`);
    });
    console.log();
  }

  const totalPosts = await prisma.post.count();
  const posts = await prisma.post.groupBy({
    by: ['status'],
    _count: true
  });

  console.log('📮 Posts by status:');
  posts.forEach(p => {
    console.log(`  - ${p.status}: ${p._count}`);
  });
  console.log();

  await prisma.$disconnect();
}

checkRSSStatus().catch(console.error);
