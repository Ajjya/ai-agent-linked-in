const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPost() {
  try {
    const post = await prisma.post.findFirst({
      where: {
        title: 'MongoDB is a Glassdoor Best-Led Company of 2025'
      },
      select: {
        id: true,
        title: true,
        status: true,
        linkedinPostId: true,
        scheduledAt: true,
        publishedAt: true
      }
    });

    console.log('Post details:');
    console.log(JSON.stringify(post, null, 2));
    
    // Also check publish logs
    const logs = await prisma.publishLog.findMany({
      where: {
        postId: post?.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log('\nPublish logs:');
    logs.forEach(log => {
      console.log(`- [${log.createdAt}] ${log.status}: ${log.message}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPost();
