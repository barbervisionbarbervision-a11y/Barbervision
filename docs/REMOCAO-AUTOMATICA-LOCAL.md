# Remoção automática local do cabelo

Última auditoria documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Estado executivo

A remoção automática está integrada a `/b/[barbearia]/simulacao`. MediaPipe Image Segmenter, Face Landmarker, máscaras, síntese e composição rodam no navegador com arquivos same-origin.

Esta automação termina na preparação da selfie. Ela **não posiciona o novo corte**. O placement ativo é manual primário v7:

- `algoritmo: "manual-placement-v1"`;
- `origem: "manual-local"`;
- `automatico: false`;
- geometria absoluta;
- confirmação explícita em **Pronto**.

O contrato da remoção continua sendo o recibo **v3**, `hair-occlusion-canvas-v3`. A cobertura sintética é recortada pela silhueta alpha do corte na geometria manual atual antes de aparecer em **Depois**.

O estado correto é **protótipo técnico em validação, não pronto para atendimento real**:

- a demo raspada exercita a composição como `sem-cabelo`;
- fotos frontais reais exercitam segmentação e neutralização;
- o hard clamp impede alpha sintético fora da cap no caso medido;
- cabelo original fora da cap pode permanecer visível;
- um placement manual estreito ou deslocado pode revelar cabelo antigo;
- ainda não existe gate de cobertura residual por placement.

Decisão atual: congelar temporariamente esta implementação porque o conjunto já é bom para demonstrar a proposta. Isso muda a prioridade de desenvolvimento, não o critério técnico: a remoção não é perfeita, o piloto não está concluído e as limitações/gates pendentes continuam válidos.

## Reconciliação transversal em 21/08/2026

A remoção local e o placement manual v7 permanecem congelados e tecnicamente inalterados; nenhum código visual mudou nesta revisão. Ao redor deles, Auth/lifecycle com Supabase SSR, cookies e membership foram validados localmente; TOTP é opcional. Os dados do painel, catálogos e financeiro continuam demonstrativos em `localStorage` ou mocks.

Sem configuração do Supabase, o desenvolvimento usa o fallback demo; em produção, `/admin` e `/barbeiro/*` ficam bloqueados por padrão. A baseline atual de banco passa 192/192; demais evidências estão em `ESTADO-VALIDACAO.md`. Privacidade/persistência ainda não existem.

## Decisão de arquitetura

Permitido:

- MediaPipe Tasks Vision e TFLite no navegador;
- runtime/modelos same-origin;
- segmentação multiclasses local;
- Face Landmarker local para validar cabeça, roll e frontalidade do preparo;
- síntese determinística de pele em Canvas;
- matte de oclusão derivado do alpha do cutout;
- cutouts fotográficos locais;
- placement manual absoluto;
- confirmação explícita do cliente;
- falha segura e fallback para o último placement manual composto.

Fora do escopo:

- IA generativa ou HairFastGAN em runtime;
- servidor externo de inferência;
- envio da selfie a Google, OpenAI ou outro provedor;
- auto-fit de posição, largura, altura ou rotação;
- reconstrução real do couro cabeludo/fundo;
- resultado 3D ou garantia do corte físico.

## Implementação ativa

| Arquivo | Responsabilidade |
| --- | --- |
| `RemocaoCabeloAutomatica.jsx` | Lifecycle, MediaPipe, faces, gates, síntese, hard clamp, matte e Canvas |
| `remocaoCabeloAutomaticaLocal.js` | Contrato/recibo v3, análise anatômica, máscaras, morfologia, cap e estatísticas |
| `CabeloSimuladorLocal.jsx` | CTA, estados, base manual fixa, controles, confirmação, fallback e publicação |
| `cabeloCatalogoLocal.js` | Geometria manual v7, identidade/revisão, limites, base do catálogo e confirmação |
| `page.js` | Exige recibo v3 + placement manual v7 confirmado antes do avanço |

Clone stamp, pintura manual e auto-fit v6 não fazem parte do fluxo ativo.

