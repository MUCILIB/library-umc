/**
 * Standalone Deduplication Script for Bibliographies
 * Usage: npm run deduplicate:catalog
 */
import "dotenv/config";
import { bibliographyService } from "../src/modules/bibliography/service/bibliography.service";

async function main() {
  console.log("=== MUCILIB Bibliography Deduplication ===");
  try {
    const result = await bibliographyService.deduplicateBibliographies();
    console.log("Deduplication complete:");
    console.log(`- Processed duplicate groups: ${result.processedGroups}`);
    console.log(`- Merged items: ${result.mergedCount}`);
    console.log(`- Soft-deleted redundant bibliographies: ${result.cleanedDuplicates}`);
    process.exit(0);
  } catch (error: any) {
    console.error("Deduplication failed:", error.message);
    process.exit(1);
  }
}

main();
