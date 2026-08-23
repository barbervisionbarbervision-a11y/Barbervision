# Assets de demonstração

Última atualização documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Escopo e separação

O fluxo demonstrativo usa seis imagens estáticas:

- cinco cabelos fotográficos sintéticos, versionados e transparentes;
- uma selfie fictícia.

`public/demo-cortes/` também conserva versões substituídas para rollback, mas `lib/hairCatalog.js` referencia somente as cinco revisões ativas.

Modelos de visão computacional e WASM ficam em `public/modelos/` e `public/mediapipe/wasm/`. Eles não são fotos de corte. Servem apenas ao preparo/remoção local da selfie.

As cinco fotos-fonte recebidas em 21/07/2026 continuam privadas, fora do build e do runtime. Elas foram referência ampla de estilo na autoria offline; não são usadas como overlay.

## Reconciliação transversal em 21/08/2026

Os assets ativos, seus paths, allowlist, placement manual v7 e processo de autoria permanecem congelados e inalterados; nenhum código visual foi modificado nesta revisão. Os hashes e medições abaixo são evidências históricas conferidas em **14/08/2026** e não foram recalculados em 21/08. Auth e lifecycle foram validados localmente, mas isso não transforma o catálogo local em catálogo persistido por tenant. Produtos, catálogo, finanças e demais dados de negócio continuam mocks ou `localStorage`.

Sem variáveis do Supabase, o desenvolvimento mantém o fallback demo; em produção, as áreas internas ficam bloqueadas por padrão. Em 22/08, `db:start`, reset, lint SQL, pgTAP 170/170, concorrência, rollback/roll-forward 5–4, Storage/JWT e o Auth E2E com lifecycle passaram. Os passos 4 e 5 ainda não foram implementados.

## Inventário ativo

| Corte | Asset | Dimensões | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| Crop texturizado | `public/demo-cortes/crop-texturizado-realista-v3.png` | 950 × 620 | 1.017.614 | `A1CFD4365096C1C545BA4D71F3EF141FF27066D36728FD2658A3FF8C800F27A7` |
| Quiff moderno | `public/demo-cortes/quiff-moderno-realista-v4.png` | 950 × 761 | 867.998 | `3C5EC2FFC38B531DBF154B389C52EDA961380A148395A21F6DFBD266B327181E` |
| Cachos taper | `public/demo-cortes/cachos-taper-realista-v2.png` | 936 × 738 | 884.907 | `CBF8B5993F44DC8CE4625B66446672B35E00E36DC063126BD0042C269CFFE626` |
| Slick back | `public/demo-cortes/slick-back-realista-v2.png` | 950 × 781 | 978.038 | `AD67E51DD5133519E624FE1F9145402FE8BDDA2FDA135D74CE1C8C9EAB41B755` |
| Topo volumoso | `public/demo-cortes/topo-volumoso-realista-v2.png` | 950 × 790 | 1.008.038 | `8C07BF662D51221DC0FC5E1DC4B9672173F02F63D596416AA315FDEB076C7AA4` |
| Selfie fictícia | `public/demo-cliente.png` | 1122 × 1402 | 1.991.596 | `9727D69FB17D243A0098DFD9E70D6B529E9430AC1C10FC14BAF4FD6D28FB2D7A` |

Os pixels dos quatro cantos dos cinco cabelos ativos têm alpha `0`.

Totais:

- cinco cabelos ativos: `4.756.595` bytes;
- ativos + selfie: `6.748.191` bytes;
- oito rollbacks versionados; tamanho de inventário não é usado como gate;
- doze cabelos públicos: `13.468.697` bytes;
- cabelos públicos + selfie: `15.460.293` bytes.

Arquivos sob `public/` podem acompanhar o deploy mesmo sem referência ativa. Os rollbacks devem migrar para artefato privado quando não forem mais necessários no pacote.

## Paths ativos e rollback

| Corte | Path ativo | Rollback presente, não referenciado |
| --- | --- | --- |
| Crop | `/demo-cortes/crop-texturizado-realista-v3.png` | `crop-texturizado-realista-v2.png`, `crop-texturizado.png` |
| Quiff | `/demo-cortes/quiff-moderno-realista-v4.png` | `quiff-moderno-realista-v2.png`, `quiff-moderno.png` |
| Cachos | `/demo-cortes/cachos-taper-realista-v2.png` | `cachos-taper.png` |
| Slick back | `/demo-cortes/slick-back-realista-v2.png` | `slick-back.png` |
| Topo | `/demo-cortes/topo-volumoso-realista-v2.png` | `topo-volumoso.png` |

