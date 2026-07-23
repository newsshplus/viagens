"""
Guarda o historico de precos num JSON versionado no proprio repo
(web/data/price_history.json - dentro da pasta publicada pelo Netlify/
GitHub Pages de proposito, assim o painel web consegue ler os dados
reais direto, sem precisar de passo extra de copia). O workflow do
GitHub Actions commita esse arquivo de volta depois de cada execucao,
entao ele funciona como "banco de dados" persistente sem precisar de
nada externo.

Cada entrada guarda tudo que o painel web precisa exibir (rota, datas,
passageiros, preco, status) - nao so o preco.
"""

import json
import os
from datetime import datetime, timezone

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "data", "price_history.json")


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
    """So notifica se nunca notificou essa combinacao, ou se o preco caiu
    desde a ultima notificacao."""
    entry = history.get(_key(origin, destination, depart_date, return_date))
    if not entry or "last_notified_price" not in entry:
        return True
    return price_total < entry["last_notified_price"]


def record(history: dict, origin, destination, depart_date, return_date, price_total, notified: bool,
           currency="EUR", adults=1, children_ages=None, mode="voo", profile_name=""):
    key = _key(origin, destination, depart_date, return_date)
    entry = history.get(key, {})
    previous_price = entry.get("last_price")

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
    entry["last_checked"] = datetime.now(timezone.utc).isoformat()

    if notified:
        entry["last_notified_price"] = price_total
        entry["status"] = "notified"
    elif previous_price is not None and price_total < previous_price:
        entry["status"] = "drop"
    else:
        entry.setdefault("status", "watching")

    history[key] = entry
