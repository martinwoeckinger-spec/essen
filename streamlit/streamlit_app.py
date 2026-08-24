"""
Essen – Kalorien- & Makrotracker  ·  Streamlit-Variante (experimentell)

Python-Portierung der Single-File-HTML-App. Gleiche Berechnungen
(Mifflin-St Jeor, Tagesbudget, Ziel-Makros) und derselbe strukturierte
Copy-&-Paste-Import. Daten werden lokal in essen_data.json gespeichert.

Start:
    pip install -r requirements.txt
    streamlit run streamlit_app.py
"""
from __future__ import annotations

import json
import math
import re
import uuid
from datetime import date, timedelta
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

# ───────────────────────── Konstanten ─────────────────────────
DATA_FILE = Path(__file__).parent / "essen_data.json"
KCAL_PER_KG = 7700

MEALS = {
    "breakfast": {"label": "Frühstück", "icon": "🌅", "order": 0},
    "lunch": {"label": "Mittagessen", "icon": "☀️", "order": 1},
    "dinner": {"label": "Abendessen", "icon": "🌙", "order": 2},
    "snack": {"label": "Snack", "icon": "🍎", "order": 3},
}
MEAL_ORDER = sorted(MEALS, key=lambda m: MEALS[m]["order"])

ACTIVITY = {
    "sedentary": (1.2, "Sitzend – kaum Bewegung"),
    "light": (1.375, "Leicht aktiv – Bürojob"),
    "moderate": (1.55, "Mäßig aktiv – viel unterwegs"),
    "active": (1.725, "Sehr aktiv – körperliche Arbeit"),
    "very_active": (1.9, "Extrem aktiv"),
}

DIET_MACROS = {
    "omnivore": (30, 40, 30), "vegetarian": (25, 45, 30), "vegan": (22, 50, 28),
    "pescetarian": (30, 40, 30), "lowcarb": (35, 20, 45), "highprotein": (40, 35, 25),
    "keto": (25, 5, 70), "mediterranean": (25, 45, 30),
}
DIET_LABELS = {
    "omnivore": "Ausgewogen / Allesesser", "vegetarian": "Vegetarisch", "vegan": "Vegan",
    "pescetarian": "Pescetarisch (mit Fisch)", "lowcarb": "Low Carb",
    "highprotein": "High Protein", "keto": "Ketogen", "mediterranean": "Mediterran",
}

MEAL_ALIASES = {
    "frühstück": "breakfast", "fruehstueck": "breakfast", "breakfast": "breakfast", "morgens": "breakfast",
    "mittagessen": "lunch", "mittag": "lunch", "lunch": "lunch",
    "abendessen": "dinner", "abendbrot": "dinner", "abend": "dinner", "dinner": "dinner",
    "snack": "snack", "snacks": "snack", "zwischenmahlzeit": "snack", "zwischendurch": "snack",
    "zwischen": "snack", "imbiss": "snack",
}

# Ernährungswerte (interne Schlüssel)
NUTRIENTS = ["calories", "protein", "carbs", "sugar", "fat", "saturatedFat", "fiber", "salt"]

COLORS = {
    "protein": "#059669", "carbs": "#0284c7", "fat": "#9333ea", "fiber": "#65a30d",
    "sugar": "#db2777", "satfat": "#e11d48", "salt": "#64748b",
    "data": "#2563eb", "accent": "#e05e00", "danger": "#c0341d", "good": "#16a34a",
}

# ───────────────────────── Berechnung ─────────────────────────
def rnd(x: float) -> int:
    """Kaufmännisch aufrunden (halbe auf) – wie JS Math.round in der HTML-App."""
    return int(math.floor(x + 0.5))

def bmr(p: dict) -> int:
    return rnd(10 * p["weight"] + 6.25 * p["height"] - 5 * p["age"] + (5 if p["sex"] == "male" else -161))

def maintenance(p: dict) -> int:
    return rnd(bmr(p) * ACTIVITY[p["activity"]][0])

