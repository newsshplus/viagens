import os
import requests

EVOLUTION_API_URL = os.environ.get("EVOLUTION_API_URL", "").rstrip("/")
EVOLUTION_API_KEY = os.environ.get("EVOLUTION_API_KEY")
EVOLUTION_INSTANCE = os.environ.get("EVOLUTION_INSTANCE")


def send_whatsapp_message(number: str, text: str) -> bool:
    """
    Payload no formato mais comum da Evolution API (v1/v2).
    Se a sua instância usa um schema diferente, ajuste o 'json=' abaixo
    conforme o Swagger da sua própria instância — isso varia entre versões.
    """
    if not (EVOLUTION_API_URL and EVOLUTION_API_KEY and EVOLUTION_INSTANCE):
        print("Evolution API não configurada - mensagem não enviada.")
        return False

    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    payload = {"number": number, "text": text}

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=15)
        r.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Erro ao enviar WhatsApp para {number}: {e}")
        return False


def format_offer_message(profile_name, origin, destination, depart_date, return_date,
                          offer, adults, children_ages) -> str:
    lines = [
        f"✈️ *{profile_name}* — preço encontrado!",
        "",
        f"*Rota:* {origin} → {destination} → {origin}",
        f"*Ida:* {depart_date}   *Volta:* {return_date}",
        f"*Passageiros:* {adults} adulto(s)" + (f" + {len(children_ages)} criança(s) ({', '.join(map(str, children_ages))} anos)" if children_ages else ""),
        "",
        f"*Preço total: {offer['price_total']:.2f} {offer['currency']}*",
    ]

    if offer.get("price_base") is not None:
        lines.append(f"  • Tarifa base: {offer['price_base']:.2f} {offer['currency']}")
    for tax in offer.get("price_taxes", []) or []:
        if tax.get("amount") and float(tax["amount"]) > 0:
            lines.append(f"  • Taxa {tax.get('code', '?')}: {tax['amount']} {offer['currency']}")

    if offer.get("airlines"):
        lines.append(f"  • Companhia(s): {offer['airlines']}")

    lines.append("")
    lines.append(f"Fonte: {offer['source']}")
    if offer.get("booking_link"):
        lines.append(f"🔗 Comprar: {offer['booking_link']}")

    return "\n".join(lines)
