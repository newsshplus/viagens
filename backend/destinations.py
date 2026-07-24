"""
Mapeamento de destinos: continente -> lista de aeroportos IATA.
Edite para adicionar ou remover aeroportos.
"""

CONTINENTS = {
    "europe": [
        "CDG", "LHR", "BCN", "MAD", "FCO", "AMS", "FRA", "MUC",
        "LIS", "OPO", "ATH", "VIE", "PRG", "BUD", "DUB", "CPH",
        "OSL", "ARN", "WAW", "IST", "ZRH", "BRU", "HEL", "NCE",
    ],
    "north_america": [
        "JFK", "LAX", "MIA", "ORD", "YYZ", "YVR", "MEX", "CUN",
        "SFO", "BOS", "ATL", "LAS", "DFW", "IAD", "SEA", "PHX",
    ],
    "south_america": [
        "GRU", "GIG", "EZE", "SCL", "BOG", "LIM", "MVD", "UIO",
        "PTY", "CCS", "ASU", "VVI",
    ],
    "asia": [
        "NRT", "HND", "ICN", "BKK", "SIN", "HKG", "DXB", "DOH",
        "KUL", "DEL", "BOM", "PEK", "PVG", "TPE", "MNL", "CGK",
    ],
    "oceania": [
        "SYD", "MEL", "AKL", "BNE", "PER", "WLG",
    ],
    "africa": [
        "CAI", "JNB", "CPT", "CMN", "NBO", "ADD", "DSS", "LOS",
    ],
}

# Mapeamento de siglas comuns para nomes (para display)
CONTINENT_NAMES = {
    "europe": "Europa",
    "north_america": "America do Norte",
    "south_america": "America do Sul",
    "asia": "Asia",
    "oceania": "Oceania",
    "africa": "Africa",
}


def expand_destinations(destination_type: str, destination_value: str) -> list[str]:
    """Recebe o destino do perfil e devolve a lista de aeroportos a buscar."""
    if destination_type == "airport":
        return [destination_value.upper()]
    if destination_type == "continent":
        key = destination_value.lower().strip().replace(" ", "_")
        return CONTINENTS.get(key, [])
    raise ValueError(f"destination_type invalido: {destination_type}")


def get_continent_name(code: str) -> str:
    """Retorna nome amigavel do continente."""
    return CONTINENT_NAMES.get(code, code)