## Modelos e runtime

Pacote: `@mediapipe/tasks-vision` `0.10.35`, modo `IMAGE`, delegate CPU.

| Artefato | Uso | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `public/modelos/selfie_multiclass_256x256.tflite` | `ImageSegmenter`: category/confidence masks | `16.371.837` | `C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0` |
| `public/modelos/face_landmarker.task` | `FaceLandmarker`: até duas faces e landmarks | `3.758.596` | `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF` |
| `public/mediapipe/wasm/*` | Variantes do runtime | `33.754.629` | Consulte o inventário de release |
| **Total estático** | Modelos + variantes | **`53.885.062` (~`51,4 MiB`)** | — |

Classes usadas: `hair` (`1`) e `face-skin` (`3`). Os hashes identificam os artefatos esperados; os bytes baixados não são recalculados no navegador.

## Palco e pipeline

Selfie, Canvas, matte e placement compartilham palco lógico `640 × 800`:

```text
selfie normalizada
  → decode + object-cover 640×800
  → FaceLandmarker local
  → landmarks/gates exclusivos do preparo
  → ImageSegmenter local
  → componente central face-skin
  → defesa complementar contra múltiplos rostos
  → caixa facial + cap
  → máscara de cabelo interno/externo
  → gates geométricos v3
  → amostra de pele + dilatação + feather + hard clamp
  → Canvas-base efêmero
  → posição inicial fixa do catálogo, sem landmarks
  → matte alpha na geometria manual absoluta
  → Canvas-base destination-in matte
  → composição pronta
  → cliente ajusta X/Y/largura/altura/rotação
  → nova matte sem nova inferência
  → cliente toca Pronto
  → publicação do placement manual v7
```

Cada preparo executa duas análises: uma `FaceLandmarker.detect` e uma `ImageSegmenter.segment`. Os modelos são cacheados no módulo. Ajustar, restaurar a posição inicial ou trocar o corte reutiliza o Canvas-base e não chama os modelos de novo.

## Uso do Face Landmarker

O Face Landmarker roda com `numFaces: 2` e limiares `0,52` para detecção, presença e tracking.

O preparo:

- retorna `CABECA_NAO_DETECTADA` se não houver exatamente uma face;
- retorna `MULTIPLOS_ROSTOS` se houver duas faces detectadas;
- extrai pontos anatômicos efêmeros;
- mede centro, linha da testa, largura/altura, roll e assimetria;
- exige confiança `>=0,58`, `|rotacao| <=20°` e assimetria `<=0,34`;
- usa essas medidas para restringir a área em que a pele sintética pode ser desenhada.

Esses landmarks não alimentam `x`, `y`, `largura`, `altura` ou `rotacao` do placement v7. O placement não persiste o SHA-256 do Face Landmarker.

A análise normalizada fica em `metricas.analiseCabeca` somente em memória. A heurística `face-skin` de segundo componente permanece como defesa complementar.

## Cap, máscara e gates v3

A cap é conservadora:

- raio horizontal `0,47 × larguraFace`, limitado a `0,09…0,34` da largura do palco;
- raio vertical `0,56 × alturaFace`, limitado a `0,12…0,44` da altura;
- centro/linhas guiados pela análise anatômica válida.

Um pixel entra como cabelo quando a categoria é `hair` ou confiança `>=0,36`.

Gates:

1. menos de `2%` do palco como cabelo retorna `sem-cabelo`;
2. cabelo significativo exige ao menos `32%` dentro da cap;
3. `VOLUME_CABELO_INCOMPATIVEL` ocorre quando mais de `68%` do cabelo está fora da cap **e** esses pixels ocupam mais de `5,5%` do palco.

Esses gates avaliam segurança do preparo. Eles não confirmam que o cutout manual cobre todo o cabelo restante.

## Pele, feather e hard clamp

A pele é amostrada na região superior da face. O preparo falha com menos de `48` amostras ou confiança de pele abaixo de `0,13`.

