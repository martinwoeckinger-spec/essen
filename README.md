# Essen 🍏 – Kalorientracker PWA

Ein mobiler Kalorien- und Makrotracker als **Progressive Web App**. Läuft komplett
im Browser, funktioniert offline und lässt sich auf dem Handy zum Startbildschirm
hinzufügen wie eine native App. Alle Daten bleiben lokal auf dem Gerät.

## Funktionen

- **Strukturierter Import** – Nahrungsmittel als Tabelle (Tab- oder
  `|`-getrennt) einfügen; **Datum und Mahlzeit werden automatisch zugeordnet**.
  Mit Vorschau, Warnungen für fehlerhafte Zeilen und optionalem Leeren der
  betroffenen Tage. Deutsche Zahlen (`0,4`) und Notizen mit Kommas inklusive.
- **Tageserfassung nach Mahlzeiten** – Frühstück / Mittag / Abend / Snack,
  je mit Zwischensumme; dazu Sport, mit Tagesnavigation
- **Erweiterte Nährwerte** – zusätzlich zu kcal/Makros auch **Zucker,
  gesättigte Fettsäuren, Ballaststoffe und Salz**, mit Ziel-/Limit-Balken
- **Archiv** – alle erfassten Tage nach Monat gruppiert, antippen zum Öffnen,
  Export zurück ins Tab-Format (Backup / Round-Trip)
- **Analyse** – umschaltbarer **Zeitverlauf** (Kalorien, Makros, Ballaststoffe,
  Zucker, Salz), erweiterte Durchschnitte, Verteilung nach Mahlzeit und
  Tracking-Treue (erfasste Tage, Budget-Treue, Serie)
- **Profil & Wünsche** – Körperdaten, Wunschgewicht inkl. Tempo-/Dauer­schätzung,
  Ernährungsstil, Nährwert-Ziele/-Limits sowie Vorlieben/Hinweise
- **KI-Chat** _(nur PWA)_ – natürlichsprachlich eintragen: _„Zum Frühstück 400 g
  Joghurt mit Himbeeren"_ → Claude ordnet Mahlzeit zu, schätzt die Nährwerte und
  trägt sie ein (Tool-Use), auch für andere Tage
- **Grundumsatz** (Mifflin-St Jeor), **Erhaltungsbedarf** und **Sportumsatz**
- **Vorschläge** _(nur PWA)_ – die KI schlägt Mahlzeiten für die fehlenden
  Tageskalorien vor

### Strukturierter Import – Spaltenformat

Eine Zeile pro Lebensmittel, Spalten per **Tab** (oder `|`) getrennt:

```
Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz
```

Beispiel:

```
02.06.2026	Frühstück	Naturjoghurt	400 g	260	14	19	19	14	9	0	0,4	Vollmilchjoghurt 3,5%
02.06.2026	Mittagessen	Chicken-Panade-Salat	1 Portion	550	35	30	5	30	6	5	1,5	Restaurantportion
```

Aufrufbar über **„📋 Import"** auf der Heute- oder Archiv-Seite.

## Schnellstart

```bash
npm install
npm run generate-icons   # erzeugt die PWA-Icons (einmalig)
npm run dev              # Entwicklung: http://localhost:5173
```

### Build & Deploy (statisch)

```bash
npm run build            # Ergebnis liegt in dist/
npm run preview          # gebauten Stand lokal testen
```

Der Inhalt von `dist/` ist eine rein statische Seite und kann auf jeden
beliebigen Webspace, Netlify, Vercel, GitHub Pages o.ä. geladen werden.
`base: './'` in `vite.config.ts` sorgt dafür, dass die App auch in einem
Unterordner funktioniert.

## Single-File-Variante ohne KI: `artifact.html`

Neben der vollen PWA gibt es **`artifact.html`** – ein **reiner Offline-Tracker
in einer einzigen Datei**, ganz ohne Build-Schritt und **ohne KI/API**. Die
Erfassung der Mahlzeiten erfolgt per **Copy & Paste** (strukturierter Import)
oder manuell; dazu Mahlzeiten-Gruppierung, erweiterte Nährwerte, Archiv,
Analysen und Profil.

> **Desktop-optimiert:** Auf breiten Bildschirmen erscheint eine
> Seitenleisten-Navigation, ein breites Layout und eine zweispaltige
> Tagesansicht (Dialoge als zentrierte Modals); auf dem Handy bleibt die untere
> Tableiste. Farbschema: **Schwarz/Orange**.

- **Kein API-Key, kein KI-Chat, keine automatischen Vorschläge** – einfach die
  Datei im Browser öffnen.
- Lediglich React/Babel werden beim ersten Laden per CDN geholt; alle Daten
  bleiben lokal im Browser (`localStorage`).

> KI-Chat und automatische Mahlzeit-Vorschläge gibt es nur in der **PWA**
> (mit eigenem Anthropic-API-Key, siehe unten).

## KI-Chat einrichten (PWA-Variante)

1. Anthropic-API-Key unter <https://console.anthropic.com> erstellen.
2. In der App auf **Profil → KI-Chat** den Key eintragen und ein Modell wählen.

Der Key wird **nur lokal** im Browser (LocalStorage) gespeichert und direkt von
deinem Gerät an die Anthropic-API gesendet – es gibt keinen eigenen Server.

> Hinweis: Direkte Browser-Aufrufe der API sind über die SDK-Option
> `dangerouslyAllowBrowser` aktiviert. Das ist für eine private App auf dem
> eigenen Gerät vorgesehen; teile deinen Key nicht öffentlich.

## Aufs Handy installieren

Seite im mobilen Browser öffnen → Teilen/Menü → **Zum Startbildschirm hinzufügen**.

## Technik

Vite · React · TypeScript · zustand (lokale Persistenz) · vite-plugin-pwa ·
`@anthropic-ai/sdk`. Berechnungen siehe `src/lib/calc.ts`.
