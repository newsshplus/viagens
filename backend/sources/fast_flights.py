"""
Scraping do Google Flights via lib fast-flights.
Consulta o mesmo endpoint interno que o site usa, sem navegador automatizado.
Gratis, mas pode quebrar se o Google mudar algo.

Limitacoes honestas:
- Preco total com taxas embutidas (nao discrimina item por item)
- Link de compra e busca preenchida, nao deep-link exato
- Scraping pode falhar de vez em quando
"""

from datetime import datetime
from urllib.parse import quote

from fast_flights import (
    create_query,
    get_flights,
    FlightQuery,
    Passengers,
    FlightsNotFound,
)


def search_round_trip(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    children_ages = children_ages or []

    try:
        query = create_query(
            flights=[
                FlightQuery(date=depart_date, from_airport=origin, to_airport=destination),
                FlightQuery(date=return_date, from_airport=destination, to_airport=origin),
            ],
            trip="round-trip",
            seat="economy",
            passengers=Passengers(
                adults=adults,
                children=len(children_ages),
                infants_in_seat=0,
                infants_on_lap=0,
            ),
            currency=currency,
        )
        results = get_flights(query)
    except (FlightsNotFound, Exception):
        return None

    if not results:
        return None

    best = min(results, key=lambda f: f.price)

    return {
        "price_total": float(best.price),
        "price_base": None,
        "price_taxes": [],
        "currency": currency,
        "airlines": ", ".join(best.airlines) if best.airlines else "n/d",
        "flight_number": "",
        "departure": depart_date,
        "return_at": return_date,
        "stops": getattr(best, "stops", 0) or 0,
        "duration_minutes": getattr(best, "duration_minutes", 0) or 0,
        "booking_link": _build_google_link(
            origin, destination, depart_date, return_date, adults, children_ages
        ),
        "source": "google_flights",
    }


def search_one_way(
    origin: str,
    destination: str,
    depart_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    children_ages = children_ages or []

    try:
        query = create_query(
            flights=[
                FlightQuery(date=depart_date, from_airport=origin, to_airport=destination)
            ],
            trip="one-way",
            seat="economy",
            passengers=Passengers(
                adults=adults,
                children=len(children_ages),
                infants_in_seat=0,
                infants_on_lap=0,
            ),
            currency=currency,
        )
        results = get_flights(query)
    except (FlightsNotFound, Exception):
        return None

    if not results:
        return None

    best = min(results, key=lambda f: f.price)
    d = datetime.strptime(depart_date, "%Y-%m-%d").strftime("%Y-%m-%d")

    return {
        "price_total": float(best.price),
        "price_base": None,
        "price_taxes": [],
        "currency": currency,
        "airlines": ", ".join(best.airlines) if best.airlines else "n/d",
        "flight_number": "",
        "departure": d,
        "return_at": None,
        "stops": getattr(best, "stops", 0) or 0,
        "duration_minutes": getattr(best, "duration_minutes", 0) or 0,
        "booking_link": f"https://www.google.com/travel/flights?q={quote(f'Flights from {origin} to {destination} on {d}')}",
        "source": "google_flights",
    }


def _build_google_link(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
) -> str:
    children_ages = children_ages or []
    d = depart_date
    r = return_date
    text = f"Flights from {origin} to {destination} on {d} through {r}"
    return f"https://www.google.com/travel/flights?q={quote(text)}"