O simulador usa allowlist literal com os cinco paths ativos. Adulterar o catálogo local não libera um rollback.

## Artefatos de visão computacional

| Conjunto | Caminho | Tamanho | Uso atual |
| --- | --- | ---: | --- |
| SelfieMulticlass | `public/modelos/selfie_multiclass_256x256.tflite` | 16.371.837 bytes | Segmentação de cabelo/`face-skin` |
| Face Landmarker | `public/modelos/face_landmarker.task` | 3.758.596 bytes | Validação anatômica do preparo |
| Runtime | `public/mediapipe/wasm/*` | 33.754.629 bytes | MediaPipe Tasks Vision same-origin |
| Total | — | 53.885.062 bytes (~51,4 MiB) | Não equivale ao download de todas as variantes |

Hashes:

- SelfieMulticlass: `C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0`;
- Face Landmarker: `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF`.

Os modelos não contêm selfies. Seu carregamento gera tráfego da hospedagem e exige cache/versionamento.

## Demonstração

`/b/[barbearia]/demo` inicia uma sessão fictícia com `/demo-cliente.png` e abre o simulador. A tela de selfie também oferece **Usar foto de demonstração**.

A selfie é fictícia e não deve ser apresentada como cliente, depoimento ou resultado real.

Os cinco cabelos ativos ficam **congelados temporariamente** para a apresentação: o conjunto está bom para demonstrar a proposta, mas continua sendo sintético e aproximado. Essa decisão não transforma os assets em catálogo de produção, não declara qualidade perfeita e não conclui a validação de piloto.

## Placement manual ativo

### Contrato

O placement atual é:

- `versao: 7`;
- `algoritmo: "manual-placement-v1"`;
- `origem: "manual-local"`;
- `automatico: false`;
- `ajusteManual.versao: 2`;
- geometria absoluta;
- publicação após **Pronto**.

Envelope confirmado:

```js
ajusteManual: {
  versao: 2,
  aplicado: true,
  confirmado: true
}
```

Enquanto o cliente edita ou recompõe, o mesmo envelope permanece com `confirmado: false` e não libera o avanço.

Não há auto-fit por landmarks/alpha.

### Base por catálogo

A posição inicial global é:

```js
{
  x: 50,
  y: 20,
  largura: 72,
  altura: 38,
  rotacao: 0
}
```

Cada item pode aplicar `transformacaoPadrao`:

```js
{
  escala,
  deslocamentoX,
  deslocamentoY,
  rotacao
}
```

Essa transformação é uma calibração fixa do asset, igual para todas as selfies. Ela não usa Face Landmarker, caixa do cabelo, âncoras da selfie ou confiança automática.

Na revisão atual, os cinco demos usam transformação neutra:

| Corte | Escala | X | Y | Rotação |
| --- | ---: | ---: | ---: | ---: |
| Crop v3 | 1 | 0 | 0 | 0 |
| Quiff v4 | 1 | 0 | 0 | 0 |
| Cachos v2 | 1 | 0 | 0 | 0 |
| Slick back v2 | 1 | 0 | 0 | 0 |
| Topo v2 | 1 | 0 | 0 | 0 |

**Restaurar posição inicial** volta a esses valores e exige nova confirmação. Não existe “Voltar ao automático”.

### Ajuste pelo cliente

| Campo | Passo | Limite |
| --- | ---: | ---: |
| X/Y | `1,5` | X `0…100`, Y `0…75` |
| Largura | `3` | `28…130` |
| Altura | `3` | `12…100` |
| Rotação | `1°` | `-45°…45°` |

Largura e altura são independentes. Cada mudança recompõe o matte do asset sem repetir Face Landmarker ou Image Segmenter.

Os demais controles ficam temporariamente bloqueados enquanto a matte é recomposta. O placement só pode ser confirmado depois que Canvas e geometria voltam a corresponder.

O painel permanece sempre à direita da foto. Mover, Largura, Altura, Inclinação, Restaurar e Pronto ficam empilhados. O layout foi verificado em `320`, `390`, `768` e desktop.

## Alpha e matte

A análise alpha continua necessária para rejeitar um arquivo quase opaco e obter a silhueta usada na composição. Ela não calcula o placement v7.

Caixas alpha aproximadas dos ativos:

