/** Flatten a snapshot into [section, metric, value] rows for CSV/PDF rendering. */
export function snapshotToRows(snapshot: Record<string, unknown>): string[][] {
  const rows: string[][] = []
  const walk = (section: string, path: string, value: unknown, depth: number): void => {
    if (depth > 4) return
    if (value === null || value === undefined) {
      rows.push([section, path, ''])
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      rows.push([section, path, String(value)])
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        rows.push([section, path, ''])
      } else {
        value.forEach((item, i) => walk(section, `${path}[${i}]`, item, depth + 1))
      }
    } else if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) {
        rows.push([section, path, ''])
      } else {
        for (const [k, v] of entries) walk(section, path ? `${path}.${k}` : k, v, depth + 1)
      }
    }
  }

  for (const [section, value] of Object.entries(snapshot)) {
    if (section === 'generatedAtUtc' || section === 'filters') continue
    walk(section, '', value, 0)
  }
  return rows
}

function csvCell(value: string): string {
  // Guard against spreadsheet formula injection: values starting with a
  // trigger character are neutralized with a leading single quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** RFC-4180 CSV with header row. */
export function toCsv(title: string, snapshot: Record<string, unknown>): string {
  const lines = [`# ${title}`, 'section,metric,value']
  for (const [section, metric, value] of snapshotToRows(snapshot)) {
    lines.push([csvCell(section), csvCell(metric), csvCell(value)].join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wordWrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter((w) => w !== '')
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`
    if (candidate.length > width) {
      if (current !== '') lines.push(current)
      current = word.length > width ? word.slice(0, width) : word
    } else {
      current = candidate
    }
  }
  if (current !== '') lines.push(current)
  return lines
}

/**
 * Minimal valid PDF 1.4 generator (Helvetica, A4, paginated). Dependency-free
 * on purpose: the report content is plain key/value text.
 */
export function toPdf(title: string, snapshot: Record<string, unknown>): Buffer {
  const contentLines: string[] = [title, '']
  let currentSection = ''
  for (const [section, metric, value] of snapshotToRows(snapshot)) {
    if (section !== currentSection) {
      currentSection = section
      contentLines.push('', `[${section}]`)
    }
    contentLines.push(...wordWrap(`${metric}: ${value}`, 95))
  }

  // PDF body uses latin1 byte offsets: fold anything outside latin1 to '?'.
  const safeLines = contentLines.map((line) => line.replace(/[^\x20-\xFF]/g, '?'))
  const perPage = 48
  const pages: string[][] = []
  for (let i = 0; i < safeLines.length; i += perPage) {
    pages.push(safeLines.slice(i, i + perPage))
  }
  if (pages.length === 0) pages.push([''])

  // Object layout: 1 catalog, 2 pages, then (page, content) pairs, then font.
  const bodies = new Map<number, string>()
  const pageNums: number[] = []
  let next = 3
  pages.forEach((lines, i) => {
    const pageNum = next
    const contentNum = next + 1
    next += 2
    pageNums.push(pageNum)
    let text = 'BT /F1 11 Tf 50 800 Td 13 TL '
    lines.forEach((line, idx) => {
      text += `(${pdfEscape(line)}) Tj `
      if (idx < lines.length - 1) text += 'T* '
    })
    text += `T* (${pdfEscape(`Page ${i + 1} of ${pages.length}`)}) Tj ET`
    bodies.set(pageNum, ''); // placeholder, finalized below
    bodies.set(contentNum, `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}\nendstream`)
  })
  const fontNum = next
  bodies.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
  bodies.set(2, `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  pages.forEach((_, i) => {
    const pageNum = pageNums[i] as number
    const contentNum = pageNum + 1
    bodies.set(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNum} 0 R >>`,
    )
  })
  bodies.set(fontNum, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const ordered = [...bodies.entries()].sort((a, b) => a[0] - b[0])
  const fixed = ordered.map(([, body]) => body)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  fixed.forEach((body, idx) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${ordered[idx][0]} 0 obj\n${body}\nendobj\n`
  })
  const xrefAt = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${fixed.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${fixed.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}
