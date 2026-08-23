# Produtos e pós-venda

Última atualização documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Objetivo

Depois da avaliação, o cliente recebe cuidados relacionados ao corte e pode conhecer produtos vendidos pela própria barbearia. O cuidado continua completo mesmo sem produto ou compra. A primeira experiência comercial é assistida: o cliente consulta pelo WhatsApp, a barbearia confirma disponibilidade e preço, e retirada/pagamento ocorrem presencialmente.

## Estado atual

O projeto possui uma **demonstração local de dados de negócio**, sem backend para catálogo, vendas ou pós-venda:

- cinco produtos fictícios iniciais;
- CRUD local de produtos em `/barbeiro/produtos`, reservado ao papel de dono;
- foto opcional, descrição, categoria, preço exibido e quantidade demonstrativa;
- vínculos estáveis entre produto e tipos de cuidado;
- ativação/ocultação e remoção local;
- número comercial configurável no mesmo navegador;
- até três produtos recomendados após a avaliação;
- abertura de `wa.me` ou cópia da solicitação.

Não existem estoque transacional, interesse/reserva persistido, pedido, checkout, pagamento, entrega, baixa de quantidade, nota fiscal ou integração com a API oficial do WhatsApp.

A autenticação e o lifecycle foram validados localmente: quando o Supabase está configurado, sessão SSR, membership e layout de servidor do dono AAL2 protegem `/barbeiro/produtos`. Sem configuração, o desenvolvimento usa o fallback demonstrativo e, em produção, o painel fica bloqueado por padrão. Em ambos os modos, catálogo, recomendações, avaliação e contato comercial permanecem locais e não passam por operações server-side de negócio.

As oito migrations estão versionadas e a baseline atual de banco passa 192/192. As demais evidências estão centralizadas em `ESTADO-VALIDACAO.md`. Os passos 4 e 5 ainda não foram implementados.

O novo fechamento em `/barbeiro/financeiro` também não transforma a vitrine em venda: produtos vendidos precisam ser lançados manualmente como `produto`. Catálogo, quantidade demonstrativa, clique no WhatsApp e fechamento local são fontes separadas; nenhuma ação na vitrine cria lançamento financeiro automático.

A confirmação da escolha cria `barbervision:pos-venda:v1:<slug codificado>` apenas com slug, corte, barba e horário. Selfie, nome, WhatsApp e código de indicação não são copiados. Quando há contexto, nota e comentário ficam nesse registro local; o plano de cuidados é derivado em memória a cada render e não é persistido. Sem contexto, a avaliação ainda permite uma demonstração genérica, mas não grava atendimento ou avaliação. Falha de `localStorage` também não é uma confirmação durável e a interface atual ainda precisa tratar esse erro antes de declarar conclusão.

O simulador anterior a essa etapa usa Face Landmarker e segmentação locais somente para preparar a selfie e ocultar o cabelo original. O novo corte parte da posição fixa do molde e recebe placement manual v7 `manual-placement-v1`; o cliente define X, Y, largura, altura e inclinação e confirma em **Pronto**. Landmarks, máscara, geometria facial, Canvas, placement e selfie não entram no registro de pós-venda nem na seleção de produtos. Os cuidados continuam derivados somente do nome/categoria do corte escolhido e não devem ser apresentados como análise anatômica, diagnóstico da selfie ou recomendação clínica.

## Arquivos e rota

| Local | Responsabilidade |
| --- | --- |
| `lib/productCatalog.js` | Contrato, exemplos, normalização, persistência, recomendação, preço e WhatsApp |
| `lib/posVenda.js` | Contexto mínimo e avaliação demonstrativa por slug |
| `lib/cuidadosCabelo.js` | Plano cosmético determinístico por nome/categoria e fallback geral |
| `app/barbeiro/(painel)/produtos/page.js` | CRUD e configuração local reservados ao dono; dados ainda demonstrativos |
| `components/VitrineProdutosCuidados.jsx` | Vitrine apresentada depois dos cuidados |
| `app/b/[barbearia]/avaliacao/page.js` | Ponto de montagem do plano e da vitrine |
| `components/Sidebar.jsx` | Item Produtos marcado como `somenteDono` |

