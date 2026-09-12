/**
 * Hotel-Lab · Abnahmelauf
 *
 * Prueft ohne Browser, was sich ohne Browser pruefen laesst:
 *
 *   1. Struktur  - Platzhalter und JSON deckungsgleich, jeder Text vorhanden,
 *                  Antwortindizes im Bereich, Zuordnungsziele vorhanden;
 *                  JSON-, Reihenfolge-, Regal- und Deploy-Uebungen sind mit
 *                  ihrer hinterlegten Loesung loesbar; die Zahlen in LABS stimmen.
 *   2. SQL       - jede Musterloesung laeuft auf dem Sternschema hotel_bi
 *                  (PGlite) und liefert Zeilen; Kontrollabfragen laufen.
 *
 * Aufruf:  node tools/verify.mjs          (ohne SQL-Lauf: --ohne-sql)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pruefeJson } from '../assets/jsonpruefung.js'
import { abweichungen as regalAbweichungen, ergebnis as regalErgebnis } from '../assets/regal.js'
import { simuliereDeploy, deployErfuellt } from '../assets/deploy.js'
import { WURZEL, hotelDatenbank, abfrage } from './datenbank.mjs'

const lies = (p) => readFileSync(join(WURZEL, p), 'utf8')
const liesJson = (p) => JSON.parse(lies(p))

let fehler = 0
let geprueft = 0
const gut = (bedingung, was, zusatz = '') => {
  geprueft++
  if (bedingung) return true
  fehler++
  console.log(`  FEHL  ${was}${zusatz ? '  — ' + zusatz : ''}`)
  return false
}
const abschnitt = (titel) => console.log('\n' + titel + '\n' + '-'.repeat(titel.length))
const text = (t) => typeof t === 'string' ? t.length > 0 : !!t?.de

/* ========================================================== 1. Struktur */

abschnitt('1. Struktur')

const HTML_ZU_LAB = {}
for (const f of readdirSync(WURZEL).filter(n => /^lab-\d\d-.*\.html$/.test(n))) {
  HTML_ZU_LAB['lab-' + f.slice(4, 6)] = f
}