def daily_budget(p: dict, g: dict, burned: float = 0) -> int:
    return rnd(maintenance(p) + g["adjustment"] + (burned if g.get("addExercise") else 0))

def target_macros(cal: float, g: dict) -> dict:
    return {
        "protein": rnd(cal * g["proteinPct"] / 100 / 4),
        "carbs": rnd(cal * g["carbsPct"] / 100 / 4),
        "fat": rnd(cal * g["fatPct"] / 100 / 9),
    }

def sum_nut(foods: list[dict]) -> dict:
    t = {k: 0.0 for k in NUTRIENTS}
    for f in foods:
        for k in NUTRIENTS:
            t[k] += float(f.get(k) or 0)
    return {k: (rnd(v * 10) / 10 if k == "salt" else rnd(v)) for k, v in t.items()}

def sum_cal(foods: list[dict]) -> int:
    return rnd(sum(float(f.get("calories") or 0) for f in foods))

def burned_cal(day: dict) -> int:
    return rnd(sum(float(e.get("calories") or 0) for e in day.get("exercises", [])))

def weekly_change(adj: float) -> float:
    return round(adj * 7 / KCAL_PER_KG, 1)

# ───────────────────────── Import-Parser ─────────────────────────
def parse_date(raw: str) -> str | None:
    s = (raw or "").strip()
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$", s)
    if m:
        y = int(m.group(3)); y += 2000 if y < 100 else 0
        return f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", s)
    if m:
        y = int(m.group(3)); y += 2000 if y < 100 else 0
        return f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return None

def parse_number(raw) -> float:
    if raw is None:
        return 0.0
    s = str(raw).strip()
    if not s or s in ("-", "–") or re.match(r"^(n/a|k\.?\s?a\.?)$", s, re.I):
        return 0.0
    s = re.sub(r"[^0-9.,-]", "", s)
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0

def parse_meal(raw: str) -> str:
    return MEAL_ALIASES.get((raw or "").strip().lower(), "snack")

def split_row(line: str) -> list[str]:
    if "\t" in line:
        return [c.strip() for c in line.split("\t")]
    if "|" in line:
        p = [c.strip() for c in line.split("|")]
        if p and p[0] == "":
            p.pop(0)
        if p and p[-1] == "":
            p.pop()
        return p
    return [c.strip() for c in re.split(r"\s{2,}", line)]

def _is_separator(cells: list[str]) -> bool:
    return bool(cells) and all(re.match(r"^:?-{2,}:?$", c) or c == "" for c in cells)

def _is_header(cells: list[str]) -> bool:
    first = cells[0] if cells else ""
    return parse_date(first) is None and bool(
        re.search(r"datum|mahlzeit|kalorien|kcal|eiwei|protein|nahrungs", " ".join(cells), re.I)
    )

def parse_structured(text: str) -> tuple[list[dict], list[tuple]]:
    rows, errors = [], []
    lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    for i, raw in enumerate(lines, 1):
        trimmed = raw.strip()
        if not trimmed:
            continue
        cells = split_row(raw)
        if _is_separator(cells) or _is_header(cells):
            continue
        if len(cells) < 5:
            errors.append((i, trimmed, "Zu wenige Spalten (mind. Datum, Mahlzeit, Name, Menge, kcal)"))
            continue
        d = parse_date(cells[0])
        if not d:
            errors.append((i, trimmed, f'Datum "{cells[0]}" nicht erkannt'))
            continue
        name = (cells[2] if len(cells) > 2 else "").strip()
        if not name:
            errors.append((i, trimmed, "Kein Nahrungsmittel-Name"))
            continue
        cell = lambda idx: cells[idx].strip() if len(cells) > idx else ""
        rows.append({
            "date": d, "meal": parse_meal(cell(1)), "name": name, "quantity": cell(3),
            "calories": round(parse_number(cell(4))), "protein": round(parse_number(cell(5))),
            "carbs": round(parse_number(cell(6))), "sugar": round(parse_number(cell(7))),
            "fat": round(parse_number(cell(8))), "saturatedFat": round(parse_number(cell(9))),
            "fiber": round(parse_number(cell(10))), "salt": round(parse_number(cell(11)), 1),
            "note": cell(12),
        })
    return rows, errors

