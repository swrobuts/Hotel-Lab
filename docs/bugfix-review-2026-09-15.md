# Bugprüfung vom 15. September 2026

Ausgangsstand: `848cbd3f8d907b7ed99865411384693e7e002bd4` auf `main`.
GitHub und das lokale Repository unter `C:\Users\rober\OneDrive\Vorlesungen\Lernumgebungen\Hotel-Lab`
waren zu Beginn identisch; der lokale Arbeitsbaum war sauber.

## Behobene Fehler

| Bereich | Fehler und Korrektur |
|---|---|
| SQL-Bewertung | Freie Änderungen, schreibende CTEs und mehrere SQL-Anweisungen konnten den Datenbestand verändern, auf dem anschließend die Referenz berechnet wurde. Falsche Antworten bestanden dadurch die Prüfung. Die Referenz wird jetzt vor der Eingabe auf dem Ausgangsbestand berechnet; nach eigenen SQL-Ausführungen wird vor der nächsten Prüfung neu geladen. Vorbereitung und Kontrollabfrage erhalten getrennt vorbereitete Bestände. |
| Gleichzeitige SQL-Aktionen | Initialisierung, Zurücksetzen und Aktionen verschiedener Übungsboxen konnten ineinandergreifen. Eine gemeinsame Warteschlange hält vollständige Aktionen zusammen und arbeitet nach Fehlern weiter. |
| Datenbank-Wiederherstellung | Eine abgebrochene explizite Transaktion blockierte das Zurücksetzen. Ein ROLLBACK stellt die Arbeitsfähigkeit wieder her; Anführungszeichen in selbst angelegten Schemanamen werden beim Entfernen korrekt behandelt. Fehlgeschlagene Initialisierungen können erneut versucht werden. |
| Lernfortschritt | Die freie JSON-Werkbank zählte als zusätzliche gelöste Übung. Ungültige gespeicherte Werte konnten die Fortschrittsanzeige abbrechen lassen. Nur gültige erledigte Übungskennungen zählen; ohne nutzbaren Speicher funktioniert der Fortschritt innerhalb der Sitzung. |
| Deploy-Simulator | Während der Animation bearbeitete Umgebungsvariablen konnten nachträglich die Bewertung verändern. Bewertet wird jetzt eine Kopie der Eingaben zum Start des Laufs. |
| Feldsimulator | Mehrere Kennzahlen oder Achsendimensionen wurden teilweise still ausgelassen; negative Werte erzeugten ungültige SVG-Abmessungen. Diese Belegungen werden vollständig als Tabelle dargestellt. COUNT einer Spalte zählt keine NULL-Werte mehr. |
| JSON-Prüfung | Der Pointer `/` verwechselt einen leeren Schlüssel nicht mehr mit der Dokumentwurzel. Ungültige Array-Indizes und unpassende Regeltypen werden zurückgewiesen; Längenregeln auf NULL führen nicht mehr zum Absturz. Pflichtschlüssel müssen eigene Objekteigenschaften sein. |
| Windows-Werkzeuge | Der PGlite-Import mit einem Windows-Dateipfad scheiterte an `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Er verwendet jetzt eine Datei-URL. Das neue Paketmanifest deklariert ES-Module und reproduzierbare Testbefehle für Node.js ab Version 20. |

## Validierung

- `npm test`: **18 Tests bestanden**, einschließlich Aufbau aller 48 Übungen in zehn Seiten,
  realer SQL-Ausführung mit dem gebündelten PGlite sowie Wiederherstellung aller 119.390 Buchungen
  nach einem Transaktionsfehler und einem selbst angelegten Schema mit Anführungszeichen.
- `node tools/verify.mjs`: **843 Zusicherungen, 0 Fehler**, einschließlich aller SQL-Musterlösungen
  auf dem vollständigen Sternschema. Abschließende Läufe unter Windows mit Node.js 20.12.0.
- Elf gezielt ausgewählte Laufzeit-Regressionstests gegen das unveränderte `hotel.js` des
  Ausgangsstands scheiterten erwartungsgemäß; dieselben Fälle bestehen mit den Fixes.
- Lokale HTML-Verweise und Anker geprüft: keine fehlenden Ziele.
- Alle neun CSV-Dateien sind bytegleich mit dem geprüften Hotel-Projekt. Die zwei dort ergänzten
  Quellenkommentarzeilen wurden auch in `data/schema.sql` übernommen; die Schema-Definitionen
  waren bereits identisch.
- `git diff --check`: keine Whitespace-Fehler.

Die DOM-Tests verwenden jsdom und die echte PGlite-Engine; sie ersetzen keine visuelle Abnahme
in verschiedenen Browsern. Die konservative Wiederherstellung vor erneuter SQL-Prüfung benötigt
einige Sekunden. Beim freien Ausführen bleiben eigene Änderungen bis zum Zurücksetzen oder zur
nächsten Prüfung erhalten. Die Seite bleibt statisch und benötigt keinen Build-Schritt.
