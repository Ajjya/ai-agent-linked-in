const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToken() {
  try {
    const token = await prisma.linkedInToken.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    console.log('Latest token:');
    console.log('ID:', token?.id);
    console.log('Access Token:', token?.accessToken?.substring(0, 30) + '...');
    console.log('ExpiresAt:', token?.expiresAt);
    console.log('Now:', new Date());
    console.log('Expired?', token?.expiresAt < new Date());
    console.log('Expires in (ms):', token?.expiresAt - new Date());
    console.log('Expires in (hours):', (token?.expiresAt - new Date()) / (1000 * 60 * 60));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkToken();
