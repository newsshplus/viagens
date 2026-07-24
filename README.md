# Viagens Smart

Sistema de busca de passagens aereas baratas com **multi-fonte** e **cross-reference**.

## Fontes de dados (todas gratuitas)

| Fonte | Tipo | Custo | Dados |
|-------|------|-------|-------|
| **Travelpayouts** | API REST | Gratis (cadastro) | Cache 48h, affiliate links |
| **Fast-flights** | Scraping | Gratis | Google Flights live |
| **Skyscanner/RapidAPI** | API REST | 100 req/mes gratis | Live |
| **Groq AI** | IA | Creditos gratis | Analise de ofertas |

## Como funciona

1. **Busca multi-fonte**: Cada combinacao rota/data e consultada em ate 3 fontes simultaneamente
2. **Cross-reference**: Precos sao comparados entre fontes para validar confiabilidade
3. **Confianca**: Divergencia < 10% = alta, 10-30% = media, > 30% = baixa
4. **Monitoramento**: GitHub Actions executa a cada 6 horas
5. **Notificacao**: WhatsApp (Evolution API) quando preco cai

## Setup rapido

### 1. Clone e configure

```bash
git clone https://github.com/SEU-USER/viagens-smart.git
cd viagens-smart
cp .env.example .env
# Edite .env com suas chaves
```

### 2. Chaves obrigatorias

- **TRAVELPAYOUTS_TOKEN**: Cadastro gratis em https://www.travelpayouts.com/

### 3. Chaves opcionais (melhoram resultados)

- **RAPIDAPI_KEY**: Sky Scrapper no RapidAPI (100 req/mes gratis)
- **GROQ_API_KEY**: Analise IA (creditos gratis)

### 4. Para WhatsApp

- **WHATSAPP_NUMBER**: Seu numero (formato internacional, so numeros)
- **EVOLUTION_API_URL**, **EVOLUTION_API_KEY**, **EVOLUTION_INSTANCE**: Evolution API

## Uso local

```bash
# Instale dependencias
pip install -r backend/requirements.txt

# Execute as buscas
python backend/run_searches.py
```

## Deploy no GitHub

1. Crie um novo repositorio no GitHub
2. Envie o codigo
3. Va em Settings > Secrets and variables > Actions
4. Adicione os secrets:
   - `TRAVELPAYOUTS_TOKEN` (obrigatorio)
   - `RAPIDAPI_KEY` (opcional)
   - `GROQ_API_KEY` (opcional)
   - `WHATSAPP_NUMBER`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`

## Deploy do painel web

### Vercel
1. Conecte o repositorio no Vercel
2. A Vercel detecta o `vercel.json` automaticamente

### Netlify
1. Conecte o repositorio no Netlify
2. Build publish: `web`

## Estrutura

```
viagens-smart/
├── backend/
│   ├── lib/
│   │   ├── sources/
│   │   │   ├── travelpayouts.py    # API Travelpayouts
│   │   │   ├── fast_flights.py     # Google Flights scraping
│   │   │   ├── skyscanner.py       # Skyscanner via RapidAPI
│   │   │   └── orchestrator.py     # Cross-reference
│   │   ├── whatsapp.py             # Envio WhatsApp
│   │   ├── store.py                # Historico de precos
│   │   └── destinations.py         # Mapeamento aeroportos
│   ├── run_searches.py             # Script principal
│   └── requirements.txt
├── web/
│   ├── index.html                  # Painel web
│   └── data/
│       └── price_history.json      # Historico (commitado pelo Action)
├── config/
│   └── profiles.json               # Perfis de busca
├── .github/workflows/
│   └── search.yml                  # Cron de buscas
├── vercel.json
├── netlify.toml
└── .env.example
```

## Perfis de busca

Edite `config/profiles.json` para adicionar seus perfis:

```json
{
  "name": "Paris barato",
  "origin": "LIS",
  "destination_type": "airport",
  "destination_value": "CDG",
  "window_start_days": 3,
  "window_end_days": 90,
  "min_stay_days": 7,
  "adults": 1,
  "children_ages": [],
  "max_price": 200,
  "currency": "EUR"
}
```

### Tipos de destino

- `"airport"`: Aeroporto especifico (IATA)
- `"continent"`: Todos os hubs de um continente

### Continents disponiveis

- `europe` - 24 aeroportos
- `north_america` - 16 aeroportos
- `south_america` - 12 aeroportos
- `asia` - 16 aeroportos
- `oceania` - 6 aeroportos
- `africa` - 8 aeroportos

## Limitacoes honestas

- **Scraping pode quebrar**: O Google Flights muda o layout de vez em quando
- **Taxas nao discriminadas**: Preco total com taxas embutidas
- **Links de busca**: Links gerados sao buscas preenchidas, nao deep-links exatos
- **Rate limits**: Max 25 buscas por perfil por execucao
- **Cache**: Travelpayouts usa dados de ~48h atras
