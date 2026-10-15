#!/usr/bin/env node
/**
 * Normalizes release artifact filenames to hyphens matching latest-mac.yml and latest.yml.
 * 
 * GitHub Releases API automatically converts spaces in asset filenames to dots (.),
 * while electron-updater and latest-mac.yml expect hyphens (-). This discrepancy causes
 * 404 errors during in-app auto-update downloads.
 * 
 * This script ensures all artifacts in release/ are mapped to exact hyphenated filenames
 * matching the update manifests, and cleans up unwanted .blockmap files.
 */

const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '..', 'release');

if (!fs.existsSync(releaseDir)) {
  console.log('[normalize-release] No release/ directory found. Skipping.');
  process.exit(0);
}

// 1. Clean up *.blockmap files
const files = fs.readdirSync(releaseDir);
for (const file of files) {
  if (file.endsWith('.blockmap')) {
    try {
      fs.unlinkSync(path.join(releaseDir, file));
    } catch {}
  }
}

// 2. Extract required filenames from latest-mac.yml and latest.yml
const requiredFiles = new Set();

function extractFilenamesFromYaml(yamlPath) {
  if (!fs.existsSync(yamlPath)) return;
  const content = fs.readFileSync(yamlPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- url:') || trimmed.startsWith('url:') || trimmed.startsWith('path:')) {
      const match = trimmed.match(/(?:url|path):\s*(.+)$/);
      if (match && match[1]) {
        const filename = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (filename && !filename.includes('/') && !filename.includes('\\')) {
          requiredFiles.add(filename);
        }
      }
    }
  }
}

extractFilenamesFromYaml(path.join(releaseDir, 'latest-mac.yml'));
extractFilenamesFromYaml(path.join(releaseDir, 'latest.yml'));

// Also add standard portable zip variants if present
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;
if (version) {
  requiredFiles.add(`Multi-Agent-${version}-win.zip`);
  requiredFiles.add(`Multi-Agent-${version}-arm64-win.zip`);
}

let createdCount = 0;

for (const targetName of requiredFiles) {
  const targetPath = path.join(releaseDir, targetName);
  if (fs.existsSync(targetPath)) {
    continue; // already exists
  }

  // Look for space-separated counterpart
  // e.g. Multi-Agent-2.1.0-arm64-mac.zip -> Multi Agent-2.1.0-arm64-mac.zip
  // e.g. Multi-Agent-Setup-2.1.0.exe -> Multi Agent Setup 2.1.0.exe
  let candidateName = targetName
    .replace(/^Multi-Agent-Setup-/, 'Multi Agent Setup ')
    .replace(/^Multi-Agent-/, 'Multi Agent-');

  let candidatePath = path.join(releaseDir, candidateName);

  if (!fs.existsSync(candidatePath)) {
    // Try alternate space replacements
    const altName = targetName.replace(/-/g, ' ');
    for (const f of fs.readdirSync(releaseDir)) {
      if (f.replace(/\s+/g, '-').toLowerCase() === targetName.toLowerCase()) {
        candidatePath = path.join(releaseDir, f);
        break;
      }
    }
  }

  if (fs.existsSync(candidatePath)) {
    try {
      // Use hardlink if possible, else copy
      try {
        fs.linkSync(candidatePath, targetPath);
      } catch {
        fs.copyFileSync(candidatePath, targetPath);
      }
      console.log(`[normalize-release] Linked: ${candidateName} -> ${targetName}`);
      createdCount++;
    } catch (err) {
      console.error(`[normalize-release] Failed to link ${candidateName} to ${targetName}:`, err.message);
    }
  }
}

console.log(`[normalize-release] Done. Normalized ${createdCount} release artifact(s) to hyphens.`);

