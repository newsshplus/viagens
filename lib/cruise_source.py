"""
IMPORTANTE - leia antes de usar: diferente de voo, nao existe hoje uma
fonte gratuita e estavel de preco de cruzeiro (as linhas de cruzeiro nao
tem um endpoint leve publico como o do Google Flights). As opcoes reais
de mercado sao servicos pagos de scraping por operador (ex: Apify tem
scrapers prontos para MSC, Royal Caribbean, Costa, Celebrity, Carnival,
Disney - cada um com plano proprio, nao e "gratis" de verdade em volume).

Por isso esta funcao por enquanto devolve None (nenhuma oferta) e
imprime um aviso - o sistema nao quebra, so nao encontra preco de
cruzeiro ainda. A funcao existe pronta pra voce plugar uma fonte real
quando decidir qual operador/servico usar. Tres caminhos possiveis,
do mais simples ao mais robusto:

1. Manual: voce mesmo cadastra promocoes de cruzeiro que encontrar (via
   newsletter da operadora, por exemplo) direto no price_history.json,
   e o sistema so cuida da notificacao por WhatsApp.
2. Scraper dedicado por operadora (ex: MSC, Costa) escrito a mao,
   apontando pra pagina de "ofertas" publica dela - funciona mas quebra
   facil a cada mudanca de layout, e cada operadora exige um scraper
   diferente.
3. Servico de scraping como Apify (tem scrapers prontos pra varias
   operadoras) - mais robusto, mas e pago acima da cota gratis mensal.

Me avise quando escolher um caminho que eu implemento a busca real aqui.
"""


def search_cruise(embark_port, region, depart_date_range, cabin_type="interior",
                   adults=1, children_ages=None, currency="EUR"):
    """
    embark_port: porto de embarque (ex: 'Barcelona')
    region: regiao do cruzeiro (ex: 'Mediterraneo', 'Caribe')
    depart_date_range: (data_inicio, data_fim) da janela de embarque
    cabin_type: 'interior' | 'oceanview' | 'balcony' | 'suite'

    Por enquanto sempre devolve None - ver aviso no topo do arquivo.
    """
    print(f"[cruzeiro] busca ainda nao conectada a uma fonte real "
          f"(porto={embark_port}, regiao={region}) - pulando.")
    return None
