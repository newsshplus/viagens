"""
Fonte via Travelpayouts API (Aviasales).
Dados em cache de ~48h, mas confiaveis e com links de afiliado.
Cadastro gratis em https://www.travelpayouts.com/
"""

import os
import requests
from datetime import datetime

TRAVELPAYOUTS_TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN")


def search_round_trip(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    if not TRAVELPAYOUTS_TOKEN:
        return None

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    params = {
        "origin": origin,
        "destination": destination,
        "departure_at": depart_date,
        "return_at": return_date,
        "currency": currency.lower(),
        "sorting": "price",
        "direct": "false",
        "limit": "10",
        "page": "1",
        "one_way": "false",
        "token": TRAVELPAYOUTS_TOKEN,
    }

    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        if data.get("success") is False:
            return None
        flights = data.get("data", [])
        if not flights:
            return None

        best = flights[0]
        depart_str = best.get("departure_at", "")[:10]
        return_str = best.get("return_at", "")[:10] if best.get("return_at") else ""

        return {
            "price_total": float(best["price"]),
            "price_base": None,
            "price_taxes": [],
            "currency": currency,
            "airlines": best.get("airline", "n/d"),
            "flight_number": best.get("flight_number", ""),
            "departure": best.get("departure_at", ""),
            "return_at": best.get("return_at"),
            "stops": best.get("transfers", 0),
            "duration_minutes": best.get("duration", 0),
            "booking_link": _build_aviasales_link(
                origin, destination, depart_str, return_str, adults
            ),
            "source": "travelpayouts",
        }
    except requests.RequestException:
        return None


def search_one_way(
    origin: str,
    destination: str,
    depart_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    if not TRAVELPAYOUTS_TOKEN:
        return None

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    params = {
        "origin": origin,
        "destination": destination,
        "departure_at": depart_date,
        "currency": currency.lower(),
        "sorting": "price",
        "direct": "false",
        "limit": "10",
        "page": "1",
        "one_way": "true",
        "token": TRAVELPAYOUTS_TOKEN,
    }

    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        if data.get("success") is False:
            return None
        flights = data.get("data", [])
        if not flights:
            return None

        best = flights[0]
        return {
            "price_total": float(best["price"]),
            "price_base": None,
            "price_taxes": [],
            "currency": currency,
            "airlines": best.get("airline", "n/d"),
            "flight_number": best.get("flight_number", ""),
            "departure": best.get("departure_at", ""),
            "return_at": None,
            "stops": best.get("transfers", 0),
            "duration_minutes": best.get("duration", 0),
            "booking_link": _build_aviasales_link(
                origin, destination, depart_date, "", adults
            ),
            "source": "travelpayouts",
        }
    except requests.RequestException:
        return None


def search_cheapest_month(
    origin: str,
    destination: str,
    month: str,
    adults: int = 1,
    currency: str = "EUR",
) -> list[dict]:
    """Busca os voos mais baratos de um mes inteiro. Usado na busca aberta."""
    if not TRAVELPAYOUTS_TOKEN:
        return []

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    params = {
        "origin": origin,
        "destination": destination,
        "departure_at": month,
        "currency": currency.lower(),
        "sorting": "price",
        "direct": "false",
        "limit": "30",
        "page": "1",
        "one_way": "true",
        "token": TRAVELPAYOUTS_TOKEN,
    }

    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        if data.get("success") is False:
            return []
        return data.get("data", [])
    except requests.RequestException:
        return []


def _build_aviasales_link(
    origin: str, destination: str, depart: str, ret: str, adults: int
) -> str:
    """Gera link direto de busca no Aviasales."""
    dep = depart.replace("-", "")[:4] if depart else ""
    ret_part = ret.replace("-", "")[:4] if ret else ""
    a = max(1, min(9, adults))
    path = f"{origin}{dep}{destination}{ret_part}{a}00"
    return f"https://www.aviasales.com/search/{path}"