## Persistência local

Prefixo:

```text
barbervision:produtos:v1:<slug codificado>
```

Envelope normalizado:

```js
{
  versao: 1,
  atualizadoEm: "ISO-8601",
  configuracao: {
    whatsappComercial: "5584999999999"
  },
  itens: [produto]
}
```

Produto:

```js
{
  id,
  nome,
  descricao,
  categoria,
  precoCentavos,
  estoque,
  ativo,
  cuidadoIds,
  imagemDataUrl,
  origem: "demonstracao" | "cadastro-local"
}
```

Apesar do campo se chamar `estoque`, ele representa apenas uma quantidade para a demonstração e para o filtro local. Não há movimento, concorrência, reserva, baixa ou reconciliação. O preço também é apenas o valor exibido naquele navegador.

O slug na chave evita colisão casual entre catálogos locais, mas não implementa multi-tenancy. A tela do dono administra hoje `barbeariaExemplo.slug`; outros dispositivos e navegadores não recebem alterações.

## Catálogo inicial e validações

Os cinco exemplos são fictícios:

1. Pasta matte essencial;
2. Creme definidor de cachos;
3. Protetor térmico diário;
4. Pomada flexível à base de água;
5. Shampoo suave de uso regular.

Categorias: shampoo, condicionador, finalizador, proteção para modelagem, kit e outros.

IDs de cuidado: limpeza suave, condicionamento, textura matte, proteção térmica, definição de cachos, fixação flexível, alinhamento, volume e uso geral.

Validações atuais:

- nome entre 2 e 90 caracteres na interface;
- descrição limitada a 320 caracteres;
- preço maior que zero no formulário;
- quantidade inteira igual ou maior que zero;
- ao menos um vínculo de cuidado;
- nome não duplicado no catálogo exibido;
- foto PNG, JPEG ou WebP de até 800 KB;
- WhatsApp opcional; DDD + número recebe o prefixo 55 quando aplicável.

São barreiras client-side. O módulo não verifica magic bytes da foto, autorização, tenant real ou integridade do preço/quantidade.

## Recomendação depois da avaliação

`lib/cuidadosCabelo.js` produz um `perfilId`. `recomendarProdutosParaPlano`:

1. converte o perfil em um conjunto de IDs de cuidado;
2. normaliza os produtos;
3. mantém itens ativos e com quantidade local maior que zero;
4. pontua cada interseção de cuidado e dá um ponto adicional a item universal;
5. ordena por pontuação e depois por menor preço;
6. devolve no máximo três itens.

Sem correspondência, a vitrine não aparece. Isso não remove os cuidados gerais. A seleção é determinística, não usa selfie, IA, diagnóstico ou condição clínica.

Os cinco nomes demo — Crop texturizado, Quiff moderno, Cachos taper, Slick back e Topo volumoso — têm perfis próprios. Para uploads do dono, a correspondência de categoria atual é por igualdade normalizada, não por palavra contida. Entre as categorias expostas pelo catálogo, Degradê, Social, Infantil, Cacheado e Longo possuem fallback específico; `Taper Fade`, Buzz Cut, Moicano, Americano, Disfarçado e Freestyle caem hoje no perfil geral. Esse limite precisa ser testado e substituído por IDs de cuidado explícitos por template antes de apresentar toda categoria como personalizada.

## Relação com as fotos de cortes recebidas

As cinco fontes preservadas em `private-assets/cortes-recebidos-2026-07-21/` não são fotos de produto, não entram na vitrine e não alteram os cuidados ou recomendações atuais. Elas também não são cutouts do catálogo: permanecem privadas, ignoradas pelo Git e sem direitos confirmados. Seu único uso foi como referência ampla na autoria/revisão offline dos assets sintéticos; não foram copiadas, recortadas, publicadas ou lidas em runtime.

