import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { PGlite } from '../../assets/pglite/index.js'
import * as json from '../../assets/jsonpruefung.js'
import * as regal from '../../assets/regal.js'
import * as deploy from '../../assets/deploy.js'
import { dbAuftrag, pruefeSql } from '../../assets/sqlpruefung.js'

const root = process.env.HOTEL_LAB_SOURCE || fileURLToPath(new URL('../../', import.meta.url))
const lies = path => readFileSync(join(root, path), 'utf8')
const daten = lab => JSON.parse(lies(`data/uebungen/${lab}.json`))

function browser (t, html = '<div data-fortschritt></div>') {
  const dom = new JSDOM(html, { url: 'http://localhost/Hotel-Lab/', runScripts: 'outside-only' })
  t.after(() => dom.window.close())
  const w = dom.window
  Object.assign(w, {
    Blob: globalThis.Blob,
    pruefeJson: json.pruefeJson,
    AGGREGATE: regal.AGGREGATE, regalErgebnis: regal.ergebnis,
    regalDarstellung: regal.darstellung, regalAbweichungen: regal.abweichungen,
    ...deploy, dbAuftrag, pruefeSql,
    matchMedia: () => ({ matches: true }),
    fetch: async adresse => {
      const text = lies(decodeURIComponent(new URL(adresse).pathname).replace('/Hotel-Lab/', ''))
      return { ok: true, json: async () => JSON.parse(text), text: async () => text }
    }
  })
  const quelle = lies('assets/hotel.js')
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '')
    .replaceAll('import.meta.url', JSON.stringify('http://localhost/Hotel-Lab/assets/hotel.js'))
    .replace(/if \(document.readyState === 'loading'\)[\s\S]*$/, '')
  w.eval(quelle + '\nwindow.testHandle = h => { dbVersprechen.postgres = Promise.resolve(h); };')
  return w
}

