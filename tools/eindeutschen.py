"""Macht eine zweisprachige WInf-SP-Seite einsprachig deutsch.

Aufruf: python3 tools/eindeutschen.py quelle.html ziel.html [--lab lab-02 --von W04 --nach W02]
        python3 tools/eindeutschen.py quelle.json ziel.json [--von W04 --nach W02]

HTML: <span lang="en">…</span> fällt weg, <span lang="de">…</span> wird ausgepackt, die
Sprachknöpfe und der englische Titel verschwinden, Stylesheet und Laufzeit heißen hotel.*.
JSON: aus {de, en} wird {de}; Übungs-IDs werden umnummeriert.
"""
import json, re, sys
from pathlib import Path

def html_eindeutschen(text, lab=None, von=None, nach=None):
    vorher = None
    while vorher != text:
        vorher = text
        text = re.sub(r'<span lang="en">(?:(?!<span)[\s\S])*?</span>\s*', '', text)
        text = re.sub(r'<span lang="de">((?:(?!<span)[\s\S])*?)</span>', r'\1', text)
    rest = re.findall(r'<span lang="(?:de|en)">', text)
    if rest:
        print(f"  Achtung: {len(rest)} verschachtelte Sprach-Spans bleiben – von Hand prüfen", file=sys.stderr)
    text = re.sub(r'\s*<meta name="winf:titel-en"[^>]*/>\n', '\n', text)
    text = re.sub(r'\s*<div class="header-right">\s*<button class="lang-btn[\s\S]*?</div>\n', '\n', text)
    text = text.replace('assets/winf.css', 'assets/hotel.css').replace('assets/winf.js', 'assets/hotel.js')
    text = text.replace('WInf-SP-Lab', 'Hotel-Lab').replace('<span class="mark">WInf-SP</span>-Lab', '<span class="mark">Hotel</span>-Lab')
    text = text.replace("fill='%237A1F2E'", "fill='%232E3238'").replace("fill='%23E0B44C'>W<", "fill='%23C0662B'>H<")
    if lab:
        text = re.sub(r'data-lab="lab-\d\d"', f'data-lab="{lab}"', text)
        text = re.sub(r'lab-num-big">\d\d<', f'lab-num-big">{lab[-2:]}<', text)
        text = re.sub(r'(<title>Lab )\d\d', rf'\g<1>{lab[-2:]}', text)
    if von and nach:
        text = text.replace(f'data-uebung="{von}-', f'data-uebung="{nach}-')
    return text

def json_eindeutschen(obj, von=None, nach=None):
    if isinstance(obj, dict):
        if set(obj) == {"de", "en"} or (set(obj) == {"de"}):
            return {"de": obj["de"]}
        neu = {}
        for k, v in obj.items():
            if k == "id" and von and nach and isinstance(v, str) and v.startswith(von + "-"):
                v = nach + v[len(von):]
            neu[k] = json_eindeutschen(v, von, nach)
        return neu
    if isinstance(obj, list):
        return [json_eindeutschen(x, von, nach) for x in obj]
    return obj

if __name__ == "__main__":
    args = sys.argv[1:]
    quelle, ziel = Path(args[0]), Path(args[1])
    opt = dict(zip(args[2::2], args[3::2]))
    lab, von, nach = opt.get("--lab"), opt.get("--von"), opt.get("--nach")
    if quelle.suffix == ".json":
        daten = json_eindeutschen(json.loads(quelle.read_text()), von, nach)
        ziel.write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n")
    else:
        ziel.write_text(html_eindeutschen(quelle.read_text(), lab, von, nach))
    print(f"{ziel}: geschrieben")
