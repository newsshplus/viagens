"""
Mapeia 'continente' -> lista de aeroportos (IATA) representativos.
É uma lista curada dos hubs principais de cada região — não é exaustiva,
mas cobre bem os destinos mais buscados. Edite à vontade para adicionar
ou remover aeroportos.

Se o perfil de busca usa destination_type='airport', esse mapeamento
não é usado — o código do aeroporto informado é usado diretamente.
"""

CONTINENTS = {
    "europe": [
        "CDG", "LHR", "BCN", "MAD", "FCO", "AMS", "FRA", "MUC",
        "LIS", "OPO", "ATH", "VIE", "PRG", "BUD", "DUB", "CPH",
        "OSL", "ARN", "WAW", "IST",
    ],
    "north_america": [
        "JFK", "LAX", "MIA", "ORD", "YYZ", "YVR", "MEX", "CUN",
        "SFO", "BOS", "ATL", "LAS",
    ],
    "south_america": [
        "GRU", "GIG", "EZE", "SCL", "BOG", "LIM", "MVD", "UIO",
    ],
    "asia": [
        "NRT", "HND", "ICN", "BKK", "SIN", "HKG", "DXB", "DOH",
        "KUL", "DEL", "BOM", "PEK", "PVG",
    ],
    "oceania": [
        "SYD", "MEL", "AKL", "BNE",
    ],
    "africa": [
        "CAI", "JNB", "CPT", "CMN", "NBO", "ADD",
    ],
}


def expand_destinations(destination_type: str, destination_value: str) -> list[str]:
    """Recebe o destino do perfil e devolve a lista de aeroportos a buscar."""
    if destination_type == "airport":
        return [destination_value.upper()]
    if destination_type == "continent":
        key = destination_value.lower().strip().replace(" ", "_")
        return CONTINENTS.get(key, [])
    raise ValueError(f"destination_type inválido: {destination_type}")
