# Consolidação ConsultaEDU

O portal reúne `/atividades/` (incluindo `/atividades/devolucao/`), `/suporte/`, `/dashboard/` e `/relatorios/`. As pastas `/consulta-email/`, `/horarios/` e `/professores/` continuam no mesmo lugar. Os quatro repositórios foram importados com seus históricos como pais dos commits de consolidação.

## Cloudflare Pages

- Repositório: `consultaedu/consultaedu.com.br`.
- Branch dedicada: `codex/consolidacao-pages`.
- Build: `npm run build`.
- Saída: `dist`.
- Node.js: 22 ou superior.
- Projeto proposto: `consultaedu-consolidado`.
- Sem segredos, banco de dados ou alteração dos Workers existentes para esta build.

Somente arquivos públicos entram em `dist`. CNAMEs antigos, auditorias, código Apps Script, Workers de referência, testes e ferramentas não entram na publicação Pages. O `CNAME` da raiz permanece no Git para manter a configuração do GitHub Pages existente.

## APIs

O módulo `pages/_worker.js` atende apenas `/api/*`, com destinos fixos para os Workers existentes. Preserva parâmetros, bytes JSON dos envios e status da origem. Não encaminha os cookies gerais, Authorization nem Origin do navegador; o gateway valida a mesma origem na entrada. Não há destino controlado pelo cliente, cache de respostas ou alteração de dados em testes automatizados. O servidor anterior continua atendendo os sites antigos e não é removido.

Relatórios usam `/api/relatorios`, encaminhada para `https://relatorio.consultaedu.com.br/api/`. Esse domínio e sua rota Worker precisam continuar ativos. A origem está protegida pelo aplicativo Access `relatorio`. O gateway exige o cabeçalho de sessão do Access e encaminha somente esse token como cookie `CF_Authorization` ao mesmo aplicativo protegido, que mantém a validação criptográfica e a política existente. Sem sessão retorna 401; não há token de serviço, origem desprotegida nem bypass.

Com autorização do responsável, o mesmo aplicativo Access foi estendido SOMENTE a `consultaedu-consolidado.pages.dev/relatorios` e `consultaedu-consolidado.pages.dev/api/relatorios`. O destino antigo, a política, a lista de usuários, o login Google e a duração de sessão foram preservados. O login autorizado foi homologado e carregou 1.972 vínculos acadêmicos. O gateway bloqueia páginas e API de relatórios nos aliases de implantação; não foram criadas regras Access com wildcard. A extensão ao hostname institucional final depende de aprovação explícita adicional e, até lá, os relatórios nesse hostname ficam bloqueados. As APIs de horários e professores continuam nos deployments Apps Script existentes.

Na conferência anterior à migração, a API atual de dashboard retornou HTML do Google com título “Página não encontrada”, apesar do Content-Type application/json. Isso é uma falha pré-existente da origem e requer o deployment Apps Script ativo para correção; a variável atual não foi alterada.

O service worker do suporte fica restrito a `/suporte/`, não armazena APIs e remove somente versões do próprio cache.

## Validação e ativação

Executar `npm run build` e `npm test`. A suíte valida o gateway, assets e links locais, exclusões de publicação e as regressões existentes do relatório. Testes de suporte e upload usam dados sintéticos com origem simulada e não criam registros reais.

Após a publicação, validar em pages.dev todas as áreas, consultas, filtros e estados de erro. Um teste real de chamado ou devolução precisa de um caso de homologação autorizado, pois grava nos serviços atuais.

O endereço desejado é `consultaedu.grupofaveni.com.br`. Associá-lo primeiro em Custom domains do novo Pages. Depois, o responsável pelo DNS institucional deve cadastrar **um CNAME**, nome `consultaedu`, destino `consultaedu-consolidado.pages.dev`, sem protocolo ou caminho, TTL 300 se disponível. Não mudar nameservers, MX ou outros registros. A consulta pública em 24/10/2026 retornou NS `ns81.domaincontrol.com` e `ns82.domaincontrol.com`, e o subdomínio desejado ainda não existia. Portanto, editar somente uma zona na HostGator pode não ter efeito: é necessário o responsável pela zona autoritativa atual. Se ele usa HostGator como painel de gestão, a ação pontual é adicionar esse CNAME no Editor de Zona; caso contrário, deve cadastrá-lo no provedor autoritativo. Se já houver registro A/AAAA/CNAME no mesmo nome no momento da ativação, registrar o valor anterior e substituir apenas esse registro após aprovação do responsável. CAA ou validações institucionais podem exigir participação adicional do administrador.

## Reversão e limites

Durante a homologação, `main`, GitHub Pages, DNS antigo, jornada-cientifica e projetos de terceiros permanecem sem alterações. O novo Pages usa a branch de migração. Não mesclar esta branch em `main` enquanto o domínio antigo continuar no GitHub Pages: esse serviço não executa `/api/*` do Pages. Uma futura mesclagem exige decidir como atender o domínio antigo ou acrescentar compatibilidade para seu ambiente.

Os backups ficam fora deste repositório: bundles Git, ZIPs, manifestos SHA-256, configurações GitHub/Pages, exportação DNS e fontes/configurações/versões dos seis Workers. Foram verificados com fsck, bundle verify e restauração independente. Configurações podem conter dados sensíveis e não devem ser versionadas. Segredos que a Cloudflare não permite ler não são recuperáveis pela API; não substituir Workers com segredos sem confirmar sua recuperação. Dados de planilhas, D1, KV e sistemas de terceiros não foram alterados nem abrangidos pelo backup Git.
