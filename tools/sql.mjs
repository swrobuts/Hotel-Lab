/**
 * Hotel-Lab · SQL ohne Browser ausprobieren
 *
 *   node tools/sql.mjs "SELECT count(*) FROM fact_bookings"
 *   node tools/sql.mjs --datei abfrage.sql
 *
 * Laesst dieselben Daten wie im Browser laufen (PGlite mit dem Sternschema
 * hotel_bi) und druckt das Ergebnis. Gedacht, um Musterloesungen zu pruefen,
 * bevor sie in eine Uebung wandern.
 */
import { readFileSync } from 'node:fs'
import { hotelDatenbank, abfrage } from './datenbank.mjs'

const rest = process.argv.slice(2)
if (!rest.length) {
  console.error('Aufruf: node tools/sql.mjs "SQL" | --datei pfad')
  process.exit(2)
}
const sql = rest[0] === '--datei' ? readFileSync(rest[1], 'utf8') : rest.join(' ')
const db = await hotelDatenbank()
const r = await abfrage(db, sql)
await db.close()
if (!r.spalten.length) { console.log('(keine Tabelle)'); process.exit(0) }
console.log(r.spalten.join(' | '))
for (const z of r.zeilen.slice(0, 50)) console.log(z.map(v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).join(' | '))
console.log(`-- ${r.zeilen.length} Zeilen`)
