const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\SAI\\Desktop\\Raksha\\frontend\\src\\lib\\i18n\\dictionary.ts', 'utf8');

// Find the en object
const enMatch = content.match(/export const en = \{([\s\S]*?)\} as const/);
if (!enMatch) {
  console.error('Could not find en object');
  process.exit(1);
}

const enContent = enMatch[1];

// Find the hi object
const hiMatch = content.match(/export const hi: Record<DictKey, string> = \{([\s\S]*?)\n\}/);
if (!hiMatch) {
  console.error('Could not find hi object');
  process.exit(1);
}

const hiContent = hiMatch[1];

// Parse key-value pairs from en
function parseDict(content) {
  const entries = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*'([^']+)':\s*(.+),?\s*$/);
    if (match) {
      entries.push({ key: match[1], value: match[2].trim() });
    }
  }
  return entries;
}

const enEntries = parseDict(enContent);
const hiEntries = parseDict(hiContent);

// Deduplicate by keeping first occurrence
function deduplicate(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!seen.has(entry.key)) {
      seen.add(entry.key);
      result.push(entry);
    }
  }
  return result;
}

const enDeduped = deduplicate(enEntries);
const hiDeduped = deduplicate(hiEntries);

console.log(`EN: ${enEntries.length} -> ${enDeduped.length} (removed ${enEntries.length - enDeduped.length} duplicates)`);
console.log(`HI: ${hiEntries.length} -> ${hiDeduped.length} (removed ${hiEntries.length - hiDeduped.length} duplicates)`);

// Rebuild the dictionary
function buildDict(entries, dictName) {
  let result = `export const ${dictName} = {\n`;
  for (const entry of entries) {
    result += `  '${entry.key}': ${entry.value},\n`;
  }
  result += '} as const\n\n';
  return result;
}

const newEn = buildDict(enDeduped, 'en');
const newHi = buildDict(hiDeduped, 'hi');

// Reconstruct the file
const header = content.substring(0, content.indexOf('export const en = {'));
const footer = content.substring(content.lastIndexOf('export function interpolate'));

const newContent = header + newEn + '\nexport type DictKey = keyof typeof en\n\n' + newHi + '\n\n' + footer;

fs.writeFileSync('C:\\Users\\SAI\\Desktop\\Raksha\\frontend\\src\\lib\\i18n\\dictionary.ts', newContent);
console.log('Dictionary deduplicated successfully!');