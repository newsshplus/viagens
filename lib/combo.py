"""
Itinerário combinado voo + cruzeiro: voa até o porto de embarque, faz o
cruzeiro, e volta de voo a partir do porto de desembarque (ou o inverso -
tanto faz qual perna vem primeiro, o cálculo é o mesmo).

Por enquanto o preço do cruzeiro em si ainda não vem de uma fonte real
(ver aviso em cruise_source.py) - então a notificação sai com o preço
combinado dos dois trechos de voo, e avisa claramente que falta somar o
valor do cruzeiro, com um lembrete pra você conferir manualmente até
conectarmos uma fonte de cruzeiro de verdade.

Diferente da busca de voo pura, aqui não se varre uma janela larga de
datas - o combo usa as datas exatas que você configurar no perfil
(outbound_flight_date / return_flight_date), porque cada combinação já
envolve duas buscas de voo. Isso evita explodir o número de requisições.
"""

from . import google_flights, cruise_source


def search_combo(profile):
    combo = profile["combo"]
    origin = profile["origin"]
    adults = profile["adults"]
    children_ages = profile.get("children_ages", [])
    currency = profile["currency"]

    outbound_flight = google_flights.search_one_way(
        origin, combo["embark_airport"], combo["outbound_flight_date"],
        adults, children_ages, currency,
    )
    return_flight = google_flights.search_one_way(
        combo["disembark_airport"], origin, combo["return_flight_date"],
        adults, children_ages, currency,
    )
    cruise_offer = cruise_source.search_cruise(
        combo["embark_city"], combo.get("cruise_region", ""),
        (combo["outbound_flight_date"], combo["return_flight_date"]),
        combo.get("cabin_type", "interior"), adults, children_ages, currency,
    )

    if not outbound_flight and not return_flight:
        return None  # nem os voos rolaram, não vale a pena notificar nada

    flights_total = (outbound_flight["price_total"] if outbound_flight else 0) + \
                    (return_flight["price_total"] if return_flight else 0)

    return {
        "price_total": flights_total,  # só os voos - cruzeiro ainda não entra na soma real
        "price_base": None,
        "price_taxes": [],
        "currency": currency,
        "airlines": "n/d",
        "booking_link": None,
        "source": "combo (voos via scraping + cruzeiro manual)",
        "outbound_flight": outbound_flight,
        "return_flight": return_flight,
        "cruise_offer": cruise_offer,   # None por enquanto
        "combo_meta": combo,
    }


def format_combo_message(profile_name, offer, adults, children_ages):
    combo = offer["combo_meta"]
    lines = [
        f"Painel viagens - {profile_name}",
        "",
        f"Voo + cruzeiro: {combo['embark_city']} -> {combo['disembark_city']}",
        f"Passageiros: {adults} adulto(s)" + (f" + {len(children_ages)} crianca(s)" if children_ages else ""),
        "",
    ]

    if offer["outbound_flight"]:
        lines.append(f"Voo de ida ({combo['outbound_flight_date']}): "
                     f"{offer['outbound_flight']['price_total']:.2f} {offer['currency']}")
    else:
        lines.append(f"Voo de ida ({combo['outbound_flight_date']}): não encontrado nesta execução")

    lines.append(f"Cruzeiro ({combo.get('cruise_region', 'n/d')}, cabine {combo.get('cabin_type', 'interior')}): "
                 f"{'ainda sem fonte automática - confira manualmente' if not offer['cruise_offer'] else offer['cruise_offer']['price_total']}")

    if offer["return_flight"]:
        lines.append(f"Voo de volta ({combo['return_flight_date']}): "
                     f"{offer['return_flight']['price_total']:.2f} {offer['currency']}")
    else:
        lines.append(f"Voo de volta ({combo['return_flight_date']}): não encontrado nesta execução")

    lines.append("")
    lines.append(f"Subtotal (só voos): {offer['price_total']:.2f} {offer['currency']}")
    lines.append("Falta somar o valor do cruzeiro - confira no site da operadora.")

    if offer["outbound_flight"] and offer["outbound_flight"].get("booking_link"):
        lines.append(f"Comprar voo de ida: {offer['outbound_flight']['booking_link']}")
    if offer["return_flight"] and offer["return_flight"].get("booking_link"):
        lines.append(f"Comprar voo de volta: {offer['return_flight']['booking_link']}")

    return "\n".join(lines)
