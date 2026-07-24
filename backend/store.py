"""
Historico de precos como JSON versionado no proprio repo.
Funciona como "banco de dados" persistente sem nada externo.

Cada entrada guarda:
- Rota, datas, passageiros, preco, status
- Serie temporal ao longo do tempo (campo "history")
- Status de notificacao
"""

import json
import os
from datetime import datetime, timezone

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "web", "data", "price_history.json",
)

MAX_HISTORY_POINTS = 120


def _key(origin: str, destination: str, depart_date: str, return_date: str) -> str:
    return f"{origin}|{destination}|{depart_date}|{return_date}"


def load_history() -> dict:
    """Carrega historico do arquivo JSON."""
    if not os.path.exists(DATA_PATH):
        return {}
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_history(history: dict):
    """Salva historico no arquivo JSON."""
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False, sort_keys=True)


def should_notify(
    history: dict,
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    price_total: float,
) -> bool:
    """So notifica se nunca notificou, ou se o preco caiu desde a ultima."""
    entry = history.get(_key(origin, destination, depart_date, return_date))
    if not entry or "last_notified_price" not in entry:
        return True
    return price_total < entry["last_notified_price"]


def record(
    history: dict,
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    price_total: float,
    notified: bool,
    currency: str = "EUR",
    adults: int = 1,
    children_ages: list[int] | None = None,
    mode: str = "voo",
    profile_name: str = "",
    booking_link: str | None = None,
    airlines: str | None = None,
    source: str | None = None,
    cross_ref: dict | None = None,
):
    """Registra uma busca no historico."""
    key = _key(origin, destination, depart_date, return_date)
    entry = history.get(key, {})
    previous_price = entry.get("last_price")
    now_iso = datetime.now(timezone.utc).isoformat()

    entry["origin"] = origin
    entry["destination"] = destination
    entry["depart_date"] = depart_date
    entry["return_date"] = return_date
    entry["currency"] = currency
    entry["adults"] = adults
    entry["children_ages"] = children_ages or []
    entry["mode"] = mode
    entry["profile_name"] = profile_name
    entry["last_price"] = price_total
    entry["last_checked"] = now_iso
    entry["booking_link"] = booking_link
    entry["airlines"] = airlines
    entry["source"] = source

    if cross_ref:
        entry["cross_ref"] = cross_ref

    # Serie temporal
    series = entry.get("history", [])
    series.append({"checked_at": now_iso, "price": price_total})
    entry["history"] = series[-MAX_HISTORY_POINTS:]

    # Status
    if notified:
        entry["last_notified_price"] = price_total
        entry["status"] = "notified"
    elif previous_price is not None and price_total < previous_price:
        entry["status"] = "drop"
    else:
        entry.setdefault("status", "watching")

    history[key] = entry