Para cabelo significativo:

- máscara interna dilatada com raio `5`;
- fora de `cap + 2` é zerado antes do blur;
- feather de raio `5`, duas passagens;
- fora de `cap + 2` é zerado novamente após o blur;
- render usa o alpha resultante sem o reforço histórico de `1,12`.

O segundo recorte é o hard clamp. Ele reduz halo sobre fundo/têmporas, mas pode produzir borda interna perceptível.

A confiança final mínima é `0,40`. Ela indica que o processamento terminou dentro do envelope técnico; não é uma avaliação de realismo.

## Matte de oclusão no placement manual

O cutout é desenhado numa máscara com os valores absolutos do placement atual:

- centro `x`/`y`;
- `largura`;
- `altura`;
- `rotacao`;
- `espelhado`, se aplicável.

O alpha é remapeado:

- `<=10/255`: transparente;
- `>=36/255`: opaco;
- `11…35`: feather por `((alpha - 10) / 26)^0,62`.

O Canvas-base recebe `destination-in` com essa máscara. Assim, a cobertura sintética aparece apenas sob a silhueta do corte.

Consequência: cutout estreito, deslocado, pequeno ou com laterais transparentes pode deixar cabelo original visível. O placement manual não corrige alpha ruim.

## Placement manual v7

### Base fixa

A geometria inicial usa apenas:

```js
{
  x: 50,
  y: 20,
  largura: 72,
  altura: 38,
  rotacao: 0
}
```

`transformacaoPadrao` pode aplicar deslocamento, escala inicial e rotação. Essa calibração é fixa por item e não depende da selfie.

### Controles

| Ação | Passo | Envelope |
| --- | ---: | ---: |
| X | `1,5` ponto percentual | `0…100` |
| Y | `1,5` ponto percentual | `0…75` |
| Largura | `3` pontos percentuais | `28…130` |
| Altura | `3` pontos percentuais | `12…100` |
| Rotação | `1°` | `-45°…45°` |

Largura e altura são independentes. **Restaurar posição inicial** volta à base fixa; não chama auto-fit.

### Sequenciamento

Cada mudança:

1. publica `null` ao pai;
2. remove a confirmação;
3. marca `composicaoPronta = false`;
4. atualiza a geometria absoluta;
5. recompõe a matte;
6. aguarda **Pronto**.

O botão **Pronto** só publica quando a matte da geometria atual está pronta. O CTA externo exige essa publicação e o recibo v3.

Durante essa recomposição, `recompondoAjusteManual` mantém os controles e a troca de corte bloqueados, a prévia recebe o estado de processamento e o placement live permanece nulo. O caminho atual privilegia correspondência atômica entre geometria, Canvas e contrato publicado, não edição contínua enquanto a matte ainda está sendo refeita.

### Fallback

O componente mantém o último placement manual composto. Se uma nova composição falhar:

- restaura o último manual válido;
- quando esse último era a posição inicial, restaura a base fixa;
- mantém a confirmação removida;
- exige novo **Pronto**.

Não existe fallback para auto-fit v6.

## Concorrência e timeout

O processamento é cacheado por `executarToken + selfieDataUrl`. Cada trabalho usa Canvas offscreen e somente a assinatura ativa copia a saída. A composição usa cancelamento lógico para impedir que uma geometria/corte antigo substitua a seleção atual.

O carregamento conjunto de selfie, runtime e modelos tem limite de `45.000 ms`. Estouro vira erro recuperável. O limite não interrompe análise síncrona nem cancela fisicamente download iniciado.

## Contrato da remoção

Payload completo em memória:

```js
{
  versao: 3,
  metodo: "mediapipe-multiclass-local",
  algoritmo: "hair-occlusion-canvas-v3",
  modeloSha256: "C6748B...E0E0",
  status: "ocioso" | "inativo" | "carregando" | "processando" | "pronto" | "erro",
  concluida: boolean,
  confianca: number,
  resultado: "removido" | "sem-cabelo" | null,
  erro: string | null,
  metricas: { /* efêmeras */ }
}
```

