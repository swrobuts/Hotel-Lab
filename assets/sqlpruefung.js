/** Ganze SQL-Aktionen bleiben zusammen, auch wenn mehrere Übungsboxen arbeiten. */
export function dbAuftrag (h, arbeit) {
  const vorher = h.warteschlange || Promise.resolve()
  const lauf = vorher.then(arbeit, arbeit)
  h.warteschlange = lauf.catch(() => {})
  return lauf
}

/**
 * Die Musterlösung rechnet vor der Eingabe auf dem Ausgangsbestand.
 * Beliebiges SQL kann Daten ändern, auch WITH oder SELECT mit weiteren
 * Anweisungen. Deshalb gilt der Bestand nach jeder eigenen Eingabe als
 * verändert; die nächste Prüfung beginnt wieder mit den Beispieldaten.
 * Freies Ausführen darf dagegen auf eigenen Änderungen weiterarbeiten.
 */
export async function pruefeSql (h, sql, uebung, saeen, fuehre) {
  const schreibtLoesung = !!(uebung.vorher || uebung.kontrolle)
  if (!h.gesaet || h.veraendert || schreibtLoesung) await saeen(h)
  h.veraendert = true
  if (uebung.vorher) await fuehre(h, uebung.vorher)
  const muster = await fuehre(h, uebung.loesung)
  const soll = uebung.kontrolle ? await fuehre(h, uebung.kontrolle) : muster
  if (schreibtLoesung) {
    await saeen(h)
    h.veraendert = true
    if (uebung.vorher) await fuehre(h, uebung.vorher)
  }
  const meins = await fuehre(h, sql)
  const meinsK = uebung.kontrolle ? await fuehre(h, uebung.kontrolle) : meins
  return { meinsK, soll }
}