IMPORT_EXAMPLE = "\n".join([
    "02.06.2026\tFrühstück\tNaturjoghurt\t400 g\t260\t14\t19\t19\t14\t9\t0\t0,4\tVollmilchjoghurt 3,5%",
    "02.06.2026\tMittagessen\tChicken-Panade-Salat\t1 Portion\t550\t35\t30\t5\t30\t6\t5\t1,5\tRestaurantportion",
    "02.06.2026\tSnack\tProteinriegel\t1 Stk\t200\t20\t18\t3\t7\t4\t2\t0,3\ttyp. Riegel ~50 g",
])

# ───────────────────────── Persistenz ─────────────────────────
DEFAULTS = {
    "profile": {"name": "", "sex": "male", "age": 30, "height": 180, "weight": 80,
                "targetWeight": None, "activity": "light"},
    "goal": {"adjustment": 0, "proteinPct": 30, "carbsPct": 40, "fatPct": 30, "addExercise": True,
             "dietStyle": "omnivore", "fiberGoal": 30, "sugarLimit": 50, "saltLimit": 6, "satFatLimit": 20},
    "days": {},
}

def load_state() -> dict:
    try:
        raw = json.loads(DATA_FILE.read_text("utf-8")) if DATA_FILE.exists() else {}
    except Exception:
        raw = {}
    return {
        "profile": {**DEFAULTS["profile"], **(raw.get("profile") or {})},
        "goal": {**DEFAULTS["goal"], **(raw.get("goal") or {})},
        "days": raw.get("days") or {},
    }

def save_state(state: dict) -> None:
    try:
        DATA_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")
    except Exception as e:  # noqa: BLE001
        st.warning(f"Konnte nicht speichern: {e}")

def get_day(state: dict, d: str) -> dict:
    return state["days"].get(d, {"date": d, "foods": [], "exercises": []})

def ensure_day(state: dict, d: str) -> dict:
    return state["days"].setdefault(d, {"date": d, "foods": [], "exercises": []})

def add_food(state: dict, d: str, food: dict) -> None:
    ensure_day(state, d)["foods"].append({**food, "id": uuid.uuid4().hex})

# ───────────────────────── Datums-Helfer ─────────────────────────
def iso(d: date) -> str:
    return d.isoformat()

def de_date(k: str) -> str:
    y, m, dd = k.split("-")
    return f"{dd}.{m}.{y}"

def label_short(k: str) -> str:
    y, m, dd = k.split("-")
    return f"{dd}.{m}."

# ───────────────────────── App ─────────────────────────
st.set_page_config(page_title="Essen – Kalorientracker", page_icon="🍊", layout="wide")

if "state" not in st.session_state:
    st.session_state.state = load_state()
if "date" not in st.session_state:
    st.session_state.date = date.today().isoformat()

state = st.session_state.state
profile, goal = state["profile"], state["goal"]

