"""
Cruzeiro - stub funcional.
Diferente de voo, nao existe fonte gratuita e estavel de preco de cruzeiro.
Interface pronta para plugar qualquer fonte futura.
"""


def search_cruise(
    embark_port: str,
    region: str,
    depart_date_range: tuple[str, str],
    cabin_type: str = "interior",
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "EUR",
) -> dict | None:
    """
    Por enquanto sempre devolve None.
    Interface pronta para plugar fonte real.
    """
    print(
        f"[cruzeiro] Busca ainda nao conectada a uma fonte real "
        f"(porto={embark_port}, regiao={region}) - pulando."
    )
    return None
