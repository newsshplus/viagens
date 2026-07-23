"""
Busca gratuita, sem chave de API nenhuma: usa a lib `fast-flights`, que
consulta o mesmo endpoint interno que o site do Google Flights usa (não é
um navegador automatizado, é mais leve e mais estável que isso).

Importante ser honesto sobre os limites disso:
- O Google Flights mostra o preço TOTAL (já com taxas embutidas), mas não
  discrimina cada taxa separadamente — isso o próprio site não expõe, só
  aparece em GDS pagos (Amadeus, Sabre etc). Então aqui você recebe
  "preço total com taxas incluídas", não uma lista item a item de taxas.
- O link de compra não é um deep-link exato pra aquele voo específico
  (isso exigiria um token de sessão que não é estável) — é um link de
  busca no Google Flights já preenchido com origem/destino/datas, que
  abre com aquele voo entre os resultados.
- Scraping pode falhar de vez em quando (mudança no site, rate limit).
  O código já trata isso retornando None em vez de quebrar o resto da
  busca.
"""

from datetime import datetime
from urllib.parse import quote

from fast_flights import create_query, get_flights, FlightQuery, Passengers, FlightsNotFound


def search_round_trip(origin, destination, depart_date, return_date,
                       adults=1, children_ages=None, currency="EUR"):
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
    except FlightsNotFound:
        return None
    except Exception:
        # scraping é frágil por natureza - nunca deixa isso derrubar o resto da busca
        return None

    if not results:
        return None

    best = min(results, key=lambda f: f.price)

    return {
        "price_total": float(best.price),
        "price_base": None,       # Google Flights não discrimina isso
        "price_taxes": [],        # idem
        "currency": currency,
        "airlines": ", ".join(best.airlines) if best.airlines else "n/d",
        "booking_link": build_google_flights_link(origin, destination, depart_date, return_date, adults, children_ages),
        "source": "google_flights (scraping)",
    }


def search_one_way(origin, destination, depart_date, adults=1, children_ages=None, currency="EUR"):
    """Usado nos trechos combinados voo+cruzeiro (só ida, ou só volta)."""
    children_ages = children_ages or []
    try:
        query = create_query(
            flights=[FlightQuery(date=depart_date, from_airport=origin, to_airport=destination)],
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
    except FlightsNotFound:
        return None
    except Exception:
        return None

    if not results:
        return None

    best = min(results, key=lambda f: f.price)
    d = datetime.strptime(depart_date, "%Y-%m-%d").strftime("%Y-%m-%d")
    link = f"https://www.google.com/travel/flights?q={quote(f'Flights from {origin} to {destination} on {d}')}"

    return {
        "price_total": float(best.price),
        "price_base": None,
        "price_taxes": [],
        "currency": currency,
        "airlines": ", ".join(best.airlines) if best.airlines else "n/d",
        "booking_link": link,
        "source": "google_flights (scraping)",
    }


def build_google_flights_link(origin, destination, depart_date, return_date, adults=1, children_ages=None):
    children_ages = children_ages or []
    d = datetime.strptime(depart_date, "%Y-%m-%d").strftime("%Y-%m-%d")
    r = datetime.strptime(return_date, "%Y-%m-%d").strftime("%Y-%m-%d")
    text = f"Flights from {origin} to {destination} on {d} through {r}"
    return f"https://www.google.com/travel/flights?q={quote(text)}"
