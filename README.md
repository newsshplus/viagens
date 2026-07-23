# viagens

Sistema de busca de passagens aéreas baratas — **funciona 100% grátis
sem nenhuma chave**, e fica ainda melhor se você cadastrar a Kiwi Tequila
API (também grátis). Roda sozinho em segundo plano via GitHub Actions, e
avisa por WhatsApp (Evolution API) quando encontra algo dentro do seu
teto de preço.

**Duas fontes combinadas** (`lib/search_sources.py`), pegando sempre a
mais barata das duas para cada combinação de rota/data:
- **Google Flights (scraping)** — via a lib `fast-flights`, que consulta
  o mesmo endpoint que o próprio site usa, sem navegador automatizado.
  Sempre ativo, não precisa de cadastro.
- **Kiwi Tequila API** — fonte oficial, mais estável, com link de compra
  confiável. Só entra em ação se você configurar `KIWI_API_KEY` (cadastro
  grátis em https://tequila.kiwi.com/). Sem a chave, o sistema ignora
  essa fonte automaticamente e segue só com o scraping — nada quebra.

## Antes de usar — seja realista com isso

- **É scraping, não é API oficial.** O Google não disponibiliza uma API
  pública de preços; a lib usada aqui reproduz a mesma consulta que o
  site faz. Isso funciona bem pra uso pessoal/pequena escala, mas pode
  quebrar se o Google mudar algo na página, ou levar bloqueio temporário
  se você exagerar no volume de requisições. Por isso o script tem um
  teto (`MAX_SEARCHES_PER_PROFILE`, padrão 25 por perfil por execução) e
  uma pausa entre requisições — não remova isso sem necessidade.
- **Taxas não vêm discriminadas.** O Google Flights mostra o preço total
  já com taxas embutidas, mas não abre item por item cada taxa (isso só
  aparece em GDS pagos, tipo Amadeus). Se você precisar do breakdown
  fiscal completo, a única forma real é usar uma API paga/com cadastro
  (posso adaptar de volta pra isso quando você quiser).
- **O link de "comprar" não é um deep-link exato daquele voo** — é um
  link de busca no Google Flights já preenchido com origem, destino e
  datas, que abre com esse voo entre os resultados. Um link 100%
  determinístico pra uma oferta específica exigiria um token de sessão
  que não é estável de guardar.
- Continua sem fazer scraping de sites que travam ainda mais (Skyscanner,
  Kayak) — o Google Flights é o que aguenta melhor esse tipo de uso.

## Estrutura

- `config/profiles.json` — suas buscas salvas (edite à vontade).
- `data/price_history.json` — histórico de preços, commitado
  automaticamente pelo Action a cada execução (funciona como "banco de
  dados" sem precisar de nada externo).
- `lib/google_flights.py` — busca via scraping (sempre ativa).
- `lib/kiwi_source.py` — busca via Kiwi Tequila API (ativa só com `KIWI_API_KEY`).
- `lib/search_sources.py` — roda as duas e fica com a mais barata.
- `lib/destinations.py` — mapeamento continente → lista de aeroportos
  (útil se um dia você quiser voltar a buscar por continente — com
  scraping, recomendo manter isso pra destinos específicos, não
  continentes inteiros, pra não estourar o limite de requisições).
- `lib/whatsapp.py` — monta e envia a mensagem via Evolution API.
- `.github/workflows/search.yml` — o cron.

## Setup

### 1. Suba isto pra um repositório no GitHub chamado `viagens`
```bash
cd viagens
git init
git add .
git commit -m "primeiro commit"
gh repo create viagens --private --source=. --push
```
(ou crie o repo `viagens` pelo site do GitHub e faça `git remote add origin ...` + `git push` manualmente — não tenho como criar o repositório na sua conta por aqui, você precisa estar autenticado no GitHub pra isso.)

### 2. Configure os Secrets
No GitHub: Settings → Secrets and variables → Actions → New repository secret.

Obrigatórios pra receber no WhatsApp (sem eles, o sistema roda e salva o
histórico normalmente, só não envia — fica printado no log):
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`

Opcional, pra ativar a Kiwi como segunda fonte:
- `KIWI_API_KEY`

### 3. Edite `config/profiles.json` com seus números de WhatsApp reais

### 4. Teste manualmente
Aba **Actions** → "Busca de passagens (scraping grátis)" → **Run workflow**.
Acompanhe o log — ele imprime um resumo em JSON no final de cada execução.

### 5. Pronto
O cron em `.github/workflows/search.yml` cuida do resto (a cada 6h, por
padrão). Ajuste a frequência editando a linha `cron:` se quiser.

## Ajustando o volume de buscas

Cada combinação (destino × data candidata) é uma requisição real ao
Google Flights. Se seu perfil gera muitas combinações:
- diminua `window_end_days` (janela menor de datas),
- aumente o `step_days` em `candidate_dates()` no script (pula mais dias
  entre uma consulta e outra),
- prefira `destination_type: "airport"` (destino específico) a
  `"continent"` — continente multiplica muito rápido o número de buscas.

## Cruzeiro e itinerários combinados (voo + cruzeiro)

Seja direto sobre a limitação real: **não existe hoje uma fonte gratuita
de preço de cruzeiro** equivalente ao que temos pra voo. As operadoras
(MSC, Costa, Royal Caribbean etc.) não expõem um endpoint leve como o do
Google Flights - as opções de mercado são serviços pagos de scraping por
operadora (ex: Apify). Por isso `lib/cruise_source.py` está pronto como
interface, mas devolve "sem oferta" por enquanto - não é bug, é honestidade
sobre o que dá pra automatizar de graça agora.

O que **já funciona**: perfis com `"trip_type": "combo"` calculam os dois
trechos de voo de um itinerário aberto (voa até o porto de embarque, volta
de voo a partir do porto de desembarque - ou o inverso, a ordem não
importa pro cálculo) via scraping, somam o preço dos voos, e te mandam por
WhatsApp com um lembrete pra conferir o valor do cruzeiro manualmente no
site da operadora. Veja o exemplo "Mediterrâneo voo+cruzeiro" em
`config/profiles.json`.

Diferente da busca de voo normal, o combo usa datas fixas que você define
no perfil (não varre uma janela larga), porque cada verificação já envolve
duas buscas de voo.

Quando você quiser plugar uma fonte real de cruzeiro, três caminhos (do
mais simples ao mais robusto), documentados dentro de `lib/cruise_source.py`:
1. Cadastro manual das promoções que você encontrar (o sistema só cuida do
   WhatsApp).
2. Scraper dedicado pra uma operadora específica (funciona, mas quebra
   fácil a cada mudança de layout do site).
3. Serviço de scraping como Apify (mais robusto, pago acima da cota grátis).

Me chame quando decidir qual caminho seguir que eu implemento a busca real.

## Quando migrar pra API paga/com cadastro

Se em algum momento você quiser preço com taxas 100% discriminadas, mais
estabilidade (sem risco de bloqueio) e volume maior de buscas, dá pra
plugar de volta fontes como Amadeus, Kiwi ou Travelpayouts (grátis com
cadastro, mais robustas que scraping puro) — a estrutura do projeto foi
pensada pra isso: é só trocar o conteúdo de `lib/google_flights.py` por
chamadas a essas APIs, o resto (`store.py`, `whatsapp.py`,
`destinations.py`, o workflow) continua igual.
