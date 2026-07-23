"""
Roda as duas fontes disponíveis para a mesma combinação (origem, destino,
datas) e fica com a oferta mais barata:

- Kiwi Tequila API: só entra em ação se KIWI_API_KEY estiver configurada.
  Fonte oficial, mais estável, com link de compra confiável.
- Google Flights (scraping): sempre disponível, sem chave nenhuma.

Se as duas responderem, compara e fica com o menor preço. Se só uma
responder, usa essa. Se nenhuma responder, devolve None (a busca daquela
combinação simplesmente não rendeu resultado desta vez).
"""

from . import kiwi_source, google_flights


def search_round_trip(origin, destination, depart_date, return_date,
                       adults=1, children_ages=None, currency="EUR"):
    kiwi_offer = kiwi_source.search_round_trip(
        origin, destination, depart_date, return_date, adults, children_ages, currency
    )
    scraping_offer = google_flights.search_round_trip(
        origin, destination, depart_date, return_date, adults, children_ages, currency
    )

    candidates = [o for o in (kiwi_offer, scraping_offer) if o]
    if not candidates:
        return None

    return min(candidates, key=lambda o: o["price_total"])
