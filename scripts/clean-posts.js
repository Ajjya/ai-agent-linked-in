#!/usr/bin/env node

/**
 * Clean existing posts from database
 * Removes all draft and scheduled posts to start fresh with AI-generated content
 * 
 * Usage:
 *   npm run clean:posts
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function cleanPosts() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🗑️  Post Database Cleanup Tool                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Count current posts
    const totalPosts = await prisma.post.count();
    const draftPosts = await prisma.post.count({ where: { status: 'draft' } });
    const scheduledPosts = await prisma.post.count({ where: { status: 'scheduled' } });
    const publishedPosts = await prisma.post.count({ where: { status: 'published' } });

    console.log('📊 Current Database Status:');
    console.log(`   Total Posts: ${totalPosts}`);
    console.log(`   ├─ Published: ${publishedPosts}`);
    console.log(`   ├─ Scheduled: ${scheduledPosts}`);
    console.log(`   └─ Draft: ${draftPosts}\n`);

    if (totalPosts === 0) {
      console.log('✅ Database is already clean!\n');
      rl.close();
      return;
    }

    console.log('⚠️  This will delete ALL draft and scheduled posts to prepare for AI-generated content.\n');

    const confirm = await question('Are you sure? Type "yes" to confirm: ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  Deleting posts...\n');

    // Delete draft posts
    if (draftPosts > 0) {
      const deletedDrafts = await prisma.post.deleteMany({
        where: { status: 'draft' }
      });
      console.log(`   ✅ Deleted ${deletedDrafts.count} draft posts`);
    }

    // Delete scheduled posts
    if (scheduledPosts > 0) {
      const deletedScheduled = await prisma.post.deleteMany({
        where: { status: 'scheduled' }
      });
      console.log(`   ✅ Deleted ${deletedScheduled.count} scheduled posts`);
    }

    // Count remaining
    const remainingPosts = await prisma.post.count();
    const remainingPublished = await prisma.post.count({ where: { status: 'published' } });

    console.log('\n📊 Updated Database Status:');
    console.log(`   Total Posts: ${remainingPosts}`);
    console.log(`   └─ Published: ${remainingPublished} (preserved)\n`);

    console.log('✅ Cleanup complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Start the app: npm run dev');
    console.log('   2. New RSS posts will be fetched with AI-generated content');
    console.log('   3. Check dashboard to see AI-enhanced posts\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run cleanup
cleanPosts();
