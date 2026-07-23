"""
Guarda o histórico de preços num JSON versionado no próprio repo
(data/price_history.json). O workflow do GitHub Actions commita esse
arquivo de volta depois de cada execução, então ele funciona como
"banco de dados" persistente sem precisar de nada externo.

Estrutura do arquivo:
{
  "LIS|CDG|2026-08-10|2026-08-17": {
      "last_price": 210.5,
      "last_notified_price": 230.0,
      "last_checked": "2026-07-22T10:00:00"
  },
  ...
}
"""

import json
import os
from datetime import datetime, timezone

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "price_history.json")


def _key(origin, destination, depart_date, return_date):
    return f"{origin}|{destination}|{depart_date}|{return_date}"


def load_history() -> dict:
    if not os.path.exists(DATA_PATH):
        return {}
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_history(history: dict):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False, sort_keys=True)


def should_notify(history: dict, origin, destination, depart_date, return_date, price_total) -> bool:
    """Só notifica se nunca notificou essa combinação, ou se o preço caiu
    desde a última notificação."""
    entry = history.get(_key(origin, destination, depart_date, return_date))
    if not entry or "last_notified_price" not in entry:
        return True
    return price_total < entry["last_notified_price"]


def record(history: dict, origin, destination, depart_date, return_date, price_total, notified: bool):
    key = _key(origin, destination, depart_date, return_date)
    entry = history.get(key, {})
    entry["last_price"] = price_total
    entry["last_checked"] = datetime.now(timezone.utc).isoformat()
    if notified:
        entry["last_notified_price"] = price_total
    history[key] = entry
