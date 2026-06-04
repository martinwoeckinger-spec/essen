# Essen 🍊 – Kalorien- & Makrotracker

Ein **Kalorien- und Makrotracker in einer einzigen HTML-Datei** – ohne
Build-Schritt, ohne Server, ohne KI/API und ohne Konto. Einfach
[`index.html`](index.html) im Browser öffnen. Alle Daten bleiben lokal auf
dem Gerät (`localStorage`).

Desktop-optimiert (Seitenleisten-Navigation, breites Layout, zweispaltige
Tagesansicht), voll responsiv fürs Handy. Farbschema **Schwarz/Orange**.

## Schnellstart

- **Desktop/Handy:** `index.html` herunterladen und im Browser öffnen
  (Doppelklick). Fertig – kein Setup.
- Beim ersten Laden werden React/Babel einmalig über ein CDN geholt; danach
  läuft alles lokal.

> Zum Startbildschirm/Dock hinzufügen funktioniert wie bei jeder Webseite über
> das Browser-Menü.

## Online stellen (GitHub Pages)

Da die App reines statisches Frontend ist (keine KI/kein Server), läuft sie
direkt auf GitHub Pages.

> **Wichtig (einmalig):** GitHub Pages muss **einmal von Hand** aktiviert werden
> – der Workflow kann das aus Rechtegründen nicht selbst. Außerdem ist Pages für
> **private** Repos nur in bezahlten Plänen verfügbar. Empfehlung: Da die App
> keine Geheimnisse enthält, das Repo **öffentlich** machen – dann ist Pages
> gratis.

**Einrichtung:**

1. **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.
2. **Actions → „Deploy to GitHub Pages" → Run workflow** (oder einfach den
   nächsten Push abwarten). Die Live-URL erscheint danach unter **Settings →
   Pages** (Form: `https://<user>.github.io/essen/`).

Der Workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml))
veröffentlicht `index.html` anschließend bei jedem Push automatisch.

> Hinweis: Deployt wird vom Branch `claude/zen-lovelace-MAcnT`. Lässt die
> Umgebung „github-pages" nur den Standard-Branch zu, diesen Branch unter
> **Settings → Environments → github-pages** erlauben (oder den Branch zum
> Standard-Branch machen).

**Alternative ohne Actions:** **Settings → Pages → Source: „Deploy from a
branch"**, Branch wählen, Ordner `/ (root)`. GitHub liefert die `index.html`
dann direkt aus – funktioniert von jedem Branch (Pages-Aktivierung/Plan gelten
genauso).

## Funktionen

- **Erfassung per Copy & Paste** – Tabelle (Tab- oder `|`-getrennt) einfügen;
  **Datum und Mahlzeit werden automatisch zugeordnet**. Mit Vorschau,
  Duplikat-Warnung, „rückgängig" und optionalem Leeren der betroffenen Tage.
  Dazu **Schnell-Einfügen** direkt auf „Heute" und **manuelle** Eingabe
  (inkl. „Werte pro 100 g"-Umrechnung).
- **Mahlzeiten** – Frühstück / Mittag / Abend / Snack mit Zwischensummen;
  Einträge bearbeiten (✎), löschen (×) oder als **Favorit** (⭐) speichern.
- **Favoriten** – häufige Lebensmittel mit einem Klick wieder hinzufügen.
- **„Gestern übernehmen"** – den Vortag in einen Tag kopieren.
- **Erweiterte Nährwerte** – kcal, Eiweiß/KH/Fett **plus** Zucker, gesättigte
  Fettsäuren, Ballaststoffe und Salz, mit Ziel-/Limit-Balken und Makro-Donut.
- **Gewicht** – pro Tag erfassen; Verlaufskurve und Bezug zum Wunschgewicht.
- **Archiv** – alle Tage nach Monat, durchsuchbar; Export zurück ins Tab-Format.
- **Analyse** – umschaltbarer **Zeitverlauf** (Kalorien/Makros/Ballaststoffe/
  Zucker/Salz) mit 7-Tage-Schnitt, **Kalender-Heatmap**, **Gewichtsverlauf**,
  **Kalorienbilanz** (geschätzte kg-Veränderung), Verteilung nach Mahlzeit und
  Tracking-Treue (Budget-Treue, Serie).
- **Profil & Wünsche** – Körperdaten, Wunschgewicht inkl. Tempo-/Dauerschätzung,
  Ernährungsstil, Makro-Verteilung, Nährwert-Ziele/-Limits und persönliche
  Hinweise.
- **Backup** – komplette Daten als JSON sichern und wiederherstellen.
- **Drucken** – aktuellen Tag als sauberen (hellen) Ausdruck/PDF.

### Import-Format

Eine Zeile pro Lebensmittel, Spalten per **Tab** (oder `|`) getrennt:

```
Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz
```

Beispiel (deutsche Kommazahlen und Notizen mit Kommas sind erlaubt):

```
02.06.2026	Frühstück	Naturjoghurt	400 g	260	14	19	19	14	9	0	0,4	Vollmilchjoghurt 3,5%
02.06.2026	Mittagessen	Chicken-Panade-Salat	1 Portion	550	35	30	5	30	6	5	1,5	Restaurantportion
```

Aufrufbar über **„📋 Import"** (mit Vorschau) oder **„⚡ Einfügen"** (direkt)
auf der Heute-Seite.

## Tastenkürzel (Desktop)

| Taste | Aktion |
|------|--------|
| `←` / `→` | Tag wechseln (auf „Heute") |
| `t` | Zum heutigen Tag springen |
| `i` | Import öffnen |
| `Esc` | Dialog schließen |

## Datensicherung

Alle Daten liegen ausschließlich im `localStorage` deines Browsers. Lade unter
**Profil → 💾 Daten & Sicherung** regelmäßig ein **JSON-Backup** herunter, damit
beim Leeren des Browser-Speichers nichts verloren geht. Über denselben Bereich
lässt sich ein Backup wieder einspielen.

## Technik & Datenschutz

- Eine Datei, reines Frontend: React 18 + Babel-Standalone (per CDN), kein Build.
- Keine Server-Kommunikation, **keine KI/API**, kein Tracking.
- Persistenz lokal über `localStorage`; Export/Backup als TSV bzw. JSON.
