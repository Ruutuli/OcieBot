/**
 * Migration script to add custom IDs to existing documents
 * This script finds all documents without custom IDs and assigns them
 * Run with: npx tsx src/scripts/migrateCustomIds.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../database/connection';
import { QOTD } from '../database/models/QOTD';
import { Trivia } from '../database/models/Trivia';
import { Prompt } from '../database/models/Prompt';
import { OC } from '../database/models/OC';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';
import { logger } from '../utils/logger';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

interface MigrationStats {
  qotd: { total: number; migrated: number; skipped: number };
  trivia: { total: number; migrated: number; skipped: number };
  prompts: { total: number; migrated: number; skipped: number };
  ocs: { total: number; migrated: number; skipped: number };
}

async function migrateQOTDs(): Promise<{ migrated: number; skipped: number }> {
  logger.info('Migrating QOTDs...');
  
  // Find all QOTDs that don't have a valid custom ID
  // Get all QOTDs and filter in memory to avoid regex issues
  const allQOTDs = await QOTD.find({});
  const qotds = allQOTDs.filter(qotd => {
    if (!qotd.id) return true;
    return !isValidCustomId(qotd.id) || !qotd.id.startsWith('Q');
  });

  let migrated = 0;
  let skipped = 0;

  for (const qotd of qotds) {
    // Skip if it already has a valid custom ID
    if (qotd.id && isValidCustomId(qotd.id) && qotd.id.startsWith('Q')) {
      skipped++;
      continue;
    }

    try {
      // Generate a new custom ID
      const newId = await generateCustomId('Q', QOTD);
      qotd.id = newId;
      await qotd.save();
      migrated++;
      logger.info(`  ✓ Migrated QOTD ${qotd._id} → ${newId}`);
    } catch (error: any) {
      logger.error(`  ✗ Failed to migrate QOTD ${qotd._id}: ${error.message}`);
    }
  }

  return { migrated, skipped };
}

async function migrateTrivia(): Promise<{ migrated: number; skipped: number }> {
  logger.info('Migrating Trivia...');
  
  // Find all Trivia that don't have a valid custom ID
  // Get all Trivia and filter in memory to avoid regex issues
  const allTrivias = await Trivia.find({});
  const trivias = allTrivias.filter(trivia => {
    if (!trivia.id) return true;
    return !isValidCustomId(trivia.id) || !trivia.id.startsWith('T');
  });

  let migrated = 0;
  let skipped = 0;

  for (const trivia of trivias) {
    // Skip if it already has a valid custom ID
    if (trivia.id && isValidCustomId(trivia.id) && trivia.id.startsWith('T')) {
      skipped++;
      continue;
    }

    try {
      // Generate a new custom ID
      const newId = await generateCustomId('T', Trivia);
      trivia.id = newId;
      await trivia.save();
      migrated++;
      logger.info(`  ✓ Migrated Trivia ${trivia._id} → ${newId}`);
    } catch (error: any) {
      logger.error(`  ✗ Failed to migrate Trivia ${trivia._id}: ${error.message}`);
    }
  }

  return { migrated, skipped };
}

async function migratePrompts(): Promise<{ migrated: number; skipped: number }> {
  logger.info('Migrating Prompts...');
  
  // Find all Prompts that don't have a valid custom ID
  // Get all Prompts and filter in memory to avoid regex issues
  const allPrompts = await Prompt.find({});
  const prompts = allPrompts.filter(prompt => {
    if (!prompt.id) return true;
    return !isValidCustomId(prompt.id) || !prompt.id.startsWith('P');
  });

  let migrated = 0;
  let skipped = 0;

  for (const prompt of prompts) {
    // Skip if it already has a valid custom ID
    if (prompt.id && isValidCustomId(prompt.id) && prompt.id.startsWith('P')) {
      skipped++;
      continue;
    }

    try {
      // Generate a new custom ID
      const newId = await generateCustomId('P', Prompt);
      prompt.id = newId;
      await prompt.save();
      migrated++;
      logger.info(`  ✓ Migrated Prompt ${prompt._id} → ${newId}`);
    } catch (error: any) {
      logger.error(`  ✗ Failed to migrate Prompt ${prompt._id}: ${error.message}`);
    }
  }

  return { migrated, skipped };
}

async function migrateOCs(): Promise<{ migrated: number; skipped: number }> {
  logger.info('Migrating OCs...');
  
  // Find all OCs that don't have a valid custom ID
  // Get all OCs and filter in memory to avoid regex issues
  const allOCs = await OC.find({});
  const ocs = allOCs.filter(oc => {
    if (!oc.id) return true;
    return !isValidCustomId(oc.id) || !oc.id.startsWith('O');
  });

  let migrated = 0;
  let skipped = 0;

  for (const oc of ocs) {
    // Skip if it already has a valid custom ID
    if (oc.id && isValidCustomId(oc.id) && oc.id.startsWith('O')) {
      skipped++;
      continue;
    }

    try {
      // Generate a new custom ID
      const newId = await generateCustomId('O', OC);
      oc.id = newId;
      await oc.save();
      migrated++;
      logger.info(`  ✓ Migrated OC ${oc._id} → ${newId}`);
    } catch (error: any) {
      logger.error(`  ✗ Failed to migrate OC ${oc._id}: ${error.message}`);
    }
  }

  return { migrated, skipped };
}

async function main() {
  try {
    logger.info('Starting custom ID migration...');
    logger.info('This script will add custom IDs to existing documents that don\'t have them.');
    logger.info('');

    // Connect to database
    await connectDatabase();

    const stats: MigrationStats = {
      qotd: { total: 0, migrated: 0, skipped: 0 },
      trivia: { total: 0, migrated: 0, skipped: 0 },
      prompts: { total: 0, migrated: 0, skipped: 0 },
      ocs: { total: 0, migrated: 0, skipped: 0 }
    };

    // Get total counts
    stats.qotd.total = await QOTD.countDocuments({});
    stats.trivia.total = await Trivia.countDocuments({});
    stats.prompts.total = await Prompt.countDocuments({});
    stats.ocs.total = await OC.countDocuments({});

    logger.info(`Found ${stats.qotd.total} QOTDs, ${stats.trivia.total} Trivia, ${stats.prompts.total} Prompts, ${stats.ocs.total} OCs`);
    logger.info('');

    // Migrate each collection
    const qotdResult = await migrateQOTDs();
    stats.qotd.migrated = qotdResult.migrated;
    stats.qotd.skipped = qotdResult.skipped;

    const triviaResult = await migrateTrivia();
    stats.trivia.migrated = triviaResult.migrated;
    stats.trivia.skipped = triviaResult.skipped;

    const promptsResult = await migratePrompts();
    stats.prompts.migrated = promptsResult.migrated;
    stats.prompts.skipped = promptsResult.skipped;

    const ocsResult = await migrateOCs();
    stats.ocs.migrated = ocsResult.migrated;
    stats.ocs.skipped = ocsResult.skipped;

    // Print summary
    logger.info('');
    logger.info('=== Migration Summary ===');
    logger.info(`QOTDs:    ${stats.qotd.migrated} migrated, ${stats.qotd.skipped} skipped (${stats.qotd.total} total)`);
    logger.info(`Trivia:   ${stats.trivia.migrated} migrated, ${stats.trivia.skipped} skipped (${stats.trivia.total} total)`);
    logger.info(`Prompts:  ${stats.prompts.migrated} migrated, ${stats.prompts.skipped} skipped (${stats.prompts.total} total)`);
    logger.info(`OCs:      ${stats.ocs.migrated} migrated, ${stats.ocs.skipped} skipped (${stats.ocs.total} total)`);
    
    const totalMigrated = stats.qotd.migrated + stats.trivia.migrated + stats.prompts.migrated + stats.ocs.migrated;
    logger.info('');
    logger.success(`Migration complete! ${totalMigrated} documents migrated.`);

  } catch (error: any) {
    logger.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

// Run the migration
main();

