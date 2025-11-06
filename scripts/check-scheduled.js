const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScheduled() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'scheduled'
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true
      }
    });

    console.log('Scheduled posts:', posts.length);
    posts.forEach(p => {
      console.log(`- ${p.title} (id: ${p.id}, scheduled: ${p.scheduledAt})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScheduled();
