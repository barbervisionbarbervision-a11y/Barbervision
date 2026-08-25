# Decisões de produto

Estado reconciliado em **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

Este arquivo registra decisões aprovadas. Itens futuros são identificados como alvo; interfaces ou scaffolds existentes não são tratados como operação pronta.

## Proposta de valor

O Barber Vision permite que o cliente tenha uma noção visual de um corte antes do atendimento e conecta essa escolha à operação da barbearia, aos cuidados pós-corte e à venda assistida de produtos.

O produto não promete prever com perfeição o resultado físico. Textura, volume, densidade, técnica do profissional, formato real do cabelo e iluminação podem produzir diferenças. A experiência deve ser apresentada como **prévia aproximada para apoiar a conversa com o barbeiro**.

## Simulador sem dependência de IA generativa

Decisão aprovada:

- não depender de HairFastGAN ou de um servidor externo de geração;
- não usar IA generativa no fluxo ativo;
- executar a análise e a composição no navegador;
- usar MediaPipe/Canvas para preparar a selfie e ocultar aproximadamente o cabelo original;
- usar cutouts fotográficos transparentes do catálogo da barbearia;
- manter controle humano sobre o encaixe final;
- não exigir resultado hiper-realista perfeito para validar o conceito, mas evitar aparência de desenho.

Essa arquitetura reduz dependência de serviço de inferência, mas não elimina custos de hospedagem, tráfego dos modelos, armazenamento futuro, banco, Auth, e-mail e operação.

## Interação aprovada para o cliente

O preparo do cabelo original deve exigir um único comando. O cliente não deve pintar máscara, usar pincel ou realizar um recorte tipo Paint.

O posicionamento do novo corte é deliberadamente manual nesta versão:

- foto sempre à esquerda;
- painel sempre à direita, inclusive em telas estreitas;
- controles empilhados para mover, largura, altura e inclinação;
- largura e altura independentes;
- botão para restaurar a posição inicial;
- confirmação explícita em **Pronto**;
- sem arraste, slider, auto-fit, “voltar ao automático” ou ajuste escondido sobre a foto.

As análises faciais auxiliam o preparo e os gates, não definem X, Y, largura, altura ou rotação do cutout. O contrato vigente é placement manual v7. Auto-fit v6 é histórico incompatível.

### Congelamento temporário

O cabelo está aceito provisoriamente e congelado enquanto a fundação de dados, Auth, privacidade e persistência é construída. Mudanças no simulador só devem ocorrer por falha crítica ou após retomada explícita dessa frente, sempre com regressão visual.

Antes de piloto permanecem obrigatórios testes de cabelo residual, cobertura, aparelhos reais, performance e matriz visual consentida.

## Catálogo próprio por barbearia

Cada barbearia terá seu próprio catálogo dos cortes que realmente oferece. O dono é responsável por enviar, preparar, revisar e publicar o material.

Fluxo alvo:

1. dono envia uma foto própria ou autorizada;
2. original entra como material-fonte privado;
3. dono cria/revisa o recorte transparente;
4. nome, categoria, transformação inicial e revisão do molde são versionados;
5. somente um cutout aprovado, sem rosto, fundo, texto, marca ou metadados, é publicado;
6. cliente seleciona e posiciona manualmente o molde;
7. nova revisão não altera silenciosamente uma simulação já confirmada.

O editor local de contorno/pincel pertence ao dono, não ao cliente.

### Origem e direitos das imagens

Pinterest e outros sites podem servir para pesquisa visual, não como licença de incorporação. Baixar ou renomear uma imagem não concede direito comercial nem autorização da pessoa retratada.

As cinco fotos recebidas em 21/07/2026 permanecem privadas, fora de `public/`, do build e do catálogo. Foram referência ampla para assets sintéticos, não cutouts publicados. Origem, licença e autorização continuam não comprovadas.

Fonte preferencial: fotos produzidas pela própria barbearia, com autorização documentada. Um checkbox local do dono é UX demonstrativa, não prova jurídica nem controle de backend.

## Papéis e autorização

Papéis aprovados:

- **dono**: administra a própria barbearia, equipe, todos os clientes do tenant, catálogo, promoções, produtos, fidelidade, comissões, financeiro e configurações;
- **funcionário**: consulta dashboard e somente clientes/simulações/histórico/avaliações atribuídos a ele;
- **cliente**: usa a jornada pública da barbearia e vê apenas o catálogo publicado;
- **admin da plataforma**: papel futuro separado do Auth da barbearia;
- **contador**: papel futuro, opcional e limitado a barbearias/competências autorizadas.

Regras:

- o escopo é sempre a própria barbearia;
- esconder menu não é autorização;
- funcionário não edita cliente, atribuição, catálogo, produto ou financeiro nesta decisão;
- mudança de atribuição deve mudar o acesso imediatamente;
- dado do tenant não pode ser enviado ao navegador antes do filtro seguro;
- RLS e código server-side precisam negar acessos cruzados.

Há dez migrations versionadas. Em 24/08, o conjunto completo passou por reset, pgTAP 192/192, integração JWT/Storage, concorrência e rollback/roll-forward incremental 10–9; as dez também estão aplicadas no Supabase hospedado.

## Cadastro e identidade do cliente no MVP

Decisão ratificada pelo contrato atual:

- nome e telefone/WhatsApp são obrigatórios no cadastro público do MVP;
- a identidade operacional do cliente é deduplicada dentro de cada barbearia por `barbearia_id + whatsapp_normalizado`;
- `whatsapp_normalizado` contém apenas dígitos e precisa ser coerente com o valor informado;
- a mesma pessoa pode existir em tenants diferentes, sem compartilhamento automático de cadastro;
- flexibilizar o telefone ou mudar a chave de deduplicação exige decisão explícita, migration corretiva, atualização da UX e testes de colisão/migração.

Esse contrato de dados foi recriado por reset e validado por pgTAP e Data API com JWTs reais; a aplicação ainda não foi exercitada ponta a ponta. Isso não autoriza usar telefone real antes dos gates de privacidade, consentimento, retenção e segurança.

## Autenticação e MFA

Decisão técnica:

- conta individual, sem senha compartilhada;
- e-mail e senha como primeiro fator;
- e-mail confirmado antes de habilitar a conta;
- e-mail para recuperação e links de ativação;
- TOTP em aplicativo autenticador como segundo fator opcional e recomendado do dono;
- e-mail confirmado, perfil ativo, membership ativa e RLS por tenant como requisitos obrigatórios;
- logout local e global;
- eventos privilegiados auditados sem senha, token ou código.

O requisito inicial de “Gmail com código” foi traduzido em e-mail para confirmação/recuperação e TOTP opcional para MFA. O domínio não precisa ser Gmail. O usuário pode escolher **Configurar depois** e ativar o autenticador posteriormente em Segurança.

### Estado da implementação

Já existe código para cookies SSR, `getClaims()`, login, confirmação, recuperação, redefinição, ativação, TOTP, contexto de membership/tenant e guardas do dono. O bootstrap AAL1 do dono foi ajustado para chegar ao MFA sem ler dados da barbearia.

Uma quinta migration versiona `convites_barbearia`, `eventos_auditoria` append-only e nove RPCs para convite, aceite, marcação de envio/falha, provisionamento do primeiro dono e lifecycle do funcionário. Seu pgTAP dedicado, as duas corridas concorrentes, rollback/roll-forward e o E2E principal de Auth/e-mail/MFA passaram em 22/08.

Continuam faltando SMTP/redirects hospedados, recuperação de fator, proteção contra abuso, seletor de tenant, outbox/retry e transferência segura de dono. Equipe e provisionamento do primeiro dono estão operacionais apenas no ambiente local validado; produção ainda exige configuração e ensaio próprios.

### Múltiplas barbearias

Enquanto não existe seletor, o servidor escolhe temporariamente a membership ativa mais antiga. Isso é uma regra de transição, não a UX final. Nunca aceitar tenant arbitrário do cliente sem revalidar membership e RLS.

## Modos de demonstração e produção

Sem variáveis Supabase:

- desenvolvimento usa login fictício em `sessionStorage`;
- produção bloqueia rotas internas por padrão;
- uma flag server-only libera somente apresentação isolada.

Com Supabase configurado:

- Proxy e contexto server-side exigem sessão;
- a flag insegura não contorna Auth;
- `/admin` permanece bloqueado;
- dados de negócio ainda não se tornam reais automaticamente.

Decisão: nenhum modo demonstrativo pode receber dados pessoais ou comerciais reais.

## Jornada pública e persistência

A jornada pública atual valida a experiência, não uma transação:

```text
landing → cadastro → selfie → simulação → recomendação → escolha
       → contexto local → avaliação → cuidados → produtos
```

O estado fica no navegador. “Enviar”, “confirmar horário”, “avaliar” ou “reservar” não pode ser apresentado como operação persistida enquanto o servidor não confirmar.

Primeiro fluxo vertical alvo:

- slug resolve tenant ativo;
- lead/cliente é criado sob regras de privacidade;
- escolha e solicitação/agendamento são idempotentes;
- o painel autorizado recebe o registro;
- atendimento concluído gera token único/expirável de avaliação;
- avaliação, cuidados e interesse em produto ficam ligados ao tenant correto.

É preferível concluir esse recorte pequeno antes de migrar todas as telas do painel.

## Privacidade da selfie

A selfie é dado pessoal e pode ser biométrico conforme o tratamento/contexto. Processar localmente reduz exposição, mas não elimina deveres de transparência, segurança e descarte.

Decisões obrigatórias para produção:

- aviso versionado antes da captura;
- finalidade limitada à simulação/atendimento;
- coleta mínima;
- nenhuma reutilização para treinamento sem base e decisão separadas;
- retenção curta e descarte verificável;
- derivados de análise efêmeros sempre que possível;
- material-fonte de cortes separado de selfies de clientes;
- acesso, correção e exclusão;
- logs/analytics sem imagem ou telefone desnecessário;
- URLs privadas e expiráveis se houver upload.