const labsQuelle = lies('assets/hotel.js')
const labBlock = labsQuelle.match(/const LABS = \[[\s\S]*?\n\]/)[0]
const erwartet = Object.fromEntries(
  [...labBlock.matchAll(/id: '(lab-\d\d)'[\s\S]*?datei: '([^']+)'[\s\S]*?uebungen: (\d+)/g)].map(m => [m[1], { datei: m[2], uebungen: Number(m[3]) }]))
for (const [lab, e] of Object.entries(erwartet)) {
  gut(HTML_ZU_LAB[lab] === e.datei, `${lab}: LABS nennt ${e.datei}, gefunden ${HTML_ZU_LAB[lab] || 'nichts'}`)
}

const LABS = {}
for (const [lab, htmlDatei] of Object.entries(HTML_ZU_LAB).sort()) {
  const html = lies(htmlDatei)
  gut(existsSync(join(WURZEL, `data/uebungen/${lab}.json`)), `${lab}: data/uebungen/${lab}.json vorhanden`)
  if (!existsSync(join(WURZEL, `data/uebungen/${lab}.json`))) continue
  const d = liesJson(`data/uebungen/${lab}.json`)
  LABS[lab] = d
  const phU = new Set([...html.matchAll(/data-uebung="([^"]+)"/g)].map(m => m[1]))
  const phB = new Set([...html.matchAll(/data-befehl="([^"]+)"/g)].map(m => m[1]))
  const jsU = new Set(d.uebungen.map(u => u.id))
  const jsB = new Set(Object.keys(d.befehle || {}))
  const gleich = (a, b) => a.size === b.size && [...a].every(x => b.has(x))

  gut(gleich(phU, jsU), `${lab}: Übungsplatzhalter und JSON deckungsgleich`,
    `nur im HTML ${[...phU].filter(x => !jsU.has(x))}, nur im JSON ${[...jsU].filter(x => !phU.has(x))}`)
  gut(gleich(phB, jsB), `${lab}: Befehlskarten deckungsgleich`,
    `nur im HTML ${[...phB].filter(x => !jsB.has(x))}, nur im JSON ${[...jsB].filter(x => !phB.has(x))}`)
  gut(erwartet[lab]?.uebungen === jsU.size, `${lab}: LABS nennt ${erwartet[lab]?.uebungen}, JSON hat ${jsU.size} Übungen`)
  gut(!/lang="en"/.test(html), `${lab}: keine englischen Spans (Hotel-Lab ist einsprachig)`)

  for (const u of d.uebungen) {
    for (const feld of ['titel', 'aufgabe']) gut(text(u[feld]), `${u.id}: ${feld} vorhanden`)
    for (const [i, f] of (u.fragen || []).entries()) {
      gut(text(f.frage), `${u.id} Frage ${i + 1}: Fragetext vorhanden`)
      gut(f.optionen.every(text), `${u.id} Frage ${i + 1}: Antworten vorhanden`)
      gut(text(f.erklaerung), `${u.id} Frage ${i + 1}: Erklärung vorhanden`)
      gut(Math.max(...f.richtig) < f.optionen.length, `${u.id} Frage ${i + 1}: Antwortindex im Bereich`)
      gut(f.richtig.length === 1 || f.mehrfach === true,
        `${u.id} Frage ${i + 1}: Mehrfachauswahl ist als solche gekennzeichnet`)
    }
    const ziele = new Set((u.ziele || []).map(z => z.id))
    for (const p of u.paare || []) gut(ziele.has(p.ziel), `${u.id}: Zuordnungsziel ${p.ziel} existiert`)
    gut(['quiz', 'zuordnen', 'checkliste', 'sql', 'json', 'reihenfolge', 'regal', 'deploy'].includes(u.typ),
      `${u.id}: Typ ${u.typ} ist bekannt`)
    if (u.typ === 'checkliste') gut((u.schritte || []).length >= 3, `${u.id}: Checkliste hat mindestens drei Schritte`)
    if (u.typ === 'sql') {
      gut(!!u.loesung, `${u.id}: SQL-Übung hat eine Musterlösung`)
      gut(text(u.hinweis), `${u.id}: SQL-Übung hat einen Hinweis`)
    }
    if (u.typ === 'json') {
      gut(!!u.loesung, `${u.id}: JSON-Übung hat eine Musterlösung`)
      const r = u.loesung ? pruefeJson(u.loesung, u) : { ok: false, meldung: 'keine Lösung' }
      gut(r.ok, `${u.id}: Musterlösung besteht die eigene Prüfung`, r.meldung || (r.befunde || []).map(b => b.pfad + ': ' + b.text.de).join('; '))
      if (u.start) {
        const s = pruefeJson(u.start, u)
        gut(!s.ok, `${u.id}: der Starttext ist noch nicht die Lösung`)
      }
      gut(u.erwartet !== undefined || (u.regeln || []).length > 0, `${u.id}: hat erwartet oder regeln`)
    }
    if (u.typ === 'reihenfolge') {
      const ids = new Set((u.eintraege || []).map(e => e.id))
      gut(ids.size === (u.eintraege || []).length && ids.size >= 3, `${u.id}: Einträge mit eindeutigen Kennungen`)
      gut((u.richtig || []).length === ids.size && u.richtig.every(x => ids.has(x)), `${u.id}: richtig nennt jede Kennung genau einmal`)
      const start = u.start || [...(u.eintraege || [])].map(e => e.id).reverse()
      gut(start.length === ids.size && start.every(x => ids.has(x)), `${u.id}: Startreihenfolge ist vollständig`)
      gut(JSON.stringify(start) !== JSON.stringify(u.richtig), `${u.id}: Startreihenfolge ist nicht schon die Lösung`)
      gut((u.eintraege || []).every(e => text(e.text)), `${u.id}: Einträge mit Text`)
    }
    if (u.typ === 'regal') {
      const felder = u.felder || d.regal?.felder || []
      gut(felder.length > 0, `${u.id}: Felder vorhanden`)
      gut(felder.every(f => f.id && text(f.titel) && ['dimension', 'kennzahl'].includes(f.typ)), `${u.id}: Felder vollständig (id, titel, typ)`)
      const ids = new Set(felder.map(f => f.id))
      const genannt = [...(u.ziel?.spalten || []), ...(u.ziel?.zeilen || [])].map(s => s.includes(':') ? s.split(':')[1] : s)
      if (u.ziel?.farbe) genannt.push(u.ziel.farbe)
      for (const f of Object.keys(u.ziel?.filter || {})) genannt.push(f)
      gut(genannt.every(f => ids.has(f)), `${u.id}: Ziel nennt nur bekannte Felder`, genannt.filter(f => !ids.has(f)).join(', '))
      gut(!!u.loesungBelegung, `${u.id}: Regal-Übung hat eine loesungBelegung`)
      if (u.loesungBelegung) {
        const abw = regalAbweichungen(u.loesungBelegung, u.ziel || {})
        gut(abw.length === 0, `${u.id}: loesungBelegung erfüllt das Ziel`, abw.map(a => a.text.de).join('; '))
        const leer = regalAbweichungen({ spalten: [], zeilen: [], farbe: null, filter: {} }, u.ziel || {})
        gut(leer.length > 0, `${u.id}: die leere Belegung erfüllt das Ziel nicht`)
        const daten = liesJson(u.daten || d.regal?.daten || 'data/regal-buchungen.json')
        const erg = regalErgebnis(daten, felder, u.loesungBelegung)
        gut(erg.zeilen.length > 0, `${u.id}: die Lösung liefert Zeilen auf den Daten`)
      }
    }
    if (u.typ === 'deploy') {
      const repo = u.repo || d.repo
      gut(!!repo && Object.keys(repo.dateien || {}).length > 0, `${u.id}: Repository mit Dateien vorhanden`)
      gut(!!u.soll, `${u.id}: Deploy-Übung hat ein soll`)
      for (const k of ['build', 'start']) {
        if (u.soll?.[k]) { let ok = true; try { new RegExp(u.soll[k]) } catch { ok = false } gut(ok, `${u.id}: soll.${k} ist ein gültiger Ausdruck`) }
      }
      gut(!!u.loesungEingaben, `${u.id}: Deploy-Übung hat loesungEingaben`)
      if (u.loesungEingaben && repo) {
        const r = simuliereDeploy(u.loesungEingaben, repo)
        gut(r.erfolg && deployErfuellt(u.loesungEingaben, r, u.soll || {}), `${u.id}: loesungEingaben führen zum Erfolg`, r.zeilen.slice(-3).map(z => z.text).join(' | '))
        if (u.startEingaben) {
          const s = simuliereDeploy(u.startEingaben, repo)
          gut(!(s.erfolg && deployErfuellt(u.startEingaben, s, u.soll || {})), `${u.id}: die Starteingaben sind noch nicht die Lösung`)
        }
      }
    }
  }
  for (const [id, b] of Object.entries(d.befehle || {})) {
    gut(text(b.titel), `${lab}/${id}: Titel vorhanden`)
    gut(!!(b.befehl || b.varianten), `${lab}/${id}: hat einen Befehl`)
    const teile = b.teile || Object.values(b.varianten || {}).flatMap(v => v.teile || [])
    gut(teile.every(t => text(t.bedeutet)), `${lab}/${id}: Erläuterungen vorhanden`)
  }
}

// Jede in einer Seite verlinkte Kopiervorlage muss existieren; Kopf und Nummern muessen stimmen.
for (const [lab, htmlDatei] of Object.entries(HTML_ZU_LAB)) {
  const html = lies(htmlDatei)
  for (const m of html.matchAll(/href="((?:vorlagen|data)\/[^"]+)"/g)) {
    gut(existsSync(join(WURZEL, m[1])), `${lab}: verlinkte Datei ${m[1]} existiert`)
  }
  gut(!/WInf-SP-Lab|winf\.css|winf\.js|winf:|PITM-Lab|pitm\./.test(html), `${lab}: keine Reste der Vorlage (WInf-SP, PITM)`)
  gut(new RegExp(`data-lab="${lab}"`).test(html), `${lab}: data-lab stimmt`)
  gut(new RegExp(`lab-num-big">${lab.slice(4)}<`).test(html), `${lab}: die große Lab-Nummer im Kopf stimmt`)
  gut(/<div data-einordnung><\/div>/.test(html) && /data-lab-nav/.test(html) && /data-fortschritt/.test(html),
    `${lab}: Einordnung, Fortschritt und Navigation vorhanden`)
  for (const m of html.matchAll(/class="sidebar-link" href="#([^"]+)"/g)) {
    gut(new RegExp(`id="${m[1]}"`).test(html), `${lab}: Abschnitt #${m[1]} existiert`)
  }
  const sqlUebungen = (LABS[lab]?.uebungen || []).filter(u => u.typ === 'sql').length
  gut(!sqlUebungen || /data-datenbank/.test(html), `${lab}: Seite mit SQL-Übungen startet die Datenbank`)
}
gut(!/lang="en"/.test(lies('index.html')), 'index.html: keine englischen Spans')

// Das hidden-Attribut muss jede Komponentenregel ueberstimmen.
const css = lies('assets/hotel.css')
gut(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
  'hotel.css: [hidden] überstimmt eigene display-Regeln (Erledigt-Abzeichen)')
gut(css.indexOf('[hidden]') < css.indexOf('.badge {'), 'hotel.css: die hidden-Regel steht vor den Komponenten')

/* ============================================================== 2. SQL */

if (!process.argv.includes('--ohne-sql')) {
  abschnitt('2. SQL-Musterlösungen auf dem Sternschema')
  const db = await hotelDatenbank()
  const zaehlung = await abfrage(db, 'SELECT count(*) FROM fact_bookings')
  gut(Number(zaehlung.zeilen[0][0]) === 119390, 'Sternschema geladen: 119.390 Buchungen', String(zaehlung.zeilen[0][0]))
  for (const [lab, d] of Object.entries(LABS)) {
    for (const u of d.uebungen.filter(u => u.typ === 'sql')) {
      try {
        if (u.vorher) await abfrage(db, u.vorher)
        const r = await abfrage(db, u.loesung)
        const k = u.kontrolle ? await abfrage(db, u.kontrolle) : r
        gut(k.spalten.length > 0 && k.zeilen.length > 0, `${u.id}: Musterlösung liefert Zeilen`, `${k.spalten.length} Spalten, ${k.zeilen.length} Zeilen`)
        if (u.spalten != null) gut(k.spalten.length === u.spalten, `${u.id}: Musterlösung hat ${u.spalten} Spalten`, `${k.spalten.length}`)
      } catch (e) {
        gut(false, `${u.id}: Musterlösung läuft`, e.message)
      }
    }
  }
  await db.close()
}

/* ============================================================ Ergebnis */

console.log(`\n${geprueft} Zusicherungen, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
