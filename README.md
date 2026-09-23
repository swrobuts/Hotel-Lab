# Hotel-Lab

**Live:** [swrobuts.github.io/Hotel-Lab](https://swrobuts.github.io/Hotel-Lab/)

Interaktive Lernumgebung zum BI-Einstiegsprojekt **Hotel Booking Demand** (Vorlesung Business
Intelligence, THWS Business School). Sie erklärt Schritt für Schritt, was im Projekt
[swrobuts/hotel](https://github.com/swrobuts/hotel) gebaut wurde – Fallstudie, Datenquelle,
Colab-Notebook, Sternschema, PostgreSQL-Datenbank, Kennzahlenkatalog, Power-BI-Bericht und das
[Dashboard](https://hotel.butscher.cloud) – und lässt Studierende jeden Schritt
selbst ausprobieren.

Zehn Labs, **49 Übungen** in acht Formen mit sofortiger Rückmeldung; **PostgreSQL im Browser**
(PGlite) mit dem echten Sternschema `hotel_bi` und allen 119.390 Buchungen, sodass jede
SQL-Übung dieselben Zahlen liefert wie Notebook, Power BI und Dashboard; ein nachgebildeter **Feldbereich**
(Field Wells wie in Power BI, Shelves wie in Tableau) und ein **Deploy-Simulator** nach dem Vorbild von Render.

Die Umgebung ist deutsch (englische Fachbegriffe bleiben englisch) und läuft als statische Seite auf
GitHub Pages: ohne Build-Schritt, ohne Server, ohne Anmeldung. Laufzeit und Formsprache stammen aus
dem [WInf-SP-Lab](https://github.com/swrobuts/WInf-SP); das Lab zu Google Colab ist von dort
übernommen. Leitfarbe Anthrazit, Signalfarbe Kupfer.

---

## Aufbau

```
index.html                    Übersicht mit den zehn Lab-Kacheln und dem Gesamtfortschritt
lab-00-fallstudie.html        Zwei Hotels, vier Fragen, BI-Prozess, Werkzeugkette, Grenzen der Daten   (4 Übungen)
lab-01-datenquelle.html       Antonio et al. 2019, 32 Spalten, Rollen, Eigenheiten, eine Buchung als JSON (5)
lab-02-colab.html             Notebook, Laufzeit, Kernel, Reihenfolge, Secrets (aus WInf-SP)           (5)
lab-03-notebook.html          Die acht Abschnitte des Projekt-Notebooks, Zelle für Zelle              (5)
lab-04-sternschema.html       Fakten, Dimensionen, Schlüssel, Datumsrollen, erste Joins in SQL        (5)
lab-05-datenbank.html         Supabase/PostgreSQL, Rolle studi_hotel, Verbinden, Fehlermeldungen      (5)
lab-06-kennzahlen.html        Katalog, drei Umsatzbegriffe, Zeitbezug, Farbe als Werturteil, SQL      (5)
lab-07-powerbi.html           Dashboard in Power BI und Tableau: Konzept, Measures, Kacheln, Deploy   (6)
lab-08-dashboard.html         FastAPI + Observable Plot, Routen, Gestaltungsregeln, Docker, Render     (5)
lab-09-befunde.html           Aussagen lesen, Abweichungen einordnen, Empfehlungen, Fehlschlüsse      (4)

assets/
  hotel.css                   Gemeinsames Stylesheet: Anthrazit #2E3238, Kupfer #C0662B
  hotel.js                    Laufzeit: LABS, Übungsboxen, Datenbank, Feldbereich- und Deploy-Simulator
  sqlpruefung.js              SQL-Auftragsreihenfolge und Prüfung auf dem Ausgangsbestand
  jsonpruefung.js             Prüfung von JSON-Übungen (JSON Pointer, Regeln)
  regal.js                    Aggregation und Zielprüfung des Feldbereichs
  deploy.js                   Protokoll und Zielprüfung des Deploy-Simulators
  pruefung.js, terminal.js    Teil der Laufzeit (nachgebildete Shell; in diesem Lab nicht verwendet)
  pglite/                     PostgreSQL als WebAssembly (PGlite), lokal statt vom CDN

data/
  schema.sql                  Sternschema hotel_bi (identisch mit sql/01_schema.sql im Projekt)
  fact_bookings.csv, dim_*.csv  die neun Tabellen, identisch mit data/ im Projekt (119.390 Buchungen)
  regal-buchungen.json        Stichprobe von 5.000 Buchungen, flach, für den Feldbereich (Lab 07)
  uebungen/lab-XX.json        Befehlskarten, Übungen, Felder und Repository je Lab

starter/
  Hotel.pbix, Hotel_pbip.zip, Hotel_Dashboard.twbx  Referenzlösungen aus Lab 07 (Power BI und Tableau)

tools/
  verify.mjs                  Abnahmelauf ohne Browser (siehe unten)
  sql.mjs                     SQL gegen das Sternschema auf der Kommandozeile
  datenbank.mjs               PGlite in Node mit demselben Lader wie die Seite
  tests/regression.test.mjs   Regressionstests mit DOM und echtem PGlite
  eindeutschen.py             macht eine zweisprachige WInf-SP-Seite einsprachig deutsch
```

## Acht Übungstypen

| Typ | Was Studierende tun | Wie geprüft wird |
|---|---|---|
| `quiz` | Fragen mit Einfach- oder Mehrfachauswahl | Vergleich mit `richtig`; Erklärung nach der Prüfung |
| `zuordnen` | Begriffe auf Kategorien ziehen | paarweise gegen `ziel` |
| `checkliste` | Schritte an der echten Oberfläche (Colab, DBeaver) abarbeiten | Selbstbestätigung, mit Prüffrage je Schritt |
| `sql` | Abfrage gegen PostgreSQL im Browser | Abfrage und Referenzlösung laufen; Zeilenmengen werden verglichen |
| `json` | JSON schreiben oder reparieren | Parser des Browsers, dann Regeln je JSON Pointer |
| `reihenfolge` | Schritte ordnen | Positionsvergleich |
| `regal` | Felder auf X-Achse, Y-Achse, Legende, Filter legen | Belegung gegen das Ziel: Felder, Aggregation, Filter |
| `deploy` | Das Formular „New Web Service“ ausfüllen und deployen | simuliertes Protokoll; Erfolg und Sollbedingungen |

## Die Datenbank im Browser

Beim Öffnen einer Seite mit SQL-Übungen legt PGlite das Schema aus `data/schema.sql` an und lädt die
neun CSV-Dateien per `COPY … FROM '/dev/blob'` – etwa fünf Sekunden, danach liegen 119.390 Buchungen
im Browser. „Ausführen“ erlaubt das Weiterarbeiten auf eigenen Änderungen. Eine Prüfung startet
nach jeder eigenen SQL-Ausführung wieder auf dem Ausgangsbestand und ermittelt die Referenz vor
der Eingabe. Übungen mit `vorher`/`kontrolle` erhalten für Referenz und Eingabe getrennt vorbereitete
Bestände. SQL-Aktionen und Zurücksetzen laufen nacheinander, auch über mehrere Übungsboxen hinweg.
Das erneute Laden benötigt einige Sekunden. Kennzahlen zum Gegenprüfen: 119.390 Buchungen,
Stornoquote 37,0 %, stornobereinigter Umsatz 25.996.260 €, gebuchter Umsatz 42.723.498 €.

## Nach jeder Änderung prüfen

Node.js ab Version 20; die Tests laufen auch unter Windows. Nur die DOM-Regressionstests benötigen
die Entwicklungsabhängigkeiten. Die veröffentlichte Seite hat weiterhin keinen Build-Schritt.

```bash
npm ci                         # Entwicklungsabhängigkeiten installieren
npm test                       # DOM, SQL-Bewertung, Fortschritt und Simulatoren
node tools/verify.mjs            # Struktur und alle SQL-Musterlösungen (lädt PGlite, ~10 s)
node tools/verify.mjs --ohne-sql # nur Struktur
node tools/sql.mjs "SELECT count(*) FROM fact_bookings"
```

`node tools/links.mjs` ruft die externen Adressen der Labs auf (Tableau Public, Tableau Cloud,
Power-BI-Dienst, Dashboard, Repositories) und meldet, welche nicht mehr antworten – einmal je Semester
laufen lassen. Wie ein Lab geschrieben wird, steht in `AUTORENLEITFADEN.md`.

Der Lauf prüft, dass Platzhalter und JSON deckungsgleich sind, jeder Text vorhanden ist, die
Übungszahlen in `LABS` stimmen, jede JSON-, Reihenfolge-, Feldbereich- und Deploy-Übung mit ihrer
Lösung lösbar ist und ihr Starttext noch nicht, und dass jede SQL-Musterlösung auf dem Sternschema
Zeilen liefert.

## Lokal ausprobieren

```bash
python3 -m http.server 8777
# http://localhost:8777
```

Ein Server ist nötig, weil die Seite Module, JSON, CSV und WebAssembly per `fetch` lädt.

## Veröffentlichen

```bash
gh repo create swrobuts/Hotel-Lab --public --source=. --push
gh api repos/swrobuts/Hotel-Lab/pages -X POST -f source[branch]=main -f source[path]=/
```

`.nojekyll` liegt bei, damit GitHub Pages die Ordner unverändert ausliefert.

## Quellen

Datensatz: Nuno Antonio, Ana de Almeida, Luis Nunes (2019), *Hotel booking demand datasets*,
Data in Brief 22 (Februar 2019), 41–49, doi:10.1016/j.dib.2018.11.126, CC BY 4.0, in der
TidyTuesday-Fassung. Gestaltungsregeln: IBCS SUCCESS, Few, Tufte, Bissantz
(*Bella berät*; „Using business effects as color criteria“). Angaben zu Werkzeugen und Lizenzen
Stand 09/2026.
