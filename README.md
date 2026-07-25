# Viagens Smart

Sistema de busca de passagens aereas com **3 fontes reais combinadas** (Google
Flights, Skyscanner e Travelpayouts) e **analise por IA** do historico real de
precos de cada rota.

## Arquitetura

- **Frontend**: React + TypeScript + Vite + Tailwind, em `app-v2/`.
- **Backend**: funcoes serverless da Vercel, em `api/`:
  - `flights-google.js` - Google Flights via `@punitarani/fli` (sem chave).
  - `flights-skyscanner.js` - Skyscanner via RapidAPI (`RAPIDAPI_KEY`).
  - `flights-travelpayouts.js` - Travelpayouts (`TRAVELPAYOUTS_TOKEN`).
  - `flights-calendar.js` - preco por dia no calendario (Travelpayouts).
  - `ai-analysis.js` - analisa o historico real de precos de uma rota via
    Groq (`GROQ_API_KEY`, gratis) e recomenda o melhor momento pra comprar.
- **Historico de precos**: gravado no navegador (localStorage) a cada busca
  real feita - sem banco de dados externo. Cresce conforme voce usa o painel.
  Sem historico nenhum inventado: se voce nunca buscou uma rota, ela comeca
  vazia.

## Como as 3 fontes de voo funcionam juntas

Cada busca dispara as 3 fontes em paralelo (`Promise.allSettled`). Os
resultados sao unificados e ordenados por preco real, menor primeiro. Se
**nenhuma** fonte responder, o painel mostra isso claramente - nunca preenche
com dados inventados.

## Analise por IA

Na aba "Historico" de cada oferta, o botao "Analisar melhor momento pra
comprar" envia o historico real de precos daquela rota (armazenado no seu
navegador) pra um modelo Groq gratuito, que responde se o preco atual esta
bom/normal/caro frente ao que ja foi visto, e se ha algum padrao de dia da
semana perceptivel nos dados - sem inventar numeros que nao estao no
historico.

## Setup

### 1. Variaveis de ambiente na Vercel

Project Settings -> Environment Variables:

| Variavel | Obrigatoria | Onde conseguir |
|---|---|---|
| `RAPIDAPI_KEY` | Sim | rapidapi.com (Sky Scrapper, 100 req/mes gratis) |
| `TRAVELPAYOUTS_TOKEN` | Sim | travelpayouts.com |
| `GROQ_API_KEY` | Opcional (habilita a analise por IA) | console.groq.com |

### 2. Deploy

O `vercel.json` ja aponta o build pra `app-v2` (`npm install && npm run
build`, saida em `app-v2/dist`) e as funcoes em `api/` sao detectadas
automaticamente. Basta importar o repositorio na Vercel.

### 3. Local

```bash
cd app-v2
npm install
npm run dev
```

As funcoes de `api/` rodam apenas na Vercel (ou via `vercel dev` na raiz do
projeto).
