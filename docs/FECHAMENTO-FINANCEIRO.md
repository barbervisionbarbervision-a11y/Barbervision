# Fechamento financeiro

Última atualização documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Decisão e limite do módulo

O Barber Vision terá um fechamento mensal para organizar o movimento da barbearia e facilitar a conferência pelo contador. O nome correto desta frente é **fechamento financeiro e fiscal**, não “imposto de renda mensal”. Imposto de renda da pessoa física do dono, obrigações da empresa e fechamento gerencial são assuntos diferentes.

O contrato atual é deliberadamente restrito:

- soma e concilia lançamentos gerenciais informados no navegador;
- separa receita de **serviços** e de **produtos**;
- registra como contexto declarado o porte, a natureza jurídica e o regime tributário;
- fecha uma competência apenas quando não há recebimento pendente ou divergente;
- gera um CSV gerencial para conferência humana;
- **não calcula nem estima tributos**;
- **não calcula lucro**;
- **não transmite DAS, PGDAS-D, declaração ou qualquer obrigação**;
- **não gera guia oficial, recibo fiscal ou comprovante de pagamento**;
- **não substitui o contador nem os sistemas oficiais**.

O app não deve prometer “pagamento exato” a partir de uma escolha como MEI, ME ou LTDA. Um valor só poderá ser rotulado como oficial no futuro se vier de um serviço oficial ou parceiro contábil autorizado, com recibo e rastreabilidade. Até essa integração existir, o produto entrega somente organização gerencial e exportação.

## Termos empresariais separados

Os três conceitos abaixo não são intercambiáveis:

| Conceito | Exemplos na interface atual | Uso no protótipo |
| --- | --- | --- |
| Porte/enquadramento | MEI, ME, EPP, outro | Contexto declarado no relatório |
| Natureza jurídica | Empresário Individual, Sociedade Limitada (LTDA/SLU), outra | Contexto declarado no relatório |
| Regime tributário | SIMEI/MEI, Simples Nacional, Lucro Presumido, Lucro Real, outro | Contexto declarado no relatório |

ME e EPP são enquadramentos de porte; LTDA é uma natureza jurídica. Nenhum desses campos, isolado ou combinado, autoriza o Barber Vision a escolher alíquota, anexo, base de cálculo ou obrigação. O enquadramento real precisa ser confirmado pelo contador e, quando houver integração futura, validado na fonte oficial.

