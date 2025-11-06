#!/usr/bin/env node

/**
 * Clean existing posts from database
 * Removes all draft and scheduled posts to start fresh with AI-generated content
 * 
 * Usage:
 *   npm run clean:posts
 *   npm run clean:posts -- --force (skip confirmation)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const forceFlag = process.argv.includes('--force');

async function cleanPosts() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🗑️  Post Database Cleanup Tool                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Count current posts
    const totalPosts = await prisma.post.count();
    const draftPosts = await prisma.post.count({ where: { status: 'draft' } });
    const scheduledPosts = await prisma.post.count({ where: { status: 'scheduled' } });
    const failedPosts = await prisma.post.count({ where: { status: 'failed' } });
    const publishedPosts = await prisma.post.count({ where: { status: 'published' } });

    console.log('📊 Current Database Status:');
    console.log(`   Total Posts: ${totalPosts}`);
    console.log(`   ├─ Published: ${publishedPosts}`);
    console.log(`   ├─ Scheduled: ${scheduledPosts}`);
    console.log(`   ├─ Failed: ${failedPosts}`);
    console.log(`   └─ Draft: ${draftPosts}\n`);

    if (totalPosts === 0) {
      console.log('✅ Database is already clean!\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    const toDelete = draftPosts + scheduledPosts + failedPosts;
    if (toDelete === 0) {
      console.log('✅ No posts to clean! Only published posts exist.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    if (!forceFlag) {
      console.log(`⚠️  This will delete ${toDelete} non-published posts to prepare for AI-generated content.\n`);
      console.log('Posts to delete:');
      if (draftPosts > 0) console.log(`   - ${draftPosts} draft posts`);
      if (scheduledPosts > 0) console.log(`   - ${scheduledPosts} scheduled posts`);
      if (failedPosts > 0) console.log(`   - ${failedPosts} failed posts`);
      console.log();
    }

    console.log('🗑️  Deleting posts...\n');

    let deletedCount = 0;

    // Delete draft posts
    if (draftPosts > 0) {
      const result = await prisma.post.deleteMany({
        where: { status: 'draft' }
      });
      console.log(`   ✅ Deleted ${result.count} draft posts`);
      deletedCount += result.count;
    }

    // Delete scheduled posts
    if (scheduledPosts > 0) {
      const result = await prisma.post.deleteMany({
        where: { status: 'scheduled' }
      });
      console.log(`   ✅ Deleted ${result.count} scheduled posts`);
      deletedCount += result.count;
    }

    // Delete failed posts
    if (failedPosts > 0) {
      const result = await prisma.post.deleteMany({
        where: { status: 'failed' }
      });
      console.log(`   ✅ Deleted ${result.count} failed posts`);
      deletedCount += result.count;
    }

    // Clean RSS items to reset "Already processed" state
    console.log('\n🔄 Cleaning "Already processed" RSS items...\n');
    const totalRSSItems = await prisma.rssItem.count();
    const processedRSSItems = await prisma.rssItem.count({ where: { processed: true } });
    
    console.log('📊 RSS Items Status:');
    console.log(`   Total RSS Items: ${totalRSSItems}`);
    console.log(`   Processed: ${processedRSSItems}\n`);

    if (totalRSSItems > 0) {
      console.log('🗑️  Deleting all RSS items to reset "Already processed" state...');
      const rssDeleted = await prisma.rssItem.deleteMany({});
      console.log(`   ✅ Deleted ${rssDeleted.count} RSS items\n`);
    }

    // Count remaining
    const remainingPosts = await prisma.post.count();
    const remainingPublished = await prisma.post.count({ where: { status: 'published' } });

    console.log('\n📊 Updated Database Status:');
    console.log(`   Total Posts: ${remainingPosts}`);
    console.log(`   └─ Published: ${remainingPublished} (preserved)\n`);
    
    const remainingRSSItems = await prisma.rssItem.count();
    console.log(`   Total RSS Items: ${remainingRSSItems} (all reset)\n`);

    console.log(`✅ Cleanup complete! Deleted ${deletedCount} posts and reset RSS items.\n`);
    console.log('💡 Next steps:');
    console.log('   1. Start the app: npm run dev');
    console.log('   2. Trigger RSS fetch: curl -X POST http://localhost:3000/api/system/rss/fetch');
    console.log('   2. New RSS posts will be fetched with AI-generated content');
    console.log('   3. Check dashboard to see AI-enhanced posts\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanPosts();
