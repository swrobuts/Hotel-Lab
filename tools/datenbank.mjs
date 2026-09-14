/**
 * Hotel-Lab · Datenbank ohne Browser
 *
 * Startet PGlite in Node und laedt dasselbe Sternschema wie die Seite:
 * data/schema.sql plus die neun CSV-Dateien per COPY. Gedacht fuer den
 * Abnahmelauf (tools/verify.mjs) und fuer tools/sql.mjs.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..')
export const TABELLEN = ['dim_hotel', 'dim_date', 'dim_market_segment', 'dim_distribution_channel',
  'dim_customer_type', 'dim_meal', 'dim_deposit_type', 'dim_country', 'fact_bookings']

/** Liefert eine geladene Datenbank; der Suchpfad steht auf hotel_bi. */
export async function hotelDatenbank () {
  const { PGlite } = await import(new URL('../assets/pglite/index.js', import.meta.url))
  const db = await PGlite.create()
  await db.exec(readFileSync(join(WURZEL, 'data/schema.sql'), 'utf8'))
  for (const tabelle of TABELLEN) {
    const csv = readFileSync(join(WURZEL, `data/${tabelle}.csv`), 'utf8')
    const kopf = csv.slice(0, csv.indexOf('\n')).trim()
    await db.query(`COPY hotel_bi.${tabelle} (${kopf}) FROM '/dev/blob' WITH (FORMAT csv, HEADER true)`, [], { blob: new Blob([csv]) })
  }
  await db.exec('SET search_path TO hotel_bi, public')
  return db
}

/** Fuehrt SQL aus und liefert { spalten, zeilen } des letzten Ergebnisses mit Spalten. */
export async function abfrage (db, sql) {
  const teile = await db.exec(sql, { rowMode: 'array' })
  const letzte = [...teile].reverse().find(t => t.fields && t.fields.length) || { fields: [], rows: [] }
  return { spalten: letzte.fields.map(f => f.name), zeilen: letzte.rows }
}
