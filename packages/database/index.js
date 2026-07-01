const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function connect() {
  await prisma.$connect();
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = { prisma, connect, disconnect };
