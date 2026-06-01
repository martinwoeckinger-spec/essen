# Essen 🍏 – Kalorientracker PWA

Ein mobiler Kalorien- und Makrotracker als **Progressive Web App**. Läuft komplett
im Browser, funktioniert offline und lässt sich auf dem Handy zum Startbildschirm
hinzufügen wie eine native App. Alle Daten bleiben lokal auf dem Gerät.

## Funktionen

- **Tageserfassung** – Mahlzeiten & Sport pro Tag, mit Tagesnavigation
- **KI-Chat** – natürlichsprachlich eintragen: _„2 Scheiben Vollkornbrot mit Käse"_
  → Claude schätzt Kalorien + Makros und trägt sie ein (Tool-Use)
- **Makro-Auswertung** – Eiweiß / Kohlenhydrate / Fett mit Zielbalken
- **Grundumsatz** (Mifflin-St Jeor) und **Erhaltungsbedarf** aus deinem Profil
- **Sportumsatz** – verbrannte Kalorien erfassen, optional zum Budget addieren
- **Vorschläge** – die KI schlägt Mahlzeiten für die fehlenden Tageskalorien vor
- **Verlauf** – 7/14/30-Tage-Diagramm und Durchschnittswerte

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

## Variante ohne API-Key: `artifact.html`

Neben der vollen PWA gibt es **`artifact.html`** – die komplette App in einer
einzigen Datei, ganz ohne Build-Schritt:

- **Als Claude-Artefakt** (Inhalt der Datei in einen Claude-Chat geben): Der
  KI-Chat läuft dann über die eingebaute Claude-Laufzeit (`window.claude.complete`)
  – **kein API-Key nötig**.
- **Standalone**: Datei einfach im Browser öffnen. Tracking, Makros, Grund-/
  Sportumsatz und Auswertung funktionieren komplett ohne Key. Für den KI-Chat
  kann optional ein Anthropic-Key im Profil hinterlegt werden.

> Hinweis: In der Artefakt-Sandbox werden Daten ggf. nicht dauerhaft gespeichert
> (kein persistenter `localStorage`). Standalone/als PWA bleiben die Daten lokal
> erhalten.

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