| Corte | Caixa alpha aproximada |
| --- | ---: |
| Crop | 914 × 583 |
| Quiff | 915 × 507 |
| Cachos | 896 × 693 |
| Slick back | 912 × 744 |
| Topo | 910 × 750 |

As diferenças de padding explicam por que o matte precisa ser rasterizado com o asset real.

No preparo v3:

- menos de `2%` do palco como cabelo retorna `sem-cabelo`;
- cabelo significativo exige `32%` dentro da cap;
- o exterior falha acima de `68%` do cabelo e `5,5%` do palco;
- o hard clamp atua em `cap + 2`.

O alpha do cutout posicionado cria o matte:

- `<=10/255`: zero;
- `>=36/255`: opaco;
- faixa intermediária: feather curto.

Asset estreito, pequeno ou deslocado pode deixar cabelo original visível. Alpha com halo/pele pode criar blocos.

## Identidade e revisão

O catálogo usa `HAIR_CATALOG_ENCAIXE_REVISAO = 6`. Esse número é a revisão editorial dos itens demonstrativos, não a versão do placement.

`moldeRevisao`:

- demo: `asset:<path>:r6`;
- upload: revisão + data + tamanho + hash curto do Data URL.

Um placement manual só pode ser restaurado quando continuam iguais:

- `templateId`;
- nome do corte;
- `moldeRevisao`;
- `asset`, quando houver.

Se o path/revisão do demo mudar, a mesclagem reaplica os defaults atuais. Uploads do dono são preservados.

## Persistência e reload

- **Pronto** publica placement v7 confirmado;
- **Continuar para recomendações** persiste o placement;
- reload mantém o v7 como candidato enquanto refaz os modelos/Canvas;
- a geometria só volta a ser publicada após matte compatível;
- reload repetido restaura o mesmo v7;
- **Refazer preparo da foto** preserva geometria em memória e exige novo **Pronto**;
- troca de corte usa rascunho do asset/revisão ou base fixa, sem nova inferência;
- v6 salvo é rejeitado.

## Histórico retirado: auto-fit v6

O fluxo anterior usava `face-landmarks-alpha-v3`, `versao: 6`, landmarks de testa/têmporas, âncoras do cutout, `nivelTemplo` e cobertura X/Y.

Também permitia `ajusteManual.versao: 1` como delta relativo ao auto-fit.

Esse comportamento foi retirado:

- não posiciona os assets atuais;
- não libera a jornada;
- não é migrado para v7.

O campo `encaixeAutomatico` pode permanecer temporariamente nos itens normalizados por compatibilidade/histórico. `nivelTemplo` e âncoras não são consumidos pelo placement manual.

## Evidência histórica da camada congelada

Baseline registrado em **07/08/2026**, antes das mudanças posteriores de Auth e rotas:

- `launcher.bat --check` aprovado;
- build e lint aprovados naquele snapshot;
- hash agregado dos mesmos `21` arquivos do simulador/assets inalterado em `55AB8710ECD0F52DBA7DA452DCED95CA22EF29CBEE2BBA9B6F507A5B6BAB42EF`;
- smoke no Chrome a `390 px` com painel à direita, largura `72 → 75`, **Pronto**, avanço para recomendações com placement v7 e nenhum page error.

Os números antigos de rotas, warnings e auditoria de dependências não descrevem a árvore atual e foram retirados. O build foi repetido e aprovado em **14/08/2026**; o smoke HTTP de contenção permanece o de **13/08/2026**, e o smoke visual do cabelo não foi repetido. Em 14/08, lint, launcher, atalho da Área de Trabalho, inventário, documentação e os hashes individuais dos assets/modelos também foram revalidados. Esses hashes não foram recalculados em 21/08. O hash agregado histórico cobre a camada congelada como conjunto; ele não substitui os hashes individuais de procedência da tabela acima. O baseline funcional anterior de allowlist, posição fixa, ajustes absolutos, matte antes de **Pronto**, reset, fallback, reload, refazer e rejeição de v6 continua sem mudança de código. Essa validação não substitui matriz consentida, regressão visual versionada nem aparelho móvel real.

## Contenção de segurança relacionada

Sem Supabase configurado, o Proxy bloqueia `/admin` e `/barbeiro/*` por padrão em produção. Com Supabase configurado, existem sessão SSR e guards por membership/AAL2, ainda sem validação ponta a ponta. Reset/lint/pgTAP passam, mas RLS e Storage continuam sem validação por JWT; essas medidas não licenciam assets nem criam governança de mídia.

## Lote privado de 21/07/2026

Diretório:

