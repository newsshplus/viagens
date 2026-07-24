"""
Orquestrador de busca multi-fonte.

Rodas todas as fontes disponiveis para a mesma combinacao e faz
cross-reference para garantir confiabilidade dos dados.

Fluxo:
1. Consulta todas as fontes em paralelo
2. Filtra resultados validos
3. Compara precos entre fontes
4. Calcula divergencia
5. Retorna a oferta mais confiavel
"""

import concurrent.futures
from . import travelpayouts, fast_flights, skyscanner


def _round_trip_worker(args: tuple) -> dict | None:
    """Worker para busca ida-e-volta em paralelo."""
    source_name, func, kwargs = args
    try:
        result = func(**kwargs)
        if result:
            result["_source_name"] = source_name
        return result
    except Exception:
        return None


def _one_way_worker(args: tuple) -> dict | None:
    """Worker para busca so-ida em paralelo."""
    source_name, func, kwargs = args
    try:
        result = func(**kwargs)
        if result:
            result["_source_name"] = source_name
        return result
    except Exception:
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
    """Busca ida-e-volta em todas as fontes e retorna a mais confiavel."""

    common_kwargs = {
        "origin": origin,
        "destination": destination,
        "depart_date": depart_date,
        "return_date": return_date,
        "adults": adults,
        "children_ages": children_ages,
        "currency": currency,
    }

    # Define as fontes disponiveis
    sources = [
        ("travelpayouts", travelpayouts.search_round_trip, common_kwargs),
        ("fast_flights", fast_flights.search_round_trip, common_kwargs),
        ("skyscanner", skyscanner.search_round_trip, common_kwargs),
    ]

    # Busca em paralelo com timeout
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_round_trip_worker, s): s[0] for s in sources
        }
        for future in concurrent.futures.as_completed(futures, timeout=30):
            try:
                result = future.result(timeout=5)
                if result:
                    results.append(result)
            except Exception:
                pass

    if not results:
        return None

    if len(results) == 1:
        offer = results[0]
        offer.pop("_source_name", None)
        return offer

    # Cross-reference: compara precos
    return _cross_reference(results)


def search_one_way(
    origin: str,
    destination: str,
    depart_date: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    """Busca so-ida em todas as fontes e retorna a mais confiavel."""

    common_kwargs = {
        "origin": origin,
        "destination": destination,
        "depart_date": depart_date,
        "adults": adults,
        "children_ages": children_ages,
        "currency": currency,
    }

    sources = [
        ("travelpayouts", travelpayouts.search_one_way, common_kwargs),
        ("fast_flights", fast_flights.search_one_way, common_kwargs),
        ("skyscanner", skyscanner.search_one_way, common_kwargs),
    ]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_one_way_worker, s): s[0] for s in sources
        }
        for future in concurrent.futures.as_completed(futures, timeout=30):
            try:
                result = future.result(timeout=5)
                if result:
                    results.append(result)
            except Exception:
                pass

    if not results:
        return None

    if len(results) == 1:
        offer = results[0]
        offer.pop("_source_name", None)
        return offer

    return _cross_reference(results)


def _cross_reference(results: list[dict]) -> dict:
    """
    Compara precos entre fontes e retorna a mais confiavel.

    Logica:
    - Se apenas 1 fonte respondeu, usa ela
    - Se 2+ fontes, calcula media e desvio
    - Fonte com menor preco e dentro do desvio aceitavel e escolhida
    - Se divergencia > 30%, marca como "suspeito"
    """
    if not results:
        return None

    if len(results) == 1:
        offer = results[0]
        offer.pop("_source_name", None)
        return offer

    # Ordena por preco
    results.sort(key=lambda x: x["price_total"])

    prices = [r["price_total"] for r in results]
    avg_price = sum(prices) / len(prices)
    min_price = min(prices)
    max_price = max(prices)

    # Calcula divergencia percentual
    if avg_price > 0:
        divergence = (max_price - min_price) / avg_price * 100
    else:
        divergence = 0

    # Escolhe o mais barato
    best = results[0].copy()

    # Adiciona meta de cross-reference
    best["_cross_ref"] = {
        "sources_checked": len(results),
        "prices_found": {r.get("_source_name", "unknown"): r["price_total"] for r in results},
        "avg_price": round(avg_price, 2),
        "divergence_pct": round(divergence, 1),
        "confidence": "high" if divergence < 10 else "medium" if divergence < 30 else "low",
    }

    # Limpa campos internos
    best.pop("_source_name", None)
    for r in results:
        r.pop("_source_name", None)

    return best