Recibo persistido:

```js
{
  versao: 3,
  metodo: "mediapipe-multiclass-local",
  algoritmo: "hair-occlusion-canvas-v3",
  modeloSha256: "C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0",
  concluida: true,
  resultado: "removido" | "sem-cabelo"
}
```

Não entram no recibo: Canvas, imagem, máscaras, pixels, amostras, confiança facial, landmarks, cap, matte ou placement.

## Contrato complementar do placement

O avanço também exige:

```js
{
  versao: 7,
  templateId: "id-exato-do-molde",
  asset: "/path-exato-do-demo",
  moldeRevisao: "asset:/path-exato-do-demo:r6",
  corte: "Nome do corte",
  origem: "manual-local",
  algoritmo: "manual-placement-v1",
  automatico: false,
  x: 50,
  y: 20,
  largura: 72,
  altura: 38,
  rotacao: 0,
  ajusteManual: {
    versao: 2,
    aplicado: true,
    confirmado: true
  }
}
```

O contrato completo também contém filtros visuais normalizados. Ele não contém `confianca` automática, `modeloCabecaSha256` nem deltas relativos.

Placement v6, v5, v4, outro algoritmo/origem, geometria inválida ou `confirmado !== true` não liberam a página.

## Persistência, reload e troca de corte

- **Pronto** publica o placement v7 ao estado da página;
- o placement entra no `sessionStorage` quando o cliente toca **Continuar para recomendações**;
- o pai mantém o candidato salvo separado do placement live;
- no reload, os modelos e o Canvas-base são refeitos;
- o v7 confirmado é restaurado somente após validar molde/revisão e compor a matte;
- reload repetido preserva esse candidato confirmado;
- v6 salvo é rejeitado e substituído pela base fixa v7 não confirmada;
- rascunhos ficam em memória por `templateId + moldeRevisao`;
- trocar de corte recompõe sem nova inferência e exige confirmação do corte atual;
- **Refazer preparo da foto** preserva a geometria em memória, limpa a confirmação e exige novo **Pronto**;
- trocar selfie ou receber atualização do catálogo limpa os rascunhos.

## Layout do ajuste

O painel não pertence ao pipeline de remoção, mas seu layout é parte do contrato de uso:

- foto à esquerda;
- painel manual à direita;
- nunca empilhado acima/abaixo;
- rolagem interna quando a altura disponível é curta;
- grupos Mover, Largura, Altura e Inclinação empilhados;
- alvos de `44 × 44 px`;
- verificado em `320`, `390`, `768` e desktop.

## Evidência histórica da camada congelada

Em **07/08/2026**, antes das mudanças posteriores de Auth e rotas, foram registrados:

- `launcher.bat --check`: aprovado;
- build e lint aprovados naquele snapshot;
- hash agregado dos mesmos `21` arquivos do simulador/assets inalterado em `55AB8710ECD0F52DBA7DA452DCED95CA22EF29CBEE2BBA9B6F507A5B6BAB42EF`;
- smoke no Chrome a `390 px`: painel à direita, largura `72 → 75`, **Pronto**, avanço para recomendações com placement v7 e nenhum page error.

Os números antigos de rotas, warnings e auditoria de dependências não representam mais a árvore atual. O build foi repetido e aprovado em **14/08/2026**; o smoke HTTP de contenção permanece o de **13/08/2026**, e o smoke visual do cabelo não foi repetido. Em 14/08, lint, launcher, atalho da Área de Trabalho, inventário, documentação e hashes dos assets/modelos também foram revalidados; hashes e smoke visual não foram repetidos em 21/08. O baseline funcional anterior — um request por modelo no preparo, ajustes sem reinferência, matte antes do v7, fallback, reload, refazer e rejeição de v6 — não recebeu mudança de código na camada congelada. Hash e smoke ad hoc não substituem E2E versionado, matriz visual consentida ou aparelhos móveis reais.