Quando um cutout autorizado for criado no futuro, o vínculo comercial não deve depender somente do nome visível do corte nem da revisão técnica usada para encaixá-lo. Template, revisão publicada, perfil de cuidado e produto precisam usar IDs persistentes do mesmo tenant; atualizar âncoras ou placement não pode alterar silenciosamente o plano comercial. O inventário das fontes está em [Fotos reais recebidas](FOTOS-REAIS-RECEBIDAS.md), e a separação entre fontes privadas e assets públicos está em [Assets de demonstração](ASSETS-DEMONSTRACAO.md).

## WhatsApp e cópia

A mensagem contém barbearia, produto, preço exibido, corte e código local, e pede confirmação de disponibilidade/separação para retirada.

- com número válido, a ação abre `https://wa.me/<numero>?text=<mensagem>`;
- sem número, a ação tenta copiar a mensagem;
- se a Clipboard API falhar, o texto aparece em um campo selecionável.

Abrir, copiar ou enviar a mensagem não confirma entrega, disponibilidade, reserva, venda ou pagamento. Não existe webhook ou gravação de solicitação.

## Permissões

Regra aprovada nesta fase:

| Operação interna | Dono | Funcionário |
| --- | :---: | :---: |
| Ver `/barbeiro/produtos` | Sim | Não |
| Criar/editar/ativar/remover produto | Sim | Não |
| Configurar WhatsApp e vínculos de cuidado | Sim | Não |
| Ver solicitações registradas | Não existe | Não existe |

`somenteDono` no menu e `useSessaoDono` continuam sendo guardas de UX, especialmente no fallback local. No modo Supabase configurado, o layout de servidor da rota também exige membership de dono e AAL2 antes de renderizar, mas essa proteção ainda não foi validada contra um ambiente real e não autoriza qualquer operação persistente de catálogo porque essas operações ainda não existem. Em produção, API/RPC e RLS deverão negar funcionário, outro tenant e anônimo em cada leitura e escrita, independentemente da UI.

## Modelo de produção necessário

Antes de usar com vendas reais:

- persistir produtos, fotos publicadas e vínculos por tenant;
- vincular template/revisão publicada a perfis de cuidado por IDs estáveis, com histórico, sem depender do placement ou do nome exibido;
- versionar ou registrar histórico de preço/status;
- definir estoque por unidade, movimentos, reserva, expiração e concorrência;
- criar interesse/reserva ou pedido e itens com snapshot de preço;
- integrar somente vendas confirmadas ao ledger financeiro, com idempotência, referência de origem e separação entre serviço e produto;
- auditar autor, data, motivo e transições;
- manter somente o dono com leitura/escrita interna conforme a decisão atual;
- expor ao cliente apenas campos ativos por uma operação pública estreita;
- aplicar Auth, RLS, constraints, índices e testes cross-tenant;
- definir política fiscal, troca/devolução e comprovante para a venda presencial;
- tratar finalidade, transparência, retenção, exclusão e opt-out conforme LGPD;
- normalizar telefone de forma confiável e não registrar mensagem/PII em logs;
- escolher WhatsApp Business API ou pagamento online somente se houver necessidade, contrato e orçamento aprovados;
- se houver pagamento online, implementar webhook assinado/idempotente, conciliação, estorno e proteção contra duplicidade.

## Critérios mínimos de aceite em produção

- produto, preço e cuidado pertencem ao mesmo tenant;
- funcionário e outro tenant recebem negação inclusive em URL/API direta;
- preço mostrado possui fonte e data confiáveis;
- duas reservas concorrentes não geram saldo negativo;
- clique no WhatsApp continua sendo consulta até uma transição confirmada;
- pedido preserva o preço aplicado, mesmo após edição do catálogo;
- todas as mudanças críticas possuem trilha de auditoria;
- cuidado continua disponível sem compra;
- textos não fazem promessa médica, terapêutica ou de resultado;
- testes cobrem sucesso, falha, idempotência, RLS e indisponibilidade do canal.