Referência institucional: [Tipos de pessoas jurídicas e enquadramentos](https://www.gov.br/empresas-e-negocios/pt-br/drei/orientacoes-de-abertura/tipos-de-pessoas-juridicas).

## Situação do protótipo local

A tela está em `/barbeiro/financeiro`, aparece no menu como **Fechamento** e continua usando `useSessaoDono` como guarda de UX do fallback demonstrativo. No modo Supabase configurado, a rota também está sob layouts de servidor que validam sessão/membership e exigem dono com AAL2. O Auth SSR foi validado localmente, mas não substitui autorização nas futuras operações financeiras nem cria trilha persistente.

Sem variáveis do Supabase, o desenvolvimento usa a sessão demo; em produção, `/barbeiro/*` é bloqueado por padrão. Toda a operação financeira descrita aqui continua no navegador. A baseline de banco e o rollback/roll-forward 8–4 passam; a auditoria existente não cria trilha financeira persistente.

O estado fica em `localStorage`, separado por slug demonstrativo e competência:

```text
barbervision:financeiro:v1:<slug-codificado>:AAAA-MM
barbervision:financeiro-perfil:v1:<slug-codificado>
```

O contrato está em `lib/fechamentoFinanceiro.js`, versão `1`. Não há leitura ou escrita de dados financeiros no Supabase, Storage, NFS-e, banco, maquininha, conta bancária, Receita Federal, prefeitura ou sistema do contador. Os dados não sincronizam entre aparelhos, não têm backup e devem ser fictícios nesta fase.

Ao abrir a competência atual sem dado salvo, a tela cria seis lançamentos demonstrativos. Outras competências começam vazias; o dono também pode restaurar exemplos de forma explícita. Exemplos podem ser removidos sem apagar lançamentos manuais.

## Dados empresariais atuais

O perfil local registra:

- nome empresarial;
- município/UF;
- porte declarado;
- natureza jurídica declarada;
- regime tributário declarado;
- nome do contador, opcional;
- versão e data de atualização.

O protótipo não consulta CNPJ nem comprova esses valores. Para fechar o mês, porte, natureza jurídica e regime não podem permanecer como “não informado”. Essa exigência melhora a qualidade do relatório, mas **não dispara cálculo tributário**. O perfil salvo é copiado como snapshot para a competência fechada, de modo que uma alteração posterior não reescreva silenciosamente o contexto do CSV histórico.

## Lançamento gerencial atual

Cada lançamento normalizado contém:

- identificador local;
- data pertencente à competência;
- classificação `servico` ou `produto`;
- descrição e profissional opcional;
- forma de pagamento;
- valor bruto, desconto, estorno e taxa de pagamento em centavos;
- valor recebido opcional, data e referência de conciliação;
- situação e número opcional do documento;
- status ativo ou cancelado;
- motivo do cancelamento;
- origem demonstrativa ou manual local;
- timestamps de criação e atualização.

Uma venda mista deve ser registrada em duas linhas: serviço e produto. “Situação do documento” é somente uma anotação; marcar **Emitido** não emite, consulta ou valida uma nota fiscal.

Os cálculos existentes são apenas aritmética de conciliação:

```text
receita registrada = máximo(0, bruto - desconto - estorno)
recebimento esperado = máximo(0, receita registrada - taxa de pagamento)
diferença = valor recebido - recebimento esperado
```

Sem valor recebido, o lançamento fica `pendente`. Com valor igual ao esperado, fica `conciliado`; com valor diferente, `divergente`. Cancelados são preservados no relatório, mas contribuem com zero para os totais. Taxa de pagamento não é imposto e não deve ser apresentada como dedução fiscal.

O storage limita e normaliza tamanho, quantidade de lançamentos, strings, datas, valores e IDs duplicados. Existe controle otimista por `revisao`: se outra aba alterou o mês, a escrita é recusada até recarregar. Um JSON corrompido não é sobrescrito automaticamente; a tela oferece uma reinicialização local destrutiva com confirmação.

## UX do fechamento atual

1. O dono escolhe a competência.
2. Confirma os dados empresariais declarados.
3. Adiciona ou edita lançamentos de serviço e produto.
4. Registra descontos, estornos, taxa do meio de pagamento e valor recebido.
5. Confere documento e referência de conciliação.
6. Corrige divergências ou usa **Conciliar esperado** somente após conferir o recebimento real.
7. Cancela uma linha com justificativa, sem apagá-la do histórico local.
8. Fecha o mês quando existe ao menos um lançamento ativo e todos estão conciliados.
9. Baixa o CSV e o encaminha ao contador.
10. Se necessário, reabre a competência com motivo e fecha novamente depois da correção.

O fechamento muda o status local para `fechado`, guarda responsável, horário, resumo e snapshot do perfil e bloqueia a edição. A reabertura exige motivo com pelo menos cinco caracteres e acrescenta um evento local. Esses eventos melhoram a demonstração, mas não são prova de auditoria: ficam no mesmo `localStorage` adulterável que os demais dados.

O CSV pode ser baixado enquanto o mês está aberto, claramente como **prévia**, ou depois do fechamento local. Ele usa UTF-8 com BOM, ponto e vírgula e proteção básica contra fórmulas iniciadas por caracteres perigosos. O arquivo contém aviso de que não calcula tributos nem substitui guia oficial, perfil declarado, resumo, conciliação e linhas do mês.

## Estimativa e documento oficial

Hoje não existe estimativa tributária nem obrigação oficial no Barber Vision. A separação abaixo é um contrato para evolução futura:

| Categoria | Origem permitida | Rótulo obrigatório | Pode ser paga/transmitida? |
| --- | --- | --- | --- |
| Gerencial local | Lançamentos do protótipo | Relatório gerencial / prévia | Não |
| Estimativa futura | Motor fiscal ou parceiro contábil identificado, com premissas e versão | Estimativa não oficial | Não diretamente; exige conferência |
| Obrigação oficial futura | Retorno de serviço oficial ou parceiro autorizado, com recibo | Documento/guia oficial | Somente após aprovação e conforme o documento |

O Barber Vision não deve implementar uma tabela fixa de alíquotas nem derivar valor apenas do regime declarado. Se uma estimativa externa for incorporada, ela precisa registrar provedor, versão de regras, competência, dados usados, hipóteses, alertas, horário e validade. Deve permanecer visual e estruturalmente diferente de um documento oficial.

Um artefato oficial futuro precisa armazenar a identificação da fonte, recibo/protocolo, competência, vencimento, hash do arquivo, status e vínculo com a aprovação correspondente. A apresentação nunca deve transformar um PDF importado manualmente em “oficial verificado” sem validação de origem.

## Fluxo futuro seguro

O fluxo alvo é humano no circuito e não transmite silenciosamente ao virar o mês:

```text
Mês aberto
  → conciliação concluída
  → pacote preparado para o contador
  → contador solicita correção ou aprova
  → dono autoriza a ação específica
  → serviço oficial/parceiro autorizado processa
  → recibo e documento retornam
  → pagamento é conciliado
  → competência é bloqueada e auditada
```

Regras mínimas:

- somente o dono vê o fechamento completo no escopo atual;
- no futuro, `contador` deve ser um papel separado, limitado às barbearias e competências autorizadas;
- funcionário não recebe acesso a faturamento integral, perfil fiscal, documentos ou credenciais;
- aprovação do contador e autorização do dono são eventos diferentes;
- transmissão, retificação, reabertura e cancelamento exigem ação explícita e idempotente;
- retorno técnico não equivale a aceitação oficial; o status precisa distinguir enviado, processando, aceito, rejeitado, retificado, vencido e pago;
- nenhuma senha Gov.br deve ser armazenada ou solicitada pelo Barber Vision;
- autorização/procuração deve usar o fluxo oficial, escopo mínimo, validade e revogação;
- certificados, tokens e segredos ficam em cofre server-side; o banco guarda apenas referências e metadados seguros;
- falhas, retries e webhooks não podem duplicar declaração, guia ou pagamento;
- regras e integrações precisam ser versionadas por vigência, especialmente durante mudanças regulatórias.

A transmissão do PGDAS-D possui caráter declaratório e pode constituir confissão de dívida. Por isso, uma integração futura precisa de aprovação explícita e validação contábil, não de um job automático de fim de mês. Referência: [Declarações mensais do Simples Nacional](https://www.gov.br/pt-br/servicos/declarar-apuracoes-mensais-do-simples-nacional).

## Dados mínimos para a evolução fiscal

Além do perfil local atual, um fechamento capaz de ser conferido por integração futura tende a exigir:

- CNPJ, razão social e estabelecimentos;
- situação cadastral, porte, natureza e regime com fonte e vigência;
- CNAEs, atividades fiscais e códigos de serviço;
- inscrições municipal e estadual quando aplicáveis;
- separação de serviços e mercadorias;
- documentos fiscais, cancelamentos, substituições e retenções;
- receita por estabelecimento, atividade e competência;
- regime de reconhecimento de receita confirmado pelo contador;
- recebimentos, taxas e conciliação bancária/operadora;
- folha, pró-labore e demais bases quando aplicáveis ao enquadramento;
- ajustes com justificativa e evidência;
- declarações anteriores, recibos, guias e pagamentos;
- contador responsável e escopo de autorização.

Essa lista é um envelope de dados, não uma fórmula. Campos aplicáveis e regras devem vir do contador e da integração oficial contratada.

## Entidades futuras

O modelo persistente tende a separar:

- `perfis_fiscais_empresa` e suas versões por vigência;
- `estabelecimentos`;
- `atividades_fiscais`;
- `lancamentos_financeiros`;
- `documentos_fiscais` e eventos de cancelamento/substituição;
- `conciliacoes_recebimento`;
- `competencias_financeiras` e snapshots de fechamento;
- `eventos_fechamento`;
- `pacotes_contabeis` e arquivos exportados;
- `revisoes_contador` e `aprovacoes_contador`;
- `autorizacoes_dono`;
- `estimativas_tributarias_externas`, se aprovadas;
- `obrigacoes_fiscais_oficiais`;
- `recibos_transmissao`;
- `guias_oficiais`;
- `pagamentos_obrigacao`;
- `credenciais_integracao` contendo referência de cofre, nunca segredo puro;
- `eventos_auditoria` imutáveis.

Toda entidade pertence a uma barbearia não nula. Snapshots, aprovações, recibos e eventos não devem sofrer `ON DELETE CASCADE` indiscriminado; retenção fiscal, LGPD, anonimização e obrigação legal precisam ser conciliadas antes da migration.

## Integrações futuras possíveis

- NFS-e Nacional para documentos de serviço, respeitando a documentação técnica vigente;
- integrações estaduais para NF-e/NFC-e de produtos, conforme a operação e a UF;
- operadoras de pagamento e conciliação bancária autorizada;
- software do contador por arquivo ou API;
- serviços oficiais/contratados para PGMEI, PGDAS-D, DAS e recibos, somente com autorização adequada;
- consulta cadastral oficial ou provedor autorizado para validar o perfil empresarial.

Não usar scraping, automação de navegador, compartilhamento de senha ou uma integração não documentada para substituir API oficial. O protótipo atual não possui nenhuma dessas integrações.

## Critérios antes de uma entrega fiscal real

- Auth real, tenant, RLS, grants e Storage privado testados contra acesso cross-tenant;
- papel de contador e matriz de permissões aprovados;
- responsável contábil e jurídico pela especificação;
- contrato e ambiente de homologação do provedor;
- conjunto de casos validado por contador, sem inventar alíquotas;
- versionamento de regras e vigência;
- dupla confirmação para ações declaratórias;
- idempotência, assinatura, protocolo, verificação de retorno e reconciliação;
- trilha de auditoria fora do alcance de edição comum;
- criptografia, cofre de segredos, rotação e plano de incidente;
- política de retenção e descarte para dados fiscais;
- observabilidade sem registrar credenciais ou payload fiscal completo em logs;
- contingência para indisponibilidade, rejeição e retificação;
- textos revisados para não apresentar estimativa como cobrança oficial.

Até todos esses critérios existirem, **Fechar mês localmente** significa apenas bloquear e exportar um relatório gerencial no navegador.
