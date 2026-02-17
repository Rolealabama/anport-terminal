#!/usr/bin/env node

/**
 * Post-build script to organize sourcemap files
 * Moves all .map files from dist/assets to dist/sourcemaps
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dir, '..', 'dist');
const assetsPath = path.join(distPath, 'assets');
const sourcemapsPath = path.join(distPath, 'sourcemaps');

try {
  // Create sourcemaps directory if it doesn't exist
  if (!fs.existsSync(sourcemapsPath)) {
    fs.mkdirSync(sourcemapsPath, { recursive: true });
    console.log('✓ Created sourcemaps directory');
  }

  // Find and move all .map files
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    let movedCount = 0;

    files.forEach((file) => {
      if (file.endsWith('.map')) {
        const srcFile = path.join(assetsPath, file);
        const destFile = path.join(sourcemapsPath, file);
        
        fs.renameSync(srcFile, destFile);
        movedCount++;
        console.log(`  ✓ Moved: ${file}`);
      }
    });

    if (movedCount > 0) {
      console.log(`\n✓ Successfully moved ${movedCount} sourcemap file(s) to dist/sourcemaps/`);
    } else {
      console.log('✓ No sourcemap files found to move');
    }
  }
} catch (error) {
  console.error('✗ Error organizing sourcemaps:', error.message);
  process.exit(1);
}
