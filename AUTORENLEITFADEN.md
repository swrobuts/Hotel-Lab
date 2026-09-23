# Hotel-Lab · Leitfaden für Lab-Autoren

Das Hotel-Lab folgt dem Autorenleitfaden von WInf-SP (`../WInf-SP/tools/AUTORENLEITFADEN.md`):
Dramaturgie je Lab, Befehlskarten, Übungstypen, Nachbildungen mit Ziffern, `verify.mjs` nach
jeder Änderung. Dieser Text hält nur fest, worin das Hotel-Lab davon abweicht.

## Abweichungen von WInf-SP

* **Nur Deutsch.** Keine `lang="en"`-Spans, JSON-Texte nur `de`, kein Sprachumschalter.
* **Echte Daten.** Das Sternschema `hotel_bi` mit allen 119.390 Buchungen in PGlite; keine
  synthetische Fallstudie. Kontrollzahlen: 119.390 Buchungen, Stornoquote 37,0 %, Umsatz
  25.996.260 €, gebuchter Umsatz 42.723.498 €.
* **Screenshots in Lab 07.** Power BI und Tableau werden an echten Screenshots gezeigt
  (`assets/img/`), weil dort die Reihenfolge der Handgriffe in zwei Oberflächen das Lernziel ist.
  Alle anderen Labs bleiben bei Nachbildungen. Screenshots: `<figure class="abbildung">` mit
  `alt`, `width`, `height` und `<figcaption>`; Dialoge mit Klasse `schmal`, Einzelbereiche mit
  `mittel`; Breite höchstens 1400 px, PNG mit 256 Farben (zusammen unter 1,5 MB).
* **Starterpaket.** Referenzlösungen liegen unter `starter/` (Hotel.pbix, Hotel_pbip.zip,
  Hotel_Dashboard.twbx) und werden aus dem Projekt-Repo `swrobuts/hotel` übernommen, nicht hier
  gepflegt.
* **Feldbereich-Simulator** (`data-regal`, Varianten `powerbi` und `tableau`) mit der flachen
  Stichprobe `data/regal-buchungen.json`; die Werte tragen die Klarnamen des Dashboards.

## Begriffe

Englische Fachbegriffe bleiben englisch, deutsche Erklärung daneben. Verbindlich:

| so | nicht so |
|---|---|
| Shelf, Shelves (Tableau: Columns, Rows, Marks) | Regal, Ablage |
| Field Well, Field Wells (Power BI) | Feldfenster |
| Feldbereich (nachgebildeter Simulator beider Werkzeuge) | Regal-Simulator |
| Sandbox | Spielplatz |
| Measure, DAX, berechnetes Feld, LOD-Ausdruck | Maß, Kennzahlformel |
| Image, Container, Volume, Branch, Commit, Repository | Abbild, Band, Zweig |
| Runtime (Render), Root Directory, Build Command, Start Command, Web Service | Laufzeit (bei Render), Wurzelverzeichnis |
| Cache, Fallback, Badge, Screenshot, Deploy, Deployment | Zwischenspeicher, Rückfall, Bildmarke, Bildschirmfoto, Bereitstellen |
| Anzahlungsart (deposit_type) | Kautionstyp, Kaution |
| City Hotel, Resort Hotel (Namen der Häuser) | Stadthotel, Ferienhotel |

Deutsche Wörter, die die Werkzeuge selbst verwenden, sind erlaubt: Laufzeit und Kernel (Colab),
Arbeitsblatt, Kennzahl, Dimension (Tableau), Datenbereich, Modellansicht (Power BI), Sicht,
Zeichenkette, Eingabeaufforderung.

Datenwerte bleiben, wie die Datenbank sie liefert (Online TA, No Deposit, Transient); wo das
Dashboard Klarnamen zeigt (Reisebüro online, Ohne Anzahlung), steht das dabei.

## Text

Jeder Satz trägt eine Zahl, einen Mechanismus, einen Akteur oder eine prüfbare Behauptung.
Gestrichen werden Rahmensätze („Die Reihenfolge ist wichtiger, als sie aussieht“),
Wichtigkeitsbehauptungen („ebenso wichtig“, „verdient eine Bemerkung“), Bildbeschreibungen
(„Die Abbildung zeigt“) und Verneinungsfiguren („kein Mangel, sondern Absicht“). Zahlen im Text
werden gegen die Daten gerechnet; für Lab 07 mit `tools/sollwerte_dashboard.py` im Projekt-Repo.
Namen der Vordenker (Tufte, Few, Bissantz, Hichert) nur in Lab 08, wo sie als Quellen der
Gestaltungsregeln genannt werden; sonst nur die Regeln.

## Prüfen vor der Abgabe

```bash
node tools/verify.mjs 2>/dev/null | grep -E "FEHL|Zusicherungen"   # Struktur, Texte, Übungen
node tools/links.mjs                                               # externe Adressen, je Semester
grep -rnoiE "Regal\w*|Spielplatz|Feldfenster|Kaution\w*|Abbild\b|Bildschirmfoto" *.html data/uebungen
```
