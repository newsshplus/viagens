# viagens

Sistema de busca de passagens aereas baratas - funciona 100% gratis
sem nenhuma chave, e fica ainda melhor se voce cadastrar a Kiwi Tequila
API (tambem gratis). Roda sozinho em segundo plano via GitHub Actions, e
avisa por WhatsApp (Evolution API) quando encontra algo dentro do seu
teto de preco.

**Duas fontes combinadas** (`lib/search_sources.py`), pegando sempre a
mais barata das duas para cada combinacao de rota/data:
- **Google Flights (scraping)** - via a lib `fast-flights`, que consulta
  o mesmo endpoint que o proprio site usa, sem navegador automatizado.
  Sempre ativo, nao precisa de cadastro.
- **Kiwi Tequila API** - fonte oficial, mais estavel, com link de compra
  confiavel. So entra em acao se voce configurar `KIWI_API_KEY` (cadastro
  gratis em https://tequila.kiwi.com/). Sem a chave, o sistema ignora
  essa fonte automaticamente e segue so com o scraping - nada quebra.

## Antes de usar - seja realista com isso

- **E scraping, nao e API oficial.** O Google nao disponibiliza uma API
  publica de precos; a lib usada aqui reproduz a mesma consulta que o
  site faz. Isso funciona bem pra uso pessoal/pequena escala, mas pode
  quebrar se o Google mudar algo na pagina, ou levar bloqueio temporario
  se voce exagerar no volume de requisicoes. Por isso o script tem um
  teto (`MAX_SEARCHES_PER_PROFILE`, padrao 25 por perfil por execucao) e
  uma pausa entre requisicoes - nao remova isso sem necessidade.
- **Taxas nao vem discriminadas.** O Google Flights mostra o preco total
  ja com taxas embutidas, mas nao abre item por item cada taxa (isso so
  aparece em GDS pagos, tipo Amadeus). Se voce precisar do breakdown
  fiscal completo, a unica forma real e usar uma API paga/com cadastro.
- **O link de "comprar" nao e um deep-link exato daquele voo** - e um
  link de busca no Google Flights ja preenchido com origem, destino e
  datas, que abre com esse voo entre os resultados.
- Continua sem fazer scraping de sites que travam ainda mais (Skyscanner,
  Kayak) - o Google Flights e o que aguenta melhor esse tipo de uso.

## Estrutura

- `config/profiles.json` - suas buscas salvas (edite a vontade, ou use o
  formulario do painel web).
- `web/data/price_history.json` - historico de precos, commitado
  automaticamente pelo Action a cada execucao, e servido pelo proprio
  painel web publicado (Netlify).
- `lib/google_flights.py` - busca via scraping (sempre ativa).
- `lib/kiwi_source.py` - busca via Kiwi Tequila API (ativa so com `KIWI_API_KEY`).
- `lib/search_sources.py` - roda as duas e fica com a mais barata.
- `lib/destinations.py` - mapeamento continente -> lista de aeroportos.
- `lib/combo.py` / `lib/cruise_source.py` - itinerarios combinados voo+cruzeiro.
- `lib/whatsapp.py` - monta e envia a mensagem via Evolution API.
- `lib/store.py` - guarda e atualiza o historico de precos.
- `scripts/run_searches.py` - orquestra tudo, chamado pelo cron.
- `.github/workflows/search.yml` - o cron (a cada 6h).
- `web/index.html` - painel web com formulario de busca/cadastro.
- `netlify/functions/add-profile.js` - funcao serverless que grava o
  perfil no GitHub e dispara a busca a partir do painel.
- `netlify.toml` - config da Netlify (pasta publicada + funcoes).

## Setup do backend (GitHub Actions)

### 1. Secrets do repositorio
No GitHub: Settings -> Secrets and variables -> Actions -> New repository secret.

Obrigatorios pra receber no WhatsApp (sem eles, o sistema roda e salva o
historico normalmente, so nao envia - fica printado no log):
- `WHATSAPP_NUMBER` - seu numero, formato internacional so com numeros
  (ex: `351912345678`). Nao vai no `config/profiles.json` de proposito.
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`

Opcional, pra ativar a Kiwi como segunda fonte:
- `KIWI_API_KEY`

### 2. Teste manualmente
Aba **Actions** -> "Busca de passagens (scraping gratis)" -> **Run workflow**.
Acompanhe o log - ele imprime um resumo em JSON no final de cada execucao.

### 3. Pronto
O cron em `.github/workflows/search.yml` cuida do resto (a cada 6h, por
padrao). Ajuste a frequencia editando a linha `cron:` se quiser.

## Painel web com busca/cadastro pelo navegador

O `web/index.html` tem um formulario estilo site de companhia aerea:
voce preenche origem, destino, janela de datas, estadia, passageiros e
teto de preco, aperta **"Adicionar e buscar agora"**, e isso:

1. Grava um novo perfil em `config/profiles.json` direto no GitHub (via
   API do GitHub, chamada por uma funcao serverless do Netlify).
2. Dispara o workflow de busca imediatamente (nao espera o proximo
   agendamento de 6h).
3. O painel le `web/data/price_history.json` e mostra os resultados reais
   assim que a busca terminar - alguns minutos depois, nao instantaneo,
   porque roda no GitHub Actions, nao num servidor sempre ligado.

### Configurar a funcao serverless (obrigatorio pro botao funcionar)

1. Crie um **fine-grained personal access token** no GitHub (Settings ->
   Developer settings -> Personal access tokens -> Fine-grained tokens):
   - Repository access: so o repositorio `viagens`.
   - Permissions: **Contents** -> Read and write, **Actions** -> Read and write.
   - O token precisa pertencer a uma conta que tenha permissao de escrita no
     repositorio. Se aparecer `Resource not accessible by personal access token`,
     o token nao esta autorizado para esse repositorio ou nao possui **Contents:
     Read and write**. Crie um novo token com essas permissoes e substitua
     `GITHUB_TOKEN` no Netlify; nao basta fazer novo deploy.
2. No Netlify: **Site configuration -> Environment variables**, adicione:
   - `GITHUB_TOKEN` = o token que voce criou (marcado como **secret**)
   - `GITHUB_REPO` = `newsshplus/viagens`
   - `GITHUB_BRANCH` = `main` (opcional, esse ja e o padrao)
3. Trigger deploy de novo (Deploys -> Trigger deploy -> Deploy site) pra
   a funcao pegar as variaveis novas.

Sem isso configurado, o formulario mostra uma mensagem de erro clara em
vez de falhar silenciosamente.

## Cruzeiro e itinerarios combinados (voo + cruzeiro)

Seja direto sobre a limitacao real: nao existe hoje uma fonte gratuita
de preco de cruzeiro equivalente ao que temos pra voo. As operadoras
(MSC, Costa, Royal Caribbean etc.) nao expoem um endpoint leve como o do
Google Flights - as opcoes de mercado sao servicos pagos de scraping por
operadora (ex: Apify). Por isso `lib/cruise_source.py` esta pronto como
interface, mas devolve "sem oferta" por enquanto.

O que ja funciona: perfis com `"trip_type": "combo"` calculam os dois
trechos de voo de um itinerario aberto (voa ate o porto de embarque,
volta de voo a partir do porto de desembarque - ou o inverso) via
scraping, somam o preco dos voos, e te mandam por WhatsApp com um
lembrete pra conferir o valor do cruzeiro manualmente. Veja o exemplo
"Mediterraneo voo+cruzeiro" em `config/profiles.json`.

Quando voce quiser plugar uma fonte real de cruzeiro, tres caminhos (do
mais simples ao mais robusto), documentados dentro de `lib/cruise_source.py`:
1. Cadastro manual das promocoes que voce encontrar.
2. Scraper dedicado pra uma operadora especifica.
3. Servico de scraping como Apify (pago acima da cota gratis).

## Ajustando o volume de buscas

Cada combinacao (destino x data candidata) e uma requisicao real ao
Google Flights. Se seu perfil gera muitas combinacoes:
- diminua `window_end_days` (janela menor de datas),
- aumente o `step_days` em `candidate_dates()` no script,
- prefira `destination_type: "airport"` a `"continent"`.