# ── Sidebar: Kennzahlen + Datensicherung ──
with st.sidebar:
    st.markdown("## 🍊 Essen")
    st.caption("Kalorien- & Makrotracker · Streamlit-Variante (experimentell)")
    _b = daily_budget(profile, goal)
    st.metric("Tagesbudget", f"{_b} kcal")
    st.caption(
        f"Grundumsatz {bmr(profile)} · Erhaltung {maintenance(profile)} · "
        f"Anpassung {'+' if goal['adjustment'] > 0 else ''}{goal['adjustment']}"
    )
    st.divider()
    st.markdown("**💾 Daten & Sicherung**")
    st.download_button("⬇ Backup (JSON)", data=json.dumps(state, ensure_ascii=False, indent=2),
                       file_name="essen-backup.json", mime="application/json", use_container_width=True)
    up = st.file_uploader("Backup einspielen", type="json", label_visibility="collapsed")
    if up is not None:
        try:
            data = json.loads(up.getvalue().decode("utf-8"))
            st.session_state.state = {
                "profile": {**DEFAULTS["profile"], **(data.get("profile") or {})},
                "goal": {**DEFAULTS["goal"], **(data.get("goal") or {})},
                "days": data.get("days") or {},
            }
            save_state(st.session_state.state)
            st.success("Backup geladen.")
            st.rerun()
        except Exception as e:  # noqa: BLE001
            st.error(f"Ungültiges Backup: {e}")
    st.caption(f"Speicherort: `{DATA_FILE.name}`")

tab_dash, tab_today, tab_stats, tab_profile = st.tabs(["📊 Dashboard", "🍽️ Heute", "📈 Analyse", "⚙️ Profil"])

# ═══════════════════════ Dashboard ═══════════════════════
with tab_dash:
    d = st.session_state.date
    day = get_day(state, d)
    burned = burned_cal(day)
    budget = daily_budget(profile, goal, burned)
    totals = sum_nut(day["foods"])
    tgt = target_macros(budget, goal)
    consumed = totals["calories"]
    rest = budget - consumed

    st.subheader("Heute" if d == date.today().isoformat() else de_date(d))
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Budget", f"{budget} kcal")
    c2.metric("Gegessen", f"{consumed} kcal")
    c3.metric("Übrig" if rest >= 0 else "Drüber", f"{abs(rest)} kcal")
    c4.metric("Sport", f"+{burned} kcal")

    st.progress(min(consumed / budget, 1.0) if budget > 0 else 0.0,
                text=f"{consumed} / {budget} kcal")

    st.markdown("#### Makronährstoffe")
    m1, m2, m3 = st.columns(3)
    for col, key, lbl in ((m1, "protein", "Eiweiß"), (m2, "carbs", "Kohlenhydrate"), (m3, "fat", "Fett")):
        val, t = totals[key], tgt[key]
        col.metric(lbl, f"{val} / {t} g")
        col.progress(min(val / t, 1.0) if t > 0 else 0.0)

    st.markdown("#### Weitere Nährwerte")
    extras = [
        ("Ballaststoffe", totals["fiber"], goal["fiberGoal"], "Ziel", False),
        ("Zucker", totals["sugar"], goal["sugarLimit"], "max.", True),
        ("ges. Fettsäuren", totals["saturatedFat"], goal["satFatLimit"], "max.", True),
        ("Salz", totals["salt"], goal["saltLimit"], "max.", True),
    ]
    for lbl, val, ref, word, is_limit in extras:
        over = is_limit and val > ref
        frac = min(val / ref, 1.0) if ref > 0 else 0.0
        st.write(f"**{lbl}** — {val} {word} {ref} g" + ("  ⚠️ über Limit" if over else ""))
        st.progress(frac)

