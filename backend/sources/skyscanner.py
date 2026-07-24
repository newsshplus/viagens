"""
Fonte via Skyscanner (Sky Scrapper) no RapidAPI.
~100 requisicoes/mes gratis. Dados ao vivo.
Cadastro em https://rapidapi.com/apiheya/api/sky-scrapper

Importante:
- skyId NAO e codigo IATA, e codigo de cidade do Skyscanner
- Precisa resolver o airport primeiro via /searchAirport
"""

import os
import requests

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")


def _resolve_ids(iata: str) -> dict | None:
    """Resolve codigo IATA para skyId e entityId do Skyscanner."""
    if not RAPIDAPI_KEY:
        return None

    url = "https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
    }
    params = {"query": iata}

    try:
        r = requests.get(url, headers=headers, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        places = data.get("data", [])
        if not places:
            return None
        place = places[0]
        return {
            "sky_id": place.get("skyId", ""),
            "entity_id": place.get("entityId", ""),
            "name": place.get("name", ""),
        }
    except requests.RequestException:
        return None


def search_round_trip(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    if not RAPIDAPI_KEY:
        return None

    origin_ids = _resolve_ids(origin)
    dest_ids = _resolve_ids(destination)
    if not origin_ids or not dest_ids:
        return None

    url = "https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
    }
    params = {
        "originSkyId": origin_ids["sky_id"],
        "destinationSkyId": dest_ids["sky_id"],
        "originEntityId": origin_ids["entity_id"],
        "destinationEntityId": dest_ids["entity_id"],
        "outboundDate": depart_date,
        "returnDate": return_date,
        "adults": str(adults),
        "currency": currency,
        "market": "en-US",
        "countryCode": "US",
    }

    try:
        r = requests.get(url, headers=headers, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        itineraries = (
            data.get("data", {})
            .get("itinerary", {})
            .get("bucket", [])
        )

        all_flights = []
        for bucket in itineraries:
            for item in bucket.get("items", []):
                all_flights.append(item)

        if not all_flights:
            return None

        # Ordena por preco
        all_flights.sort(
            key=lambda x: x.get("price", {}).get("raw", 999999)
        )
        best = all_flights[0]

        price = best.get("price", {}).get("raw", 0)
        if price <= 0:
            return None

        legs = best.get("legs", [])
        airline = ""
        departure = ""
        stops = 0
        duration = 0

        if legs:
            first_leg = legs[0]
            carriers = first_leg.get("carriers", {}).get("marketing", [])
            if carriers:
                airline = carriers[0].get("name", "n/d")
            departure = first_leg.get("departure", "")
            stops = first_leg.get("stopCount", 0)
            duration = first_leg.get("durationInMinutes", 0)

        return {
            "price_total": price,
            "price_base": None,
            "price_taxes": [],
            "currency": currency,
            "airlines": airline,
            "flight_number": "",
            "departure": departure,
            "return_at": return_date,
            "stops": stops,
            "duration_minutes": duration,
            "booking_link": _build_skyscanner_link(
                origin_ids, dest_ids, depart_date, return_date, currency
            ),
            "source": "skyscanner",
        }

    except (requests.RequestException, KeyError, IndexError):
        return None


def search_one_way(
    origin: str,
    destination: str,
    depart_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    if not RAPIDAPI_KEY:
        return None

    origin_ids = _resolve_ids(origin)
    dest_ids = _resolve_ids(destination)
    if not origin_ids or not dest_ids:
        return None

    url = "https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
    }
    params = {
        "originSkyId": origin_ids["sky_id"],
        "destinationSkyId": dest_ids["sky_id"],
        "originEntityId": origin_ids["entity_id"],
        "destinationEntityId": dest_ids["entity_id"],
        "outboundDate": depart_date,
        "adults": str(adults),
        "currency": currency,
        "market": "en-US",
        "countryCode": "US",
    }

    try:
        r = requests.get(url, headers=headers, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        itineraries = (
            data.get("data", {})
            .get("itinerary", {})
            .get("bucket", [])
        )

        all_flights = []
        for bucket in itineraries:
            for item in bucket.get("items", []):
                all_flights.append(item)

        if not all_flights:
            return None

        all_flights.sort(
            key=lambda x: x.get("price", {}).get("raw", 999999)
        )
        best = all_flights[0]

        price = best.get("price", {}).get("raw", 0)
        if price <= 0:
            return None

        legs = best.get("legs", [])
        airline = ""
        departure = ""
        stops = 0
        duration = 0

        if legs:
            first_leg = legs[0]
            carriers = first_leg.get("carriers", {}).get("marketing", [])
            if carriers:
                airline = carriers[0].get("name", "n/d")
            departure = first_leg.get("departure", "")
            stops = first_leg.get("stopCount", 0)
            duration = first_leg.get("durationInMinutes", 0)

        return {
            "price_total": price,
            "price_base": None,
            "price_taxes": [],
            "currency": currency,
            "airlines": airline,
            "flight_number": "",
            "departure": departure,
            "return_at": None,
            "stops": stops,
            "duration_minutes": duration,
            "booking_link": _build_skyscanner_link(
                origin_ids, dest_ids, depart_date, "", currency
            ),
            "source": "skyscanner",
        }

    except (requests.RequestException, KeyError, IndexError):
        return None


def _build_skyscanner_link(
    origin_ids: dict, dest_ids: dict, depart: str, ret: str, currency: str
) -> str:
    origin_sky = origin_ids.get("sky_id", "")
    dest_sky = dest_ids.get("sky_id", "")
    dep = depart
    ret_part = f"/{ret}" if ret else ""
    return f"https://www.skyscanner.com/transport/flights/{origin_sky}/{dest_sky}/{dep}{ret_part}/?adults=1&currency={currency}"
