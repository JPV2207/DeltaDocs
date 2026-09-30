const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documentationVersion.findMany({
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${docs.length} documentation versions in DB:`);
  docs.forEach((d, i) => {
    console.log(`\n--- [${i + 1}] SHA: ${d.shortSha} | Status: ${d.status} | Type: ${d.generationType} | Model: ${d.modelUsed} ---`);
    console.log(`Message: ${d.commitMessage}`);
    console.log(`Created: ${d.createdAt}`);
    console.log(`Files: ${JSON.stringify(d.changedFiles)}`);
    if (d.errorMessage) console.log(`Error: ${d.errorMessage}`);
    if (d.content) {
      console.log(`Title: ${d.content.title}`);
      console.log(`Changelog: ${d.content.changelog}`);
      console.log(`Sections present:`, Object.keys(d.content.sections || {}));
      console.log(`Overview preview:`, String(d.content.sections?.overview || '').slice(0, 150));
    }
  });
}

main().finally(() => prisma.$disconnect());