# ═══════════════════════ Heute ═══════════════════════
with tab_today:
    picked = st.date_input("Tag", value=date.fromisoformat(st.session_state.date), format="DD.MM.YYYY")
    if picked and picked.isoformat() != st.session_state.date:
        st.session_state.date = picked.isoformat()
        st.rerun()
    d = st.session_state.date
    day = get_day(state, d)

    with st.expander("📋 Import (Tabelle einfügen)"):
        st.caption("Spalten (Tab- oder |-getrennt): Datum · Mahlzeit · Nahrungsmittel · Menge · "
                   "kcal · Eiweiß · KH · Zucker · Fett · ges.FS · Ballaststoffe · Salz · Notiz")
        txt = st.text_area("Einfügen", height=140, placeholder=IMPORT_EXAMPLE, label_visibility="collapsed")
        if st.button("Vorschau & Hinzufügen", type="primary"):
            rows, errors = parse_structured(txt)
            if rows:
                for r in rows:
                    add_food(state, r["date"], {k: r[k] for k in
                             ["meal", "name", "quantity", *NUTRIENTS, "note"]})
                save_state(state)
                dates = sorted({r["date"] for r in rows})
                st.success(f"✅ {len(rows)} Einträge auf {len(dates)} Tag(e) verteilt.")
            if errors:
                st.warning(f"{len(errors)} Zeile(n) übersprungen:")
                for ln, text, reason in errors[:10]:
                    st.caption(f"Zeile {ln}: {reason} — `{text[:60]}`")
            if rows:
                st.rerun()

    with st.expander("➕ Manuell erfassen"):
        with st.form("manual", clear_on_submit=True):
            fc1, fc2, fc3 = st.columns([2, 1, 1])
            name = fc1.text_input("Nahrungsmittel")
            meal = fc2.selectbox("Mahlzeit", MEAL_ORDER, format_func=lambda m: MEALS[m]["label"])
            qty = fc3.text_input("Menge", placeholder="z. B. 200 g")
            g1, g2, g3, g4 = st.columns(4)
            kcal = g1.number_input("kcal", min_value=0, step=10)
            prot = g2.number_input("Eiweiß (g)", min_value=0, step=1)
            carb = g3.number_input("KH (g)", min_value=0, step=1)
            fat = g4.number_input("Fett (g)", min_value=0, step=1)
            h1, h2, h3, h4 = st.columns(4)
            sugar = h1.number_input("Zucker (g)", min_value=0, step=1)
            satfat = h2.number_input("ges. FS (g)", min_value=0, step=1)
            fiber = h3.number_input("Ballastst. (g)", min_value=0, step=1)
            salt = h4.number_input("Salz (g)", min_value=0.0, step=0.1, format="%.1f")
            if st.form_submit_button("Hinzufügen", type="primary") and name.strip():
                add_food(state, d, {"meal": meal, "name": name.strip(), "quantity": qty.strip(),
                                    "calories": kcal, "protein": prot, "carbs": carb, "sugar": sugar,
                                    "fat": fat, "saturatedFat": satfat, "fiber": fiber, "salt": salt, "note": ""})
                save_state(state)
                st.rerun()

    st.markdown(f"### Mahlzeiten — {sum_cal(day['foods'])} kcal")
    if not day["foods"]:
        st.info("Noch nichts erfasst. Nutze den Import (Tabelle einfügen) oder erfasse manuell.")
    for meal in MEAL_ORDER:
        items = [f for f in day["foods"] if f.get("meal") == meal]
        if not items:
            continue
        st.markdown(f"**{MEALS[meal]['icon']} {MEALS[meal]['label']}** · {sum_cal(items)} kcal")
        for f in items:
            r1, r2, r3 = st.columns([6, 2, 1])
            note = f" · _{f['note']}_" if f.get("note") else ""
            qty = f" · {f['quantity']}" if f.get("quantity") else ""
            r1.markdown(f"{f['name']}{qty}  \n<small>E {f['protein']} · KH {f['carbs']} · "
                        f"F {f['fat']} g{note}</small>", unsafe_allow_html=True)
            r2.markdown(f"**{round(f['calories'])}** kcal")
            if r3.button("🗑", key=f"del_{f['id']}"):
                day["foods"] = [x for x in day["foods"] if x["id"] != f["id"]]
                state["days"][d] = day
                save_state(state)
                st.rerun()

    st.markdown("### 🏃 Sport")
    with st.form("sport", clear_on_submit=True):
        s1, s2 = st.columns([3, 1])
        sname = s1.text_input("Aktivität", placeholder="z. B. Laufen")
        scal = s2.number_input("kcal verbrannt", min_value=0, step=10)
        if st.form_submit_button("Sport hinzufügen") and sname.strip():
            ensure_day(state, d)["exercises"].append(
                {"id": uuid.uuid4().hex, "name": sname.strip(), "calories": scal})
            save_state(state)
            st.rerun()
    for e in day.get("exercises", []):
        e1, e2 = st.columns([7, 1])
        e1.write(f"{e['name']} — −{round(e['calories'])} kcal")
        if e2.button("🗑", key=f"delex_{e['id']}"):
            day["exercises"] = [x for x in day["exercises"] if x["id"] != e["id"]]
            state["days"][d] = day
            save_state(state)
            st.rerun()