## Histórico retirado

O placement v6 `face-landmarks-alpha-v3` alinhava âncoras alpha do molde a landmarks da testa/têmporas, calculava similaridade e cobertura X/Y, e permitia deltas manuais v1 sobre a base automática.

Esse placement foi retirado do caminho ativo. Seus helpers podem permanecer temporariamente para histórico, mas:

- não são chamados pelo simulador;
- não são aceitos por `page.js`;
- não devem ser documentados como comportamento atual;
- não devem ser migrados para v7.

O histórico `bald-cap-canvas-v2` também não é regra ativa. O recibo de remoção permanece v3.

## Privacidade, rede e custo

- modelos/WASM são same-origin;
- não há endpoint externo de inferência;
- o pipeline não chama `canvas.toDataURL()`;
- Canvas, máscaras, matte e landmarks ficam em memória;
- recibo v3 não contém imagem/métricas;
- placement v7 contém apenas identidade do molde, geometria/filtros e confirmação.

“Local” não significa offline. JS, modelos e WASM ainda são baixados da hospedagem. Não há tarifa por foto, mas existem custos de hospedagem, banda, CPU, memória, bateria, desenvolvimento e testes.

## Fronteira da contenção de segurança

Headers defensivos globais protegem tipo de conteúdo, framing, referrer, permissões e isolamento de opener. Sem configuração do Supabase, o Proxy de produção bloqueia as superfícies internas por padrão; a flag insegura só libera a demo da barbearia e não abre `/admin` em produção. Essa camada não modifica a remoção local e não envia a selfie para fora.

Quando o Supabase está configurado, sessão SSR e membership ativa substituem o fallback demonstrativo nas rotas cobertas; TOTP é opcional. Auth/e-mail/TOTP e lifecycle de funcionário foram testados historicamente de ponta a ponta; a fundação de tenant/membership, RLS/grants e Storage privado com JWT passou localmente. CSP compatível com Next/MediaPipe/WASM e a matriz remota completa permanecem pendentes.

## Limitações bloqueadoras

1. Cabelo lateral fora da cap pode aparecer.
2. O gate atual não mede resíduo depois do alpha/placement manual.
3. Asset com pele, halo ou fade opaco pode produzir blocos.
4. Placement manual pode deformar ou descobrir cabelo original.
5. Face Landmarker/heurística não garantem recusa de toda montagem.
6. Não existe matriz consentida de cabelos, tons de pele, poses, assets e aparelhos.
7. Não há regressão visual automatizada.

## Ordem atual do projeto

Com a remoção congelada para a demonstração, siga a sequência operacional canônica de dez passos do [Plano de execução](PLANO-DE-EXECUCAO.md): reativar e validar a pilha; criar baseline Git; executar reset/lint/168 pgTAP; testar concorrência; ensaiar rollback/roll-forward; preparar Auth real; validar Data API/Storage por JWT; criar E2E; fechar gaps operacionais; e só então implementar privacidade antes de dados reais. Os itens visuais abaixo voltam a bloquear no gate anterior ao piloto.

## Pendências técnicas preservadas antes do piloto

1. Implementar `visibleResidualMask = hairMask × (1 - alphaDoCortePosicionado)`.
2. Bloquear **Pronto** quando houver cabelo residual relevante.
3. Revisar os cinco mattes/alphas.
4. Criar testes unitários para recibo v3 e placement v7.
5. Criar E2E para confirmação, fallback, reload, refazer, troca de corte e rejeição v6.
6. Testar `320`, `390`, `768`, desktop, Chrome Android e Safari iOS.
7. Medir memória, bateria, cache e tempo.

## Regra de comunicação

Usar:

> Protótipo de prévia 2D com remoção automática local e posicionamento manual. O cliente ajusta e confirma o molde; cabelo residual e compatibilidade do asset ainda estão em validação.

Não usar “encaixe automático”, “resultado real garantido”, “remove qualquer cabelo”, “hiper-realista” ou “pronto para clientes”.
