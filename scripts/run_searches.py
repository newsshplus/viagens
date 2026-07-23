"""
Executa todos os perfis de config/profiles.json usando busca gratuita
(scraping via Google Flights, sem chave de API nenhuma), notifica por
WhatsApp e atualiza web/data/price_history.json.

Uso: python scripts/run_searches.py
"""

import sys
import os
import json
import time
from datetime import date, timedelta

MAX_SEARCHES_PER_PROFILE = 25
SLEEP_BETWEEN_SEARCHES = 2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib import search_sources, whatsapp, store, combo as combo_lib
from lib.destinations import expand_destinations

PROFILES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "profiles.json")


def get_whatsapp_number(profile):
    return profile.get("whatsapp_number") or os.environ.get("WHATSAPP_NUMBER")


def candidate_dates(profile, step_days=7):
    start = date.today() + timedelta(days=profile["window_start_days"])
    end = date.today() + timedelta(days=profile["window_end_days"])
    stay = profile["min_stay_days"]

    dates = []
    cursor = start
    while cursor <= end:
        dates.append((cursor, cursor + timedelta(days=stay)))
        cursor += timedelta(days=step_days)
    return dates


def run_combo_profile(profile, history):
    offer = combo_lib.search_combo(profile)
    if not offer:
        return []

    c = profile["combo"]
    pseudo_destination = f"COMBO:{c['embark_airport']}-{c['disembark_airport']}"
    notify = store.should_notify(
        history, profile["origin"], pseudo_destination,
        c["outbound_flight_date"], c["return_flight_date"], offer["price_total"],
    )

    if notify:
        text = combo_lib.format_combo_message(
            profile["name"], offer, profile["adults"], profile.get("children_ages", [])
        )
        whatsapp.send_whatsapp_message(get_whatsapp_number(profile), text)

    store.record(
        history, profile["origin"], pseudo_destination,
        c["outbound_flight_date"], c["return_flight_date"], offer["price_total"], notify,
        currency=profile["currency"], adults=profile["adults"],
        children_ages=profile.get("children_ages", []), mode="combo", profile_name=profile["name"],
        booking_link=(offer["outbound_flight"] or {}).get("booking_link"),
        airlines="voo+cruzeiro", source=offer.get("source"),
    )

    return [{"destination": pseudo_destination, "depart": c["outbound_flight_date"],
             "return": c["return_flight_date"], "price": offer["price_total"], "notified": notify}]


def run_profile(profile, history):
    if profile.get("trip_type") == "combo":
        return run_combo_profile(profile, history)

    destinations = expand_destinations(profile["destination_type"], profile["destination_value"])
    children_ages = profile.get("children_ages", [])
    found = []

    combos = [(dest, d, r) for dest in destinations for d, r in candidate_dates(profile)]
    if len(combos) > MAX_SEARCHES_PER_PROFILE:
        print(f"[{profile['name']}] {len(combos)} combinacoes geradas, cortando pras "
              f"{MAX_SEARCHES_PER_PROFILE} mais proximas no tempo (trava MAX_SEARCHES_PER_PROFILE).")
        combos.sort(key=lambda c: c[1])
        combos = combos[:MAX_SEARCHES_PER_PROFILE]

    for destination, depart_d, return_d in combos:
        depart_str = depart_d.isoformat()
        return_str = return_d.isoformat()

        offer = search_sources.search_round_trip(
            profile["origin"], destination, depart_str, return_str,
            profile["adults"], children_ages, profile["currency"],
        )
        time.sleep(SLEEP_BETWEEN_SEARCHES)
        if not offer:
            continue

        if profile.get("max_price") and offer["price_total"] > float(profile["max_price"]):
            continue

        notify = store.should_notify(history, profile["origin"], destination, depart_str, return_str, offer["price_total"])

        if notify:
            text = whatsapp.format_offer_message(
                profile["name"], profile["origin"], destination,
                depart_str, return_str, offer, profile["adults"], children_ages,
            )
            whatsapp.send_whatsapp_message(get_whatsapp_number(profile), text)

        store.record(history, profile["origin"], destination, depart_str, return_str, offer["price_total"], notify,
                     currency=profile["currency"], adults=profile["adults"],
                     children_ages=children_ages, mode="voo", profile_name=profile["name"],
                     booking_link=offer.get("booking_link"), airlines=offer.get("airlines"),
                     source=offer.get("source"))
        found.append({"destination": destination, "depart": depart_str, "return": return_str,
                      "price": offer["price_total"], "notified": notify})

    return found


def main():
    with open(PROFILES_PATH, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    history = store.load_history()
    summary = []
    for profile in profiles:
        try:
            results = run_profile(profile, history)
            summary.append({"profile": profile["name"], "results": results})
        except Exception as e:
            summary.append({"profile": profile["name"], "error": str(e)})

    store.save_history(history)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
