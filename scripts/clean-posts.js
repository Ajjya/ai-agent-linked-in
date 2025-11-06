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

    if (!forceFlag) {
      console.log(`⚠️  This will delete ALL ${totalPosts} posts (including published) to prepare for fresh AI-generated content.\n`);
      console.log('Posts to delete:');
      if (publishedPosts > 0) console.log(`   - ${publishedPosts} published posts`);
      if (scheduledPosts > 0) console.log(`   - ${scheduledPosts} scheduled posts`);
      if (draftPosts > 0) console.log(`   - ${draftPosts} draft posts`);
      if (failedPosts > 0) console.log(`   - ${failedPosts} failed posts`);
      console.log();
    }

    console.log('🗑️  Deleting ALL posts...\n');

    // Delete ALL posts at once
    const result = await prisma.post.deleteMany({});
    console.log(`   ✅ Deleted ${result.count} posts (all statuses)\n`);

    // Clean RSS items to reset "Already processed" state
    console.log('🔄 Cleaning "Already processed" RSS items...\n');
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

    console.log('\n📊 Updated Database Status:');
    console.log(`   Total Posts: ${remainingPosts}`);
    
    const remainingRSSItems = await prisma.rssItem.count();
    console.log(`   Total RSS Items: ${remainingRSSItems} (all reset)\n`);

    console.log(`✅ Cleanup complete! Deleted all posts and reset RSS items.\n`);
    console.log('💡 Next steps:');
    console.log('   1. Start the app: npm run dev');
    console.log('   2. Trigger RSS fetch: curl -X POST http://localhost:3000/api/system/rss/fetch');
    console.log('   3. New RSS posts will be fetched with AI-generated content');
    console.log('   4. Check dashboard to see AI-enhanced posts\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanPosts();
