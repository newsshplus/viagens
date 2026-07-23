"""
IMPORTANTE - leia antes de usar: diferente de voo, não existe hoje uma
fonte gratuita e estável de preço de cruzeiro (as linhas de cruzeiro não
têm um endpoint leve público como o do Google Flights). As opções reais
de mercado são serviços pagos de scraping por operador (ex: Apify tem
scrapers prontos para MSC, Royal Caribbean, Costa, Celebrity, Carnival,
Disney - cada um com plano próprio, não é "grátis" de verdade em volume).

Por isso esta função por enquanto devolve None (nenhuma oferta) e
imprime um aviso - o sistema não quebra, só não encontra preço de
cruzeiro ainda. A função existe pronta pra você plugar uma fonte real
quando decidir qual operador/serviço usar. Três caminhos possíveis,
do mais simples ao mais robusto:

1. Manual: você mesmo cadastra promoções de cruzeiro que encontrar (via
   newsletter da operadora, por exemplo) direto no price_history.json,
   e o sistema só cuida da notificação por WhatsApp.
2. Scraper dedicado por operadora (ex: MSC, Costa) escrito à mão,
   apontando pra página de "ofertas" pública dela - funciona mas quebra
   fácil a cada mudança de layout, e cada operadora exige um scraper
   diferente.
3. Serviço de scraping como Apify (tem scrapers prontos pra várias
   operadoras) - mais robusto, mas é pago acima da cota grátis mensal.

Me avise quando escolher um caminho que eu implemento a busca real aqui.
"""


def search_cruise(embark_port, region, depart_date_range, cabin_type="interior",
                   adults=1, children_ages=None, currency="EUR"):
    """
    embark_port: porto de embarque (ex: 'Barcelona')
    region: região do cruzeiro (ex: 'Mediterrâneo', 'Caribe')
    depart_date_range: (data_inicio, data_fim) da janela de embarque
    cabin_type: 'interior' | 'oceanview' | 'balcony' | 'suite'

    Por enquanto sempre devolve None - ver aviso no topo do arquivo.
    """
    print(f"[cruzeiro] busca ainda não conectada a uma fonte real "
          f"(porto={embark_port}, região={region}) - pulando.")
    return None