O passo 4 ainda não começou. A Data URL em `sessionStorage` e o `limparFluxo()` final não formam uma política de privacidade.

## Cuidados pós-venda

Após a avaliação, o cliente recebe cuidados gerais relacionados ao nome/categoria do corte.

Regras aprovadas:

- lógica determinística, sem IA/API;
- não analisar selfie, couro cabeludo ou condição médica;
- não apresentar diagnóstico ou garantia de resultado;
- cuidado deve existir mesmo sem produto associado;
- incluir rotina, tipos cosméticos, práticas a evitar e manutenção;
- usar linguagem geral e orientar ajuda profissional quando houver condição de saúde.

Hoje esse fluxo é local e não comprova atendimento.

## Venda assistida de produtos

O primeiro MVP comercial não é e-commerce completo.

Fluxo aprovado:

1. dono cadastra produtos da própria barbearia;
2. liga produtos a cuidados/categorias;
3. cliente vê itens relacionados após a avaliação;
4. cliente demonstra interesse ou consulta pelo WhatsApp;
5. barbearia confirma preço e disponibilidade humanamente;
6. retirada e pagamento ocorrem presencialmente.

Não estão incluídos no primeiro MVP:

- checkout online;
- entrega;
- pagamento no aplicativo;
- reserva automática;
- baixa de estoque causada apenas por abrir WhatsApp.

Funcionário não acessa a área interna de produtos na decisão atual. Preço, disponibilidade, estoque e status precisam se tornar persistidos/auditáveis antes de uso real.

## Financeiro e fiscal

Decisão aprovada: organizar o fechamento mensal gerencial e entregar um pacote ao contador. O Barber Vision não calculará “o imposto exato” apenas com a escolha de MEI, ME ou LTDA.

Porte empresarial, natureza jurídica e regime tributário são conceitos diferentes e permanecem separados.

O módulo pode:

- classificar serviço/produto;
- registrar bruto, desconto, estorno, taxa e recebido;
- conciliar lançamentos;
- fechar/reabrir competência com justificativa;
- exportar CSV gerencial.

O módulo não pode, nesta etapa:

- calcular ou estimar tributos como valor oficial;
- gerar DAS, PGDAS-D, guia ou declaração;
- transmitir obrigação;
- guardar senha Gov.br;
- substituir contador ou portal oficial;
- chamar anotação manual de documento fiscal.

Qualquer evolução oficial exigirá integração autorizada, origem verificável, escopo mínimo, autorização separada do dono, protocolo/recibo e conciliação. Hoje todo o fechamento é `localStorage` adulterável.

## Sequência de implementação aprovada

1. segurança da demonstração — concluída para demo controlada;
2. Supabase/tenant/RLS/Storage — reset/lint/pgTAP/concorrência/JWT/Storage real validados;
3. Auth real/MFA — parcial, não validado;
4. privacidade/consentimento — não iniciado;
5. primeiro fluxo vertical persistido — não iniciado;
6. painel operacional real;
7. catálogo e pós-venda reais;
8. financeiro persistente;
9. operação e release.

Não pular o passo 4 para armazenar selfies, nem migrar todo o painel antes de provar o fluxo vertical e o isolamento.

## Fora de escopo atual

- IA generativa de cabelo por servidor;
- reconstrução 3D ou garantia do resultado físico;
- auto-fit como comportamento aprovado da versão atual;
- processamento perfeito para qualquer pose, fundo ou iluminação;
- uso de imagem de terceiro sem licença;
- publicação automática de foto bruta;
- compartilhamento entre dispositivos sem backend;
- dados reais no modo demo;
- e-commerce completo, entrega ou pagamento online;
- cálculo/transmissão de imposto ou obrigação fiscal;
- scraping ou senha Gov.br;
- painel master de produção antes de Auth e autorização próprios.

## Critérios de decisão futura

Uma nova funcionalidade deve responder antes de ser implementada:

1. quem pode executar e em qual tenant?;
2. qual dado mínimo é necessário?;
3. onde ele fica e por quanto tempo?;
4. qual evento confirma sucesso?;
5. como erro, repetição e concorrência são tratados?;
6. como o titular exclui/corrige o dado?;
7. quais testes provam negação cruzada?;
8. o texto da interface promete exatamente o que o sistema executa?;
9. qual custo operacional recorrente surge?;
10. há rollback ou recuperação?

## Referências

- [Roadmap](ROADMAP.md)
- [Plano de execução](PLANO-DE-EXECUCAO.md)
- [Fluxos e regras](FLUXOS-E-REGRAS.md)
- [Operação e segurança](OPERACAO.md)
- [Simulador de cabelo](SIMULADOR-DE-CABELO.md)
- [Assets de demonstração](ASSETS-DEMONSTRACAO.md)
- [Fechamento financeiro](FECHAMENTO-FINANCEIRO.md)
