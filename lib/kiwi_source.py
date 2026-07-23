"""
Fonte via Kiwi Tequila API - so entra em acao se KIWI_API_KEY estiver
configurada (nos Secrets do GitHub ou no seu .env local). Sem a chave,
essa funcao simplesmente devolve None e o sistema usa so o scraping do
Google Flights normalmente - nada quebra.

Cadastro gratis em https://tequila.kiwi.com/
"""

import os
from datetime import datetime
import requests

KIWI_API_KEY = os.environ.get("KIWI_API_KEY")


def search_round_trip(origin, destination, depart_date, return_date,
                       adults=1, children_ages=None, currency="EUR"):
    if not KIWI_API_KEY:
        return None

    children_ages = children_ages or []
    url = "https://api.tequila.kiwi.com/v2/search"
    params = {
        "fly_from": origin,
        "fly_to": destination,
        "date_from": datetime.strptime(depart_date, "%Y-%m-%d").strftime("%d/%m/%Y"),
        "date_to": datetime.strptime(depart_date, "%Y-%m-%d").strftime("%d/%m/%Y"),
        "return_from": datetime.strptime(return_date, "%Y-%m-%d").strftime("%d/%m/%Y"),
        "return_to": datetime.strptime(return_date, "%Y-%m-%d").strftime("%d/%m/%Y"),
        "adults": adults,
        "children": len(children_ages),
        "curr": currency,
        "limit": 1,
        "sort": "price",
    }
    headers = {"apikey": KIWI_API_KEY}

    try:
        r = requests.get(url, params=params, headers=headers, timeout=20)
        r.raise_for_status()
        results = r.json().get("data", [])
        if not results:
            return None
        best = results[0]
        airline_codes = {leg.get("airline", "") for leg in best.get("route", [])}
        return {
            "price_total": float(best["price"]),
            "price_base": None,
            "price_taxes": [],
            "currency": currency,
            "airlines": ", ".join(a for a in airline_codes if a) or "n/d",
            "booking_link": best.get("deep_link"),
            "source": "kiwi",
        }
    except requests.RequestException:
        return None