```text
private-assets/cortes-recebidos-2026-07-21/
```

| Corte-alvo | Arquivo privado | Estado |
| --- | --- | --- |
| Crop | `crop-texturizado-fonte.jpg` | Referência ampla; privada |
| Quiff | `quiff-moderno-fonte.png` | Referência ampla; marca visível |
| Cachos | `cachos-taper-fonte.jpg` | Montagem/texto; privada |
| Slick back | `slick-back-fonte.jpg` | Montagem; privada |
| Topo | `topo-volumoso-fonte.jpg` | Montagem/texto; privada |

Esses arquivos:

- não estão em `public/`;
- não entram no build;
- não são referenciados pelo código;
- não foram usados como pixels do overlay;
- podem conter rosto, pele, fundo, texto ou marca;
- não têm licença/autorização comprovada;
- não devem ser publicados.

Inventário detalhado: [Fotos reais recebidas](FOTOS-REAIS-RECEBIDAS.md).

## Processo de autoria

Os cinco cabelos foram produzidos offline com imagegen. Cada foto privada serviu apenas para orientar o estilo. A geração pediu cabelo isolado sem reproduzir rosto, pessoa, texto, marca ou composição.

Depois:

1. chroma verde removido localmente;
2. spill/alpha tratados;
3. bordas transparentes aparadas;
4. candidato revisado;
5. resultado aprovado salvo em path versionado.

Crop v2 foi substituído pelo v3. No Quiff, v2 e candidato v3 foram reprovados; v4 refinou o topo e removeu abas laterais.

Especificação resumida:

> Cabelo masculino frontal, fotográfico e natural para overlay 2D; fundo `#00ff00`; somente cabelo; sem rosto, pele, orelhas, texto, logo, marca-d’água ou sombra; evitar capacete, borda dura e brilho plástico.

Imagegen foi ferramenta de autoria, não dependência de runtime.

## Limitações

- assets ativos são sintéticos e demonstrativos;
- perspectiva, densidade, cor e luz podem divergir do cliente;
- largura/altura independentes podem deformar a aparência;
- matte forte pode transformar halo/fade/pele em bloco;
- asset estreito pode revelar cabelo antigo;
- Slick back ainda apresentou triângulos no smoke anterior;
- remoção não recupera pixels reais escondidos;
- não há adaptação automática de cor/luz/perspectiva;
- os mesmos assets aparecem para qualquer slug;
- `direitosConfirmados` da biblioteca não é parecer jurídico;
- modelos/runtime aumentam pacote e custo de banda;
- fontes privadas não devem ser recortadas diretamente: fades podem carregar pele da pessoa original.

## Regra de substituição em produção

Antes de usuários reais:

1. remover/flaggear atalhos de demo;
2. usar cutouts próprios/autorizados por tenant;
3. manter fontes em área privada;
4. registrar licença, pessoas, responsável, revisão e retirada;
5. validar formato/assinatura/dimensões/alpha no servidor;
6. versionar paths sem sobrescrever histórico;
7. usar somente selfie fictícia/licenciada;
8. não usar Pinterest sem licença verificável;
9. testar em pessoas consentidas com aprovação da barbearia;
10. calibrar `transformacaoPadrao` editorialmente por asset.

## Próximos passos

A sequência operacional canônica é a mesma do [Plano de execução](PLANO-DE-EXECUCAO.md):

1. Marcar e confirmar o banco descartável; executar `db:test:concurrency` e guardar as evidências.
2. Criar o runbook e ensaiar rollback/roll-forward; repetir lint, pgTAP e concorrência depois do ensaio.
3. Criar `.env.local` controlado e fixtures Auth reais de dono AAL1/AAL2, funcionário e cenário cross-tenant.
4. Criar o harness e validar Data API e Storage com JWTs reais e cenários adversários.
5. Selecionar/configurar E2E, criar a suíte e executar Auth, e-mail, convite, MFA e lifecycle.
6. Fechar outbox/retry, Auth existente, expiração, reatribuição, recuperação TOTP, transferência de dono e seleção multi-tenant.
7. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

O simulador e os assets continuam congelados enquanto essa base é validada. Quando a frente visual voltar como gate anterior ao piloto, permanecem obrigatórios: comprovar origem/licença das fontes privadas; confirmar os nomes com barbeiro; preferir fotos frontais próprias; testar matriz consentida; criar gate de cabelo residual e regressão visual; medir aparelhos reais; e decidir o destino privado dos rollbacks.
