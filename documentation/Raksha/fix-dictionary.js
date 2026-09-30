const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\SAI\\Desktop\\Raksha\\frontend\\src\\lib\\i18n\\dictionary.ts', 'utf8');

// Extract the en object
const enStart = content.indexOf('export const en = {');
const enEnd = content.indexOf('} as const', content.indexOf('export const en = {'));
const enContent = content.substring(enStart + 'export const en = {'.length, enEnd);

// Extract the hi object
const hiStart = content.indexOf('export const hi: Record<DictKey, string> = {');
const hiEnd = content.indexOf('}', hiStart + 1);
const hiContent = content.substring(hiStart + 'export const hi: Record<DictKey, string> = {'.length, hiEnd);

// Parse key-value pairs from content
function parseDict(content) {
  const entries = [];
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const match = line.match(/^'([^']+)':\s*(.+?),?\s*$/);
    if (match) {
      entries.push({ key: match[1], value: match[2].trim() });
      i++;
    } else if (line.includes("':")) {
      // Multi-line value - read until we find the closing quote and comma
      let fullLine = line;
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().endsWith("',") && !lines[j].trim().endsWith("'")) {
        fullLine += ' ' + lines[j].trim();
        j++;
      }
      if (j < lines.length) {
        fullLine += ' ' + lines[j].trim();
        j++;
      }
      const match = fullLine.match(/^'([^']+)':\s*(.+),?\s*$/);
      if (match) {
        entries.push({ key: match[1], value: match[2].trim() });
      }
      i = j;
    } else {
      i++;
    }
  }
  return entries;
}

const enEntries = parseDict(enContent);
const hiEntries = parseDict(hiContent);

console.log(`EN entries before dedup: ${enEntries.length}`);
console.log(`HI entries before dedup: ${hiEntries.length}`);

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
function buildDict(entries) {
  let result = '';
  for (const entry of entries) {
    result += `  '${entry.key}': ${entry.value},\n`;
  }
  return result;
}

const newEn = buildDict(enDeduped);
const newHi = buildDict(hiDeduped);

// Reconstruct the file
const header = content.substring(0, content.indexOf('export const en = {'));
const footer = content.substring(content.lastIndexOf('export function interpolate'));

const newContent = header + 'export const en = {\n' + newEn + '} as const\n\n' +
  'export type DictKey = keyof typeof en\n\n' +
  'export const hi: Record<DictKey, string> = {\n' + newHi + '}\n\n' +
  'export const dictionaries: Record<Lang, Record<DictKey, string>> = { en, hi }\n\n' +
  'export const LANGS: { value: Lang; label: string }[] = [\n' +
  '  { value: \'en\', label: en[\'language.english\'] },\n' +
  '  { value: \'hi\', label: en[\'language.hindi\'] },\n' +
  ']\n\n' +
  'export function interpolate(\n' +
  '  template: string,\n' +
  '  params?: Record<string, string | number>,\n' +
  '): string {\n' +
  '  if (!params) return template\n' +
  '  return template.replace(/\\{(\\w+)\\}/g, (match, key: string) =>\n' +
  '    key in params ? String(params[key]) : match,\n' +
  '  )\n' +
  '}\n';

fs.writeFileSync('C:\\Users\\SAI\\Desktop\\Raksha\\frontend\\src\\lib\\i18n\\dictionary.ts', newContent);
console.log('Dictionary fixed successfully!');