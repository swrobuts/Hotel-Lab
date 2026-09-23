// Prueft die externen Adressen aller Labs: HTTP-Status je Link, einmal je Semester laufen lassen.
// Aufruf: node tools/links.mjs   (Exit-Code 1, wenn ein Link nicht antwortet)
import { readFileSync, readdirSync } from 'node:fs'

const seiten = readdirSync('.').filter(f => /^(index|lab-\d\d-.*)\.html$/.test(f))
const links = new Map()
for (const seite of seiten) {
  const html = readFileSync(seite, 'utf8')
  for (const m of html.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1]
    if (!links.has(url)) links.set(url, new Set())
    links.get(url).add(seite)
  }
}

// Seiten mit Anmeldung antworten mit einer Weiterleitung oder 401/403 – das gilt als erreichbar.
const erreichbar = status => status < 400 || status === 401 || status === 403

let fehler = 0
for (const [url, quellen] of [...links].sort()) {
  let status = 'FEHLER'
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Hotel-Lab Linkpruefung' } })
    status = r.status
  } catch (e) { status = e.name === 'TimeoutError' ? 'ZEITLIMIT' : 'FEHLER' }
  const ok = typeof status === 'number' && erreichbar(status)
  if (!ok) fehler++
  console.log(`${ok ? ' ok ' : 'FEHL'}  ${String(status).padEnd(9)} ${url}   [${[...quellen].join(', ')}]`)
}
console.log(`\n${links.size} Adressen, ${fehler} nicht erreichbar`)
process.exit(fehler ? 1 : 0)
