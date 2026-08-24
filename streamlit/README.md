# Essen 🍊 – Streamlit-Variante (experimentell)

Eine **Python/Streamlit-Portierung** des Kalorien- & Makrotrackers – als
Versuch neben der eigentlichen [Single-File-HTML-App](../index.html).
Gleiche Berechnungen (Mifflin-St-Jeor-Grundumsatz, Tagesbudget, Ziel-Makros)
und derselbe **strukturierte Copy-&-Paste-Import**.

## Start

```bash
cd streamlit
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Dann öffnet sich die App im Browser (Standard: <http://localhost:8501>).

## Funktionen

- **Dashboard** – Tagesbudget, gegessene/übrige kcal, Sport, Makro- und
  Nährwert-Fortschritt.
- **Heute** – Tag wählen, **Import** (Tabelle einfügen, Tab/`|`-getrennt) oder
  **manuell** erfassen; Mahlzeiten nach Frühstück/Mittag/Abend/Snack, löschbar;
  Sport erfassen.
- **Analyse** – Zeitverlauf (7/14/30/90 Tage) je Kennzahl mit Budget-Linie,
  Kennzahlen, **Prognose** (geschätzte kg-Veränderung) und Kalender-Heatmap.
- **Profil** – Körperdaten, Ziel-Anpassung, Ernährungsstil, Makro-Verteilung
  und Nährwert-Limits; Budget-Vorschau live.

## Persistenz

Alle Daten liegen lokal in `essen_data.json` (neben dem Skript). Über die
Seitenleiste lässt sich ein **JSON-Backup** herunterladen bzw. einspielen –
kompatibel zum Backup-Format der HTML-App (`profile`, `goal`, `days`).

## Import-Format

Eine Zeile pro Lebensmittel, Spalten per **Tab** (oder `|`):

```
Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz
```

> Hinweis: Diese Variante ist ein Experiment. Die gepflegte, deployte App ist
> weiterhin die HTML-Version unter `../index.html`.