let pg
before(async () => { pg = await PGlite.create() })
after(async () => { await pg.close() })
async function saeeKlein (h) {
  await h.db.exec('ROLLBACK; DROP TABLE IF EXISTS probe; CREATE TABLE probe (id int); INSERT INTO probe VALUES (1), (2);')
  h.gesaet = true
  h.veraendert = false
}
const pause = () => new Promise(resolve => setImmediate(resolve))
async function fertig (bedingung) {
  const ende = Date.now() + 10000
  while (!bedingung()) {
    if (Date.now() > ende) throw new Error('Aktion wurde nicht fertig')
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

function sqlBox (w, uebung = {}) {
  const box = w.baueBox({
    id: 'W04-03', typ: 'sql', titel: 'SQL', aufgabe: 'Prüfen',
    loesung: 'SELECT count(*) FROM probe', ...uebung
  }, { lab: 'lab-04', fortschritt: {} })
  w.document.body.append(box)
  return { box, eingabe: box.querySelector('textarea'), check: box.querySelector('button.primary'),
    run: box.querySelector('.uebung-aktionen button'), meldung: box.querySelector('.uebung-status') }
}

test('alle zehn Seiten bauen ihre insgesamt 48 Übungen', async t => {
  const seiten = ['fallstudie', 'datenquelle', 'colab', 'notebook', 'sternschema', 'datenbank', 'kennzahlen', 'powerbi', 'dashboard', 'befunde']
  let anzahl = 0
  for (const [i, name] of seiten.entries()) {
    const lab = 'lab-' + String(i).padStart(2, '0')
    const w = browser(t, lies(`${lab}-${name}.html`))
    w.baueDbBand = async () => {}
    await w.starteLab(lab)
    await pause()
    anzahl += w.document.querySelectorAll('[data-uebung] > .uebung').length
  }
  assert.equal(anzahl, 48)
})

test('SQL-Prüfung verwendet nach freien Änderungen wieder den Ausgangsbestand', async t => {
  const w = browser(t), h = { db: pg }
  await saeeKlein(h)
  w.testHandle(h); w.saeen = saeeKlein
  const ui = sqlBox(w)
  ui.eingabe.value = 'DELETE FROM probe'
  ui.run.click(); await fertig(() => !ui.run.disabled)
  ui.eingabe.value = 'SELECT 0'
  ui.check.click(); await fertig(() => !ui.check.disabled)
  assert.ok(ui.meldung.querySelector('.fail'), ui.meldung.textContent)
  assert.equal(w.ladeFortschritt('lab-04')['W04-03'], undefined)
})

for (const sql of [
  'WITH entfernt AS (DELETE FROM probe RETURNING *) SELECT 0',
  'SELECT 1; DELETE FROM probe; SELECT 0'
]) {
  test('schreibende Eingabe verändert nicht ihre eigene Referenz: ' + sql, async t => {
    const w = browser(t), h = { db: pg }
    await saeeKlein(h)
    w.testHandle(h); w.saeen = saeeKlein
    const ui = sqlBox(w)
    ui.eingabe.value = sql
    ui.check.click(); await fertig(() => !ui.check.disabled)
    assert.ok(ui.meldung.querySelector('.fail'), ui.meldung.textContent)
    ui.eingabe.value = 'SELECT count(*) FROM probe'
    ui.check.click(); await fertig(() => !ui.check.disabled)
    assert.ok(ui.meldung.querySelector('.ok'), ui.meldung.textContent)
  })
}

test('SQL-Aufträge laufen vollständig nacheinander; Fehler blockieren die Queue nicht', async () => {
  const h = {}, log = []
  let weiter
  const tor = new Promise(resolve => { weiter = resolve })
  const a = dbAuftrag(h, async () => { log.push('A1'); await tor; log.push('A2'); throw new Error('Test') })
  const fehler = assert.rejects(a, /Test/)
  const b = dbAuftrag(h, async () => log.push('B'))
  await pause()
  assert.deepEqual(log, ['A1'])
  weiter(); await fehler; await b
  assert.deepEqual(log, ['A1', 'A2', 'B'])
})

test('SQL-Prüfung mit Vorbereitung und Kontrollabfrage ist wiederholbar', async t => {
  const w = browser(t), h = { db: pg }
  const u = { vorher: 'DELETE FROM probe WHERE id = 2', loesung: 'INSERT INTO probe VALUES (3)', kontrolle: 'SELECT id FROM probe ORDER BY id' }
  for (let i = 0; i < 2; i++) {
    const r = await dbAuftrag(h, () => pruefeSql(h, u.loesung, u, saeeKlein, w.fuehre))
    assert.equal(w.gleich(r.meinsK, r.soll, true), true)
    assert.deepEqual(r.meinsK.rows, [[1], [3]])
  }
})

test('DB-Initialisierung kann nach einem Ladefehler erneut gestartet werden', async t => {
  const w = browser(t)
  let versuche = 0
  w.ladePGlite = async () => ({ create: async () => { if (++versuche === 1) throw new Error('offline'); return pg } })
  await assert.rejects(w.holeDb(), /offline/)
  assert.equal((await w.holeDb()).db, pg)
  w.holeDb = async () => { throw new Error('offline') }
  const ziel = w.document.createElement('div')
  await w.baueDbBand(ziel, 'postgres')
  assert.equal(ziel.querySelector('button').disabled, false)
})

test('freie JSON-Werkbank verändert den Übungsfortschritt nicht', t => {
  const w = browser(t)
  const box = w.baueBox({ id: 'frei', typ: 'json', titel: 'JSON', aufgabe: '', start: '{}' }, { lab: 'lab-01', fortschritt: {} })
  w.document.body.append(box)
  box.querySelector('button.primary').click()
  assert.deepEqual(Object.keys(w.ladeFortschritt('lab-01')), [])
})

test('beschädigte und veraltete Fortschrittsdaten sind unschädlich', t => {
  const w = browser(t)
  for (const wert of ['null', '[]', '4', '{']) {
    w.localStorage.setItem('hotel:fortschritt:lab-01', wert)
    assert.doesNotThrow(() => w.karteFortschritt('lab-01'))
    assert.deepEqual(Object.keys(w.ladeFortschritt('lab-01')), [])
  }
  w.localStorage.setItem('hotel:fortschritt:lab-01', JSON.stringify({ frei: true, 'W01-01': true, 'W01-02': false, 'W99-01': true }))
  assert.deepEqual(Object.keys(w.ladeFortschritt('lab-01')), ['W01-01'])
})

test('Fortschritt funktioniert in der Sitzung auch ohne localStorage', t => {
  const w = browser(t)
  Object.defineProperty(w, 'localStorage', { get: () => { throw new Error('gesperrt') } })
  w.merkeFortschritt('lab-01', 'W01-01')
  assert.equal(w.ladeFortschritt('lab-01')['W01-01'], true)
  w.loescheFortschritt()
  assert.deepEqual(Object.keys(w.ladeFortschritt('lab-01')), [])
})

test('Fortschritt bleibt bei vollem oder schreibgeschütztem Speicher nutzbar', t => {
  const w = browser(t)
  Object.defineProperty(w, 'localStorage', { value: {
    getItem: () => '{"W01-02":true}',
    setItem: () => { throw new Error('voll') },
    removeItem: () => { throw new Error('gesperrt') }
  } })
  w.merkeFortschritt('lab-01', 'W01-01')
  assert.equal(w.ladeFortschritt('lab-01')['W01-01'], true)
  assert.equal(w.ladeFortschritt('lab-01')['W01-02'], true)
  w.loescheFortschritt()
  assert.deepEqual(Object.keys(w.ladeFortschritt('lab-01')), [])
})

test('Deploy bewertet die Eingaben vom Start des simulierten Laufs', async t => {
  const w = browser(t), timer = []
  w.matchMedia = () => ({ matches: false })
  w.setTimeout = fn => timer.push(fn)
  let fertigMit
  const ziel = w.document.createElement('div')
  const ui = w.baueDeploy(ziel, {
    repo: { dateien: { Dockerfile: 'FROM python' }, liest: ['DATABASE_URL'] },
    start: { runtime: 'docker', env: [{ name: 'DATABASE_URL', value: 'original' }] },
    beiErgebnis: e => { fertigMit = e }
  })
  ziel.querySelector('button.primary').click()
  ui.eingaben.env[0].value = 'geändert'
  for (let i = 0; i < 100 && !fertigMit; i++) { timer.shift()?.(); await pause() }
  assert.equal(fertigMit.env[0].value, 'original')
})

const felder = [{ id: 'hotel', typ: 'dimension' }, { id: 'jahr', typ: 'dimension' }, { id: 'adr', typ: 'kennzahl' }, { id: 'naechte', typ: 'kennzahl' }]
test('Feldsimulator zeigt zusätzliche Kennzahlen und Dimensionen in einer Tabelle', () => {
  assert.equal(regal.darstellung(felder, { spalten: ['hotel'], zeilen: ['adr', 'naechte'] }), 'tabelle')
  assert.equal(regal.darstellung(felder, { spalten: ['hotel', 'jahr'], zeilen: ['adr'] }), 'tabelle')
  assert.equal(regal.darstellung(felder, { spalten: ['hotel'], zeilen: ['adr'], farbe: 'jahr' }), 'balken')
})

test('negative Kennzahlen bleiben im Feldsimulator sichtbar', async t => {
  const w = browser(t), ziel = w.document.createElement('div')
  w.baueRegal(ziel, { felder, datenQuelle: [{ hotel: 'Resort', adr: -6.38 }], start: { spalten: ['hotel'], zeilen: ['adr'] } })
  await pause()
  assert.ok(ziel.querySelector('table'))
  assert.match(ziel.textContent, /-6\.38/)
})

test('COUNT einer Spalte lässt NULL aus', () => {
  const r = regal.ergebnis([{ adr: 0 }, { adr: null }, { adr: 100 }], felder, { zeilen: [{ feld: 'adr', agg: 'COUNT' }] })
  assert.equal(r.zeilen[0].werte['COUNT(adr)'], 2)
})

test('JSON Pointer unterscheidet Wurzel, leeren Schlüssel und Array-Indizes', () => {
  const wert = { '': 'leer', 'a/b': ['a', 'b'] }
  assert.equal(json.zeiger(wert, ''), wert)
  assert.equal(json.zeiger(wert, '/'), 'leer')
  assert.equal(json.zeiger(wert, '/a~1b/1'), 'b')
  assert.equal(json.zeiger(wert, '/a~1b/01'), undefined)
})

test('JSON-Regeln weisen unpassende Typen zurück statt abzustürzen oder zu bestehen', () => {
  assert.equal(json.pruefeJson('null', { regeln: [{ pfad: '', laenge: 0 }] }).ok, false)
  assert.equal(json.pruefeJson('{}', { regeln: [{ pfad: '', jedes: [{ typ: 'number' }] }] }).ok, false)
  assert.equal(json.pruefeJson('{}', { regeln: [{ pfad: '', schluessel: ['toString'] }] }).ok, false)
})

test('Browser-Reset lädt alle Buchungen nach abgebrochener Transaktion und eigenen Schemata', async t => {
  const w = browser(t), h = { db: pg, gesaet: true, veraendert: true }
  await pg.exec('CREATE SCHEMA "eigen""es"; BEGIN;')
  await assert.rejects(pg.query('SELECT 1 / 0'), /division by zero/)
  await dbAuftrag(h, () => w.saeen(h))
  assert.equal(h.gesaet, true)
  assert.equal(h.veraendert, false)
  assert.equal((await pg.query('SELECT count(*) FROM fact_bookings')).rows[0].count, 119390)
  assert.equal((await pg.query('SELECT count(*) FROM pg_namespace WHERE nspname = $1', ['eigen"es'])).rows[0].count, 0)
})
