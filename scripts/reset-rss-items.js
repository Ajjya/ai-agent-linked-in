const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetRSSItems() {
  console.log('\n🔄 Resetting RSS Items\n');

  console.log('📊 Current Status:');
  const totalRSSItems = await prisma.rssItem.count();
  const processedRSSItems = await prisma.rssItem.count({ where: { processed: true } });
  console.log(`   Total RSS Items: ${totalRSSItems}`);
  console.log(`   Processed: ${processedRSSItems}\n`);

  if (totalRSSItems > 0) {
    console.log('🗑️  Deleting all RSS items to force re-processing...');
    const deleted = await prisma.rssItem.deleteMany({});
    console.log(`   ✅ Deleted ${deleted.count} RSS items\n`);
  }

  console.log('✅ Reset complete!');
  console.log('💡 Next: Run RSS fetch to re-process all items with AI content\n');

  await prisma.$disconnect();
}

resetRSSItems().catch(console.error);
