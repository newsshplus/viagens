// Este arquivo existe so pra forcar um novo deploy na Vercel quando uma
// variavel de ambiente e adicionada/alterada no painel - variaveis novas
// so entram em vigor a partir do proximo build, nao no que ja esta no ar.
// Ultimo motivo: ativar GROQ_API_KEY para a analise por IA (2026-07-25).
export const REDEPLOY_MARKER = '2026-07-25T14-groq-key';
