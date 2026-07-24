"""
Envio de mensagens via WhatsApp (Evolution API).
Graceful degradation: se nao configurado, so imprime no log.
"""

import os
import requests

EVOLUTION_API_URL = os.environ.get("EVOLUTION_API_URL", "").rstrip("/")
EVOLUTION_API_KEY = os.environ.get("EVOLUTION_API_KEY")
EVOLUTION_INSTANCE = os.environ.get("EVOLUTION_INSTANCE")


def send_whatsapp_message(number: str, text: str) -> bool:
    """Envia mensagem de texto via WhatsApp (Evolution API)."""
    if not number:
        print("[whatsapp] Numero nao configurado - mensagem nao enviada.")
        return False
    if not (EVOLUTION_API_URL and EVOLUTION_API_KEY and EVOLUTION_INSTANCE):
        print("[whatsapp] Evolution API nao configurada - mensagem nao enviada.")
        print(f"[whatsapp] Preview:\n{text[:500]}")
        return False

    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    payload = {"number": number, "text": text}

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=15)
        r.raise_for_status()
        print(f"[whatsapp] Mensagem enviada para {number}")
        return True
    except requests.RequestException as e:
        print(f"[whatsapp] Erro ao enviar para {number}: {e}")
        return False


def format_offer_message(
    profile_name: str,
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    offer: dict,
    adults: int,
    children_ages: list[int],
) -> str:
    """Monta mensagem formatada da oferta encontrada."""
    lines = [
        f"✈️ PASSAGEM ENCONTRADA — {profile_name}",
        "",
        f"📍 Rota: {origin} → {destination} → {origin}",
        f"📅 Ida: {depart_date}   Volta: {return_date}",
        f"👥 {adults} adulto(s)",
    ]

    if children_ages:
        lines.append(f"   + {len(children_ages)} crianca(s) ({', '.join(map(str, children_ages))} anos)")

    lines.extend([
        "",
        f"💰 PRECO TOTAL: {offer['price_total']:.2f} {offer['currency']}",
    ])

    if offer.get("airlines"):
        lines.append(f"✈️ Companhia: {offer['airlines']}")

    if offer.get("stops") is not None:
        stops_text = "direto" if offer["stops"] == 0 else f"{offer['stops']} escala(s)"
        lines.append(f"🔄 Escalas: {stops_text}")

    if offer.get("duration_minutes"):
        h = offer["duration_minutes"] // 60
        m = offer["duration_minutes"] % 60
        lines.append(f"⏱️ Duracao: {h}h{m:02d}m")

    # Cross-reference info
    xref = offer.get("_cross_ref")
    if xref:
        lines.extend([
            "",
            f"📊 Cross-reference ({xref['sources_checked']} fontes verificadas):",
        ])
        for source, price in xref["prices_found"].items():
            lines.append(f"   {source}: {price:.2f}")
        lines.append(f"   Media: {xref['avg_price']:.2f}")
        confidence_emoji = {
            "high": "🟢",
            "medium": "🟡",
            "low": "🔴",
        }.get(xref["confidence"], "⚪")
        lines.append(f"   Confianca: {confidence_emoji} {xref['confidence']} ({xref['divergence_pct']}% divergencia)")

    lines.extend([
        "",
        f"📡 Fonte: {offer.get('source', 'n/d')}",
    ])

    if offer.get("booking_link"):
        lines.append(f"🔗 Comprar: {offer['booking_link']}")

    return "\n".join(lines)


def format_summary_message(profile_name: str, results: list[dict]) -> str:
    """Monta resumo de uma execucao de busca."""
    lines = [
        f"📊 RESUMO — {profile_name}",
        f"🔍 {len(results)} combinacoes encontradas",
        "",
    ]

    if results:
        cheapest = min(results, key=lambda x: x.get("price", 999999))
        lines.append(f"💰 Menor preco: {cheapest['price']:.2f} {cheapest.get('currency', 'EUR')}")
        lines.append(f"   Rota: {cheapest['origin']} → {cheapest['destination']}")
        lines.append(f"   Ida: {cheapest['depart']}  Volta: {cheapest['return']}")

    return "\n".join(lines)