# ═══════════════════════ Analyse ═══════════════════════
with tab_stats:
    rng = st.radio("Zeitraum", [7, 14, 30, 90], horizontal=True, format_func=lambda x: f"{x} Tage")
    metric = st.selectbox(
        "Kennzahl",
        ["calories", "protein", "carbs", "fat", "fiber", "sugar", "salt"],
        format_func=lambda m: {"calories": "Kalorien", "protein": "Eiweiß", "carbs": "KH",
                               "fat": "Fett", "fiber": "Ballaststoffe", "sugar": "Zucker",
                               "salt": "Salz"}[m],
    )
    today = date.today()
    keys = [(today - timedelta(days=i)).isoformat() for i in range(rng - 1, -1, -1)]

    recs = []
    for k in keys:
        day = get_day(state, k)
        b = daily_budget(profile, goal, burned_cal(day))
        t = sum_nut(day["foods"])
        tm = target_macros(b, goal)
        has = len(day["foods"]) > 0
        recs.append({"date": k, "budget": b, "totals": t, "target": tm, "has": has})

    tracked = [r for r in recs if r["has"]]
    if not tracked:
        st.info("Noch keine Daten im Zeitraum. Importiere oder erfasse Mahlzeiten.")
    else:
        avg_cal = round(sum(r["totals"]["calories"] for r in tracked) / len(tracked))
        within = sum(1 for r in tracked if r["totals"]["calories"] <= r["budget"])
        avg_dev = round(sum(r["totals"]["calories"] - r["budget"] for r in tracked) / len(tracked))
        streak = 0
        for i in range(0, 3660):
            k = (today - timedelta(days=i)).isoformat()
            if len(get_day(state, k)["foods"]) > 0:
                streak += 1
            else:
                break

        k1, k2, k3, k4 = st.columns(4)
        k1.metric("Ø Kalorien / Tag", f"{avg_cal} kcal")
        k2.metric("Ø Abweichung / Tag", f"{avg_dev:+d} kcal")
        k3.metric("Im Budget", f"{within} / {len(tracked)}")
        k4.metric("🔥 Serie", f"{streak} Tage")

        # Zeitverlauf
        def metric_row(r):
            t, tm = r["totals"], r["target"]
            if metric == "calories":
                return t["calories"], r["budget"], t["calories"] > r["budget"]
            if metric in ("protein", "carbs", "fat"):
                return t[metric], tm[metric], False
            if metric == "fiber":
                return t["fiber"], goal["fiberGoal"], False
            if metric == "sugar":
                return t["sugar"], goal["sugarLimit"], t["sugar"] > goal["sugarLimit"]
            if metric == "salt":
                return t["salt"], goal["saltLimit"], t["salt"] > goal["saltLimit"]
            return 0, 0, False

        chart_rows = []
        for r in recs:
            val, ref, over = metric_row(r)
            chart_rows.append({"date": r["date"], "label": label_short(r["date"]),
                               "Wert": val if r["has"] else 0, "Ziel/Budget": ref, "über Ziel": over})
        df = pd.DataFrame(chart_rows)
        order = list(df["label"])
        unit = "kcal" if metric == "calories" else "g"
        st.markdown(f"#### Zeitverlauf — Ø {avg_cal if metric=='calories' else round(sum(df['Wert'])/max(len(df),1))} {unit}")
        x = alt.X("label:N", sort=order, title=None, axis=alt.Axis(labelAngle=0))
        bars = alt.Chart(df).mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4).encode(
            x=x,
            y=alt.Y("Wert:Q", title=unit),
            color=alt.condition("datum['über Ziel']", alt.value(COLORS["danger"]), alt.value(COLORS["data"])),
            tooltip=["date", "Wert", "Ziel/Budget"],
        )
        budget_line = alt.Chart(df).mark_line(color=COLORS["accent"], strokeDash=[6, 4]).encode(
            x=x, y="Ziel/Budget:Q")
        st.altair_chart((bars + budget_line).properties(height=300), use_container_width=True)

        # Prognose
        st.markdown("#### 🔮 Prognose")
        weekly_kg = round(avg_dev * 7 / KCAL_PER_KG, 2)
        proj4 = round(profile["weight"] + weekly_kg * 4, 1)
        colp1, colp2 = st.columns(2)
        colp1.metric("Tempo", f"{'+' if weekly_kg > 0 else ''}{weekly_kg} kg/Woche")
        colp2.metric("Gewicht in 4 Wochen ≈", f"{proj4} kg")
        tw = profile.get("targetWeight")
        if tw and weekly_kg != 0 and (tw - profile["weight"]) * weekly_kg > 0:
            eta = -(-abs(tw - profile["weight"]) // abs(weekly_kg))  # ceil
            eta_date = today + timedelta(weeks=int(eta))
            st.caption(f"Ziel {tw} kg voraussichtlich in ~{int(eta)} Wochen ({eta_date.strftime('%d.%m.%Y')}). "
                       "Schätzung auf Basis der Kalorienbilanz – keine medizinische Beratung.")
        else:
            st.caption("Schätzung auf Basis der Kalorienbilanz (≈ 7700 kcal/kg) – keine medizinische Beratung.")

        # Kalender-Heatmap (letzte 8 Wochen)
        st.markdown("#### 📅 Kalender")
        weeks = 8
        monday = today - timedelta(days=(today.weekday()) + 7 * (weeks - 1))
        heat = []
        wd_names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
        for w in range(weeks):
            for wd in range(7):
                cur = monday + timedelta(days=w * 7 + wd)
                k = cur.isoformat()
                dd = get_day(state, k)
                if cur > today or not dd["foods"]:
                    status = "leer"
                else:
                    status = "Budget" if sum_cal(dd["foods"]) <= daily_budget(profile, goal, burned_cal(dd)) else "drüber"
                heat.append({"Woche": w, "wd": wd, "Wochentag": wd_names[wd], "date": k, "status": status,
                             "kcal": sum_cal(dd["foods"]) if dd["foods"] else 0})
        hdf = pd.DataFrame(heat)
        heat_chart = alt.Chart(hdf).mark_rect(cornerRadius=3, stroke="white", strokeWidth=2).encode(
            x=alt.X("Wochentag:N", sort=wd_names, title=None),
            y=alt.Y("Woche:O", title=None, axis=None),
            color=alt.Color("status:N",
                            scale=alt.Scale(domain=["Budget", "drüber", "leer"],
                                            range=[COLORS["good"], COLORS["danger"], "#e6dfd5"]),
                            legend=alt.Legend(title=None)),
            tooltip=["date", "kcal", "status"],
        ).properties(height=200)
        st.altair_chart(heat_chart, use_container_width=True)

# ═══════════════════════ Profil ═══════════════════════
with tab_profile:
    st.subheader("Profil & Wünsche")
    b1, b2, b3 = st.columns(3)
    b1.metric("Grundumsatz", f"{bmr(profile)} kcal/Tag")
    b2.metric("Erhaltung", f"{maintenance(profile)} kcal/Tag")
    b3.metric("Budget-Ziel", f"{daily_budget(profile, goal)} kcal/Tag")

    with st.form("profile"):
        st.markdown("#### Über dich")
        p1, p2 = st.columns(2)
        name = p1.text_input("Name (optional)", value=profile["name"])
        sex = p2.radio("Geschlecht", ["male", "female"],
                       index=0 if profile["sex"] == "male" else 1,
                       format_func=lambda s: "Männlich" if s == "male" else "Weiblich", horizontal=True)
        q1, q2, q3 = st.columns(3)
        age = q1.number_input("Alter", min_value=10, max_value=100, value=int(profile["age"]))
        height = q2.number_input("Größe (cm)", min_value=120, max_value=230, value=int(profile["height"]))
        weight = q3.number_input("Gewicht (kg)", min_value=30.0, max_value=250.0,
                                 value=float(profile["weight"]), step=0.5)
        act_keys = list(ACTIVITY)
        activity = st.selectbox("Alltagsaktivität (ohne Sport)", act_keys,
                                index=act_keys.index(profile["activity"]),
                                format_func=lambda a: ACTIVITY[a][1])

        st.markdown("#### Dein Ziel")
        presets = {"Abnehmen (−500)": -500, "Leicht abnehmen (−300)": -300, "Halten (±0)": 0,
                   "Aufbauen (+300)": 300, "Aufbauen (+500)": 500}
        cur_label = next((k for k, v in presets.items() if v == goal["adjustment"]), "Eigenes")
        options = list(presets) + (["Eigenes"] if cur_label == "Eigenes" else [])
        pick = st.select_slider("Kalorien-Anpassung", options=options, value=cur_label)
        adjustment = presets.get(pick, goal["adjustment"])
        tw_val = st.number_input("Wunschgewicht (kg, 0 = keins)", min_value=0.0, max_value=250.0,
                                 value=float(profile.get("targetWeight") or 0), step=0.5)
        add_ex = st.checkbox("Verbrannte Sportkalorien zum Tagesbudget addieren", value=goal["addExercise"])
        st.caption(f"≈ {weekly_change(adjustment)} kg/Woche bei dieser Anpassung.")

        st.markdown("#### Ernährungsstil & Makros")
        diet_keys = list(DIET_LABELS)
        diet = st.selectbox("Stil", diet_keys, index=diet_keys.index(goal["dietStyle"]),
                            format_func=lambda x: DIET_LABELS[x])
        mc1, mc2, mc3 = st.columns(3)
        pp = mc1.slider("Eiweiß %", 0, 100, int(goal["proteinPct"]))
        cp = mc2.slider("KH %", 0, 100, int(goal["carbsPct"]))
        fp = mc3.slider("Fett %", 0, 100, int(goal["fatPct"]))
        if pp + cp + fp != 100:
            st.warning(f"Makro-Summe = {pp + cp + fp}% (sollte 100% sein)")

        st.markdown("#### Nährwert-Ziele / -Limits")
        l1, l2, l3, l4 = st.columns(4)
        fiber_goal = l1.number_input("Ballaststoffe-Ziel (g)", min_value=0, value=int(goal["fiberGoal"]))
        sugar_lim = l2.number_input("Zucker-Limit (g)", min_value=0, value=int(goal["sugarLimit"]))
        satfat_lim = l3.number_input("ges. FS-Limit (g)", min_value=0, value=int(goal["satFatLimit"]))
        salt_lim = l4.number_input("Salz-Limit (g)", min_value=0.0, value=float(goal["saltLimit"]), step=0.5)

        if st.form_submit_button("💾 Speichern", type="primary"):
            state["profile"] = {"name": name.strip(), "sex": sex, "age": int(age), "height": int(height),
                                "weight": float(weight), "targetWeight": (float(tw_val) or None),
                                "activity": activity}
            state["goal"] = {"adjustment": int(adjustment), "proteinPct": int(pp), "carbsPct": int(cp),
                             "fatPct": int(fp), "addExercise": bool(add_ex), "dietStyle": diet,
                             "fiberGoal": int(fiber_goal), "sugarLimit": int(sugar_lim),
                             "saltLimit": float(salt_lim), "satFatLimit": int(satfat_lim)}
            save_state(state)
            st.success("Gespeichert.")
            st.rerun()
