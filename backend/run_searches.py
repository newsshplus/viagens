"""
Script principal de busca de passagens aereas.

Executa todos os perfis de config/profiles.json usando busca multi-fonte
com cross-reference, notifica por WhatsApp e atualiza o historico.

Uso: python scripts/run_searches.py
"""

import sys
import os
import json
import time
from datetime import date, timedelta

MAX_SEARCHES_PER_PROFILE = 25
SLEEP_BETWEEN_SEARCHES = 2

# Adiciona o diretorio pai ao path para importar os modulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.sources import orchestrator
from lib import whatsapp, store, destinations

PROFILES_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "config", "profiles.json",
)


def get_whatsapp_number(profile: dict) -> str:
    """Obtem numero de WhatsApp do perfil ou variavel de ambiente."""
    return profile.get("whatsapp_number") or os.environ.get("WHATSAPP_NUMBER", "")


def candidate_dates(profile: dict, step_days: int = 7) -> list[tuple[date, date]]:
    """Gera combinacoes de datas (ida, volta) dentro da janela configurada."""
    start = date.today() + timedelta(days=profile["window_start_days"])
    end = date.today() + timedelta(days=profile["window_end_days"])
    stay = profile["min_stay_days"]

    dates = []
    cursor = start
    while cursor <= end:
        dates.append((cursor, cursor + timedelta(days=stay)))
        cursor += timedelta(days=step_days)
    return dates


def run_profile(profile: dict, history: dict) -> list[dict]:
    """Executa um perfil de busca e retorna os resultados encontrados."""
    destinations_list = destinations.expand_destinations(
        profile["destination_type"], profile["destination_value"]
    )
    children_ages = profile.get("children_ages", [])
    found = []

    # Gera todas as combinacoes de destino x data
    combos = [
        (dest, d, r)
        for dest in destinations_list
        for d, r in candidate_dates(profile)
    ]

    # Limita o numero de buscas
    if len(combos) > MAX_SEARCHES_PER_PROFILE:
        print(
            f"[{profile['name']}] {len(combos)} combinacoes geradas, "
            f"cortando pras {MAX_SEARCHES_PER_PROFILE} mais proximas no tempo."
        )
        combos.sort(key=lambda c: c[1])
        combos = combos[:MAX_SEARCHES_PER_PROFILE]

    for destination, depart_d, return_d in combos:
        depart_str = depart_d.isoformat()
        return_str = return_d.isoformat()

        # Busca multi-fonte com cross-reference
        offer = orchestrator.search_round_trip(
            profile["origin"],
            destination,
            depart_str,
            return_str,
            profile["adults"],
            children_ages,
            profile["currency"],
        )

        time.sleep(SLEEP_BETWEEN_SEARCHES)

        if not offer:
            continue

        # Filtra por teto de preco
        if profile.get("max_price") and offer["price_total"] > float(profile["max_price"]):
            continue

        # Verifica se deve notificar
        notify = store.should_notify(
            history,
            profile["origin"],
            destination,
            depart_str,
            return_str,
            offer["price_total"],
        )

        # Envia WhatsApp se necessario
        if notify:
            text = whatsapp.format_offer_message(
                profile["name"],
                profile["origin"],
                destination,
                depart_str,
                return_str,
                offer,
                profile["adults"],
                children_ages,
            )
            whatsapp.send_whatsapp_message(get_whatsapp_number(profile), text)

        # Registra no historico
        store.record(
            history,
            profile["origin"],
            destination,
            depart_str,
            return_str,
            offer["price_total"],
            notify,
            currency=profile["currency"],
            adults=profile["adults"],
            children_ages=children_ages,
            mode="voo",
            profile_name=profile["name"],
            booking_link=offer.get("booking_link"),
            airlines=offer.get("airlines"),
            source=offer.get("source"),
            cross_ref=offer.get("_cross_ref"),
        )

        # Log do resultado
        xref_info = ""
        if offer.get("_cross_ref"):
            xref = offer["_cross_ref"]
            xref_info = (
                f" | xref: {xref['sources_checked']} fontes, "
                f"confianca={xref['confidence']}, "
                f"divergencia={xref['divergence_pct']}%"
            )

        print(
            f"  {profile['origin']}→{destination} {depart_str}/{return_str}: "
            f"{offer['price_total']:.2f} {offer['currency']} "
            f"({offer.get('source', '?')}) "
            f"{'🔔' if notify else ''}"
            f"{xref_info}"
        )

        found.append({
            "destination": destination,
            "depart": depart_str,
            "return": return_str,
            "price": offer["price_total"],
            "notified": notify,
            "source": offer.get("source"),
            "cross_ref": offer.get("_cross_ref"),
        })

    return found


def main():
    """Executa todos os perfis configurados."""
    print("=" * 60)
    print("VIAGENS SMART - Busca multi-fonte com cross-reference")
    print("=" * 60)

    # Carrega perfis
    if not os.path.exists(PROFILES_PATH):
        print(f"[ERRO] Arquivo de perfis nao encontrado: {PROFILES_PATH}")
        print("Crie o arquivo config/profiles.json com seus perfis de busca.")
        return

    with open(PROFILES_PATH, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    print(f"\n📋 {len(profiles)} perfil(is) carregado(s)")

    # Verifica fontes disponiveis
    from lib.sources import travelpayouts, fast_flights, skyscanner
    sources_available = []
    if travelpayouts.TRAVELPAYOUTS_TOKEN:
        sources_available.append("travelpayouts")
    else:
        print("⚠️  TRAVELPAYOUTS_TOKEN nao configurado (Travelpayouts desabilitado)")
    sources_available.append("fast_flights")  # sempre disponivel
    if skyscanner.RAPIDAPI_KEY:
        sources_available.append("skyscanner")
    else:
        print("⚠️  RAPIDAPI_KEY nao configurado (Skyscanner desabilitado)")

    print(f"🔍 Fontes ativas: {', '.join(sources_available)}")
    print()

    # Carrega historico
    history = store.load_history()
    summary = []

    # Executa cada perfil
    for i, profile in enumerate(profiles, 1):
        print(f"\n[{i}/{len(profiles)}] 🔎 {profile['name']}")
        print(f"   Rota: {profile['origin']} → {profile['destination_value']} ({profile['destination_type']})")

        try:
            results = run_profile(profile, history)
            summary.append({
                "profile": profile["name"],
                "results": results,
                "total_found": len(results),
                "total_notified": sum(1 for r in results if r["notified"]),
            })
            print(f"   ✅ {len(results)} resultado(s)")
        except Exception as e:
            summary.append({
                "profile": profile["name"],
                "error": str(e),
            })
            print(f"   ❌ Erro: {e}")

    # Salva historico
    store.save_history(history)
    print(f"\n💾 Historico salvo em web/data/price_history.json")

    # Resumo final
    print("\n" + "=" * 60)
    print("RESUMO DA EXECUCAO")
    print("=" * 60)
    total_found = 0
    total_notified = 0
    for s in summary:
        if "error" in s:
            print(f"  ❌ {s['profile']}: ERRO - {s['error']}")
        else:
            total_found += s["total_found"]
            total_notified += s["total_notified"]
            print(f"  ✅ {s['profile']}: {s['total_found']} encontrados, {s['total_notified']} notificados")

    print(f"\n  Total: {total_found} ofertas, {total_notified} notificacoes enviadas")
    print(f"\n{json.dumps(summary, indent=2, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
