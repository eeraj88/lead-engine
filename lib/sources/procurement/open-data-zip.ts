/**
 * open-data-zip.ts
 *
 * Extracts ProcurementNotice records from Bekanntmachungsservice ZIP exports.
 * Supports CSV and OCDS-JSON formats. eForms (XML) is a TODO.
 *
 * Uses fflate for ZIP decompression (pure-JS, no native bindings).
 */

import { unzipSync } from 'fflate'
import {
  normalizeOcdsNotice,
  normalizeCsvNotice,
  type OpenDataFormat,
} from './open-data-adapter'
import type { ProcurementNotice } from './types'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract ProcurementNotice[] from a ZIP buffer returned by fetchOpenDataExport().
 *
 * @param buffer  ArrayBuffer from the HTTP response
 * @param format  'csv' | 'ocds' | 'eforms'
 * @param fetchedAt  Timestamp to stamp all notices with (defaults to now)
 */
export function extractZipNotices(
  buffer: ArrayBuffer,
  format: OpenDataFormat,
  fetchedAt = new Date()
): ProcurementNotice[] {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch (err) {
    throw new Error(`ZIP extraction failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (format === 'csv') return extractCsvNotices(files, fetchedAt)
  if (format === 'ocds') return extractOcdsNotices(files, fetchedAt)
  // eForms (XML) — not yet implemented
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV extraction

function extractCsvNotices(
  files: Record<string, Uint8Array>,
  fetchedAt: Date
): ProcurementNotice[] {
  const decoder = new TextDecoder('utf-8')

  // Find main notices file and optional classifications file
  const noticesKey = Object.keys(files).find(
    (k) => k.endsWith('notices.csv') || k.toLowerCase() === 'notices.csv'
  )
  const classKey = Object.keys(files).find(
    (k) => k.endsWith('classifications.csv') || k.toLowerCase() === 'classifications.csv'
  )

  if (!noticesKey) {
    // Try any .csv file
    const fallback = Object.keys(files).find((k) => k.endsWith('.csv'))
    if (!fallback) return []
    const rows = parseCSV(decoder.decode(files[fallback]))
    return rows.map((row) => normalizeCsvNotice(row, {}, fetchedAt))
  }

  const noticeRows = parseCSV(decoder.decode(files[noticesKey]))
  const classifications = classKey
    ? parseCSV(decoder.decode(files[classKey]))
    : []

  const notices: ProcurementNotice[] = []
  for (const row of noticeRows) {
    try {
      notices.push(normalizeCsvNotice(row, { classifications }, fetchedAt))
    } catch {
      // Skip malformed rows
    }
  }
  return notices
}

// ─────────────────────────────────────────────────────────────────────────────
// OCDS-JSON extraction

function extractOcdsNotices(
  files: Record<string, Uint8Array>,
  fetchedAt: Date
): ProcurementNotice[] {
  const decoder = new TextDecoder('utf-8')
  const notices: ProcurementNotice[] = []

  for (const [filename, data] of Object.entries(files)) {
    if (!filename.endsWith('.json') && !filename.endsWith('.jsonl')) continue
    try {
      const text = decoder.decode(data)

      // JSONL: one JSON object per line
      if (filename.endsWith('.jsonl')) {
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const item = JSON.parse(trimmed)
            notices.push(normalizeOcdsNotice(item, fetchedAt))
          } catch { /* skip bad line */ }
        }
        continue
      }

      // JSON: array or OCDS release package
      const json: unknown = JSON.parse(text)
      const items: unknown[] = Array.isArray(json)
        ? json
        : (json as Record<string, unknown>).releases
          ? ((json as Record<string, unknown>).releases as unknown[])
          : (json as Record<string, unknown>).records
            ? ((json as Record<string, unknown>).records as unknown[])
            : [json]

      for (const item of items) {
        try {
          notices.push(normalizeOcdsNotice(item, fetchedAt))
        } catch { /* skip malformed record */ }
      }
    } catch { /* skip unreadable file */ }
  }

  return notices
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure-JS CSV parser — no dependencies

/**
 * Parse a CSV string into an array of objects keyed by header row.
 * Handles: quoted fields, escaped double-quotes (""), CRLF/LF, UTF-8 BOM.
 */
export function parseCSV(text: string): Record<string, string>[] {
  // Strip BOM
  const content = text.startsWith('﻿') ? text.slice(1) : text
  const lines = splitCsvLines(content)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  return rows
}

/** Split on CRLF or LF, respecting quoted fields that may contain newlines. */
function splitCsvLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if (!inQuotes && (char === '\n' || (char === '\r' && text[i + 1] === '\n'))) {
      if (char === '\r') i++ // skip \n after \r
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Parse a single CSV line into field values. Handles RFC 4180 quoting. */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
