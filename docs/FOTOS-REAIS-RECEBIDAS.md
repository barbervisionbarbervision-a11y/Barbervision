# Fotos-fonte recebidas e uso como referência

Última atualização documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Estado desta etapa

Cinco imagens de referência foram fornecidas pelo usuário em 21/07/2026 e preservadas no workspace em:

```text
private-assets/cortes-recebidos-2026-07-21/
```

Essa pasta está no `.gitignore` e não fica sob `public/`. Portanto:

- as imagens privadas não são servidas pelo Next.js;
- não entram no build, no catálogo nem no runtime do cliente;
- não são versionadas nem protegidas por backup do Git;
- não foram recortadas, copiadas, publicadas nem usadas como pixels de um overlay;
- continuam com rosto, fundo, pele e eventuais textos/marcas do material recebido.

Durante a criação offline dos cinco assets sintéticos e de suas revisões, cada foto foi usada somente como **referência visual ampla do estilo**. O built-in imagegen criou novos cabelos isolados; depois, o chroma foi removido localmente e os outputs sintéticos foram publicados em paths versionados sob `public/demo-cortes/`. Os arquivos privados não foram incorporados aos PNGs, não são lidos por `lib/hairCatalog.js` e não participam da simulação em runtime.

O pipeline atual analisa a selfie do cliente com SelfieMulticlass e Face Landmarker locais para preparar/ocultar o cabelo original, mas esses modelos não posicionam o novo corte. O placement ativo é manual v7 `manual-placement-v1`, com origem `manual-local`, `automatico: false`, geometria absoluta e `ajusteManual` v2 confirmado em **Pronto**. A posição inicial depende apenas da configuração fixa do molde. Os modelos e o editor não leem as cinco fotos-fonte privadas: operam sobre a selfie e sobre o alpha do cutout sintético selecionado. A análise local, o placement por botões e a `revisaoEncaixe: 6` dos moldes não mudam a procedência, a licença ou o estado de publicação das fontes recebidas. O antigo placement v6 de auto-fit é histórico rejeitado pelo fluxo atual.

Os outputs ativos são:

- `crop-texturizado-realista-v3.png`;
- `quiff-moderno-realista-v4.png`;
- `cachos-taper-realista-v2.png`;
- `slick-back-realista-v2.png`;
- `topo-volumoso-realista-v2.png`.

## Reconciliação transversal em 21/08/2026

O inventário, a separação privada/pública e o uso apenas como referência ampla permanecem inalterados. Paths, bytes e SHA-256 foram revalidados em **14/08/2026**; esses hashes não foram recalculados em 21/08. O simulador e o placement manual v7 seguem congelados, sem mudança de código visual. Auth com Supabase SSR, cookies e membership — com TOTP opcional — não publica, licencia nem migra estas fotos. Sem configuração do Supabase, as áreas internas ficam bloqueadas por padrão em produção.

Em 22/08, start, reset, lint SQL, pgTAP 170/170, concorrência, rollback/roll-forward 5–4, JWT de Data API/Storage e o Auth E2E com lifecycle passaram. Os passos 4 e 5 ainda não existem. As fontes permanecem no diretório privado ignorado pelo Git, sem governança de produção comprovada.

O recebimento — e também o uso limitado como referência — não comprova licença, cessão de direitos autorais, autorização da pessoa retratada ou autorização para remoção de marca. Origem e direito de uso continuam não verificados. As fontes não devem ser publicadas e os assets sintéticos versionados devem continuar rotulados como demonstração até que a procedência e a política de uso sejam revisadas.

## Inventário e integridade

| Corte-alvo informado | Nome recebido | Cópia privada | Dimensões | Bytes | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| Topo volumoso | `voluminous top fade front view men.jpg` | `topo-volumoso-fonte.jpg` | 736 × 920 | 69.313 | `5C7E111C500744032108E052E71D427299273A024729B909CF8B4641C79717BE` |
| Slick back | `slick back haircut front view men.jpg` | `slick-back-fonte.jpg` | 736 × 1104 | 111.308 | `B13E8AE98CD75E9BFFF7C1ED268AAAC32E05853C0FBC2085ADA74657518660E6` |
| Cachos taper | `curly taper fade front view men.jpg` | `cachos-taper-fonte.jpg` | 736 × 810 | 93.841 | `97968E35CD38F4A9FC300ADE3337859BCAF56E6F1F20A5B98604B7C52C223D9A` |
| Quiff moderno | `modern quiff haircut front view men.png` | `quiff-moderno-fonte.png` | 1152 × 2048 | 2.231.885 | `4D02B5C34FD3F269BDE39898933074D42ED26BAB7C2F3B3019FF9761CF0E78B5` |
| Crop texturizado | `textured crop fade front view men.jpg` | `crop-texturizado-fonte.jpg` | 683 × 1024 | 55.393 | `81687F27A0DC2A6230C5406F946525C1A5F893CD6911EDD370AA125C5F2F2A55` |

Os hashes das cópias privadas foram conferidos contra os arquivos recebidos e são idênticos. Esses hashes registram integridade, não titularidade ou autorização.

## Revisão visual inicial

Os nomes dos arquivos representam o corte-alvo escolhido pelo usuário; eles não garantem que a foto corresponda tecnicamente ao estilo.

| Corte-alvo | Observação atual | Consequência para eventual uso direto |
| --- | --- | --- |
| Topo volumoso | Montagem com quatro ângulos e bloco de texto/marca entre os quadros | Não é adequada para publicação ou recorte direto sem seleção, autorização e revisão |
| Slick back | Montagem com quatro ângulos; o cabelo parece mais lateral/texturizado do que um slick back clássico | Exige validação do estilo com a barbearia |
| Cachos taper | Montagem com uma vista frontal em ângulo baixo, vistas laterais e texto sobreposto | O ângulo principal não coincide com a selfie frontal guiada |
| Quiff moderno | Foto única em três quartos, com logo/marca visível | Não é frontal; a marca não deve ser removida nem a foto publicada sem direito comprovado |
| Crop texturizado | Foto única em três quartos, com topo mais longo e ondulado | Pode não representar um crop frontal e precisa de aprovação técnica |

Além da licença, há uma limitação técnica em qualquer tentativa futura de recorte direto: fades laterais misturam fios muito curtos com a pele da pessoa original. Um recorte simples poderia carregar a cor da pele-fonte e parecer uma colagem. O caminho preferível para produção é fotografar modelos próprios/autorizados em pose frontal controlada e revisar máscara, matte, alpha e transições em pessoas consentidas e variadas.

## O que a integração versionada concluiu — e o que não concluiu

Concluído no protótipo:

- criação offline de cinco novos cabelos fotográficos sintéticos;
- transparência e acabamento de chroma processados localmente;
- paths versionados integrados ao catálogo demonstrativo, com Crop revisado para v3 após reprovação visual do v2 e Quiff revisado para v4 após reprovação do v2 e de um candidato v3;
- catálogo demonstrativo migrado para revisão de encaixe `6`, com configuração de têmpora por corte;
- placement manual primário v7, independente dos landmarks para posição, com X/Y em passos de `1,5`, largura e altura independentes em passos de `3`, rotação em `1°` e restauração da base fixa; sem Paint, arraste ou sliders;
- painel sempre à direita da foto em 320/390/768/desktop, foto `sticky`, rolagem do painel, grupos verticais e confirmação explícita em **Pronto**;
- recomposição atômica da matte a cada ajuste, sem nova inferência e com avanço bloqueado até nova confirmação; falha restaura o último manual composto;
- versões antigas mantidas como rollback não referenciado;
- nenhuma chamada de IA generativa ou serviço externo de inferência e nenhum acesso às fotos privadas em runtime.

Não concluído:

- comprovação de origem, licença comercial e autorização de imagem das cinco fontes;
- validação profissional de que cada referência corresponde ao nome do corte;
- autorização para publicar, recortar ou distribuir as fotos privadas;
- matriz consentida e diversa dos assets ativos por formato de cabeça, cabelo original, tom de pele, pose frontal e aparelho;
- validação do pipeline local, do placement manual v7 e do layout lateral em Chrome Android e Safari iOS reais;
- validação prioritária dos extremos manuais contra caixa/cap, pois diminuir, mover ou girar o cutout pode revelar cabelo antigo;
- regressão/E2E automatizada de `moldeRevisao`, revisão de molde `6`, placement manual v7, geometria absoluta, cobertura, matte, restauração/último composto, **Pronto**, refazer/reload, persistência somente em **Continuar**, rejeição de v6 e compatibilidade visual por corte;
- catálogo real, licenciado, versionado e isolado por barbearia;
- política de denúncia, retirada, retenção e auditoria de mídia.

## Critérios antes de usar fontes reais em produção

1. Confirmar por escrito a origem e a autorização de uso comercial de cada foto e da pessoa retratada.
2. Confirmar com a barbearia se cada referência realmente representa o nome do corte.
3. Preferir fotografia frontal própria da barbearia, bem iluminada, sem montagem, texto, logo ou marca-d'água.
4. Manter o material-fonte em Storage privado, com retenção e acesso definidos.
5. Produzir PNG/WebP transparente contendo somente o cabelo necessário ao overlay.
6. Remover rosto, orelhas, roupa, fundo, pele residual e metadados, com revisão humana.
7. Revisar bordas, fios soltos, áreas semitransparentes e transição do fade.
8. Testar sobre pessoas autorizadas com formatos de cabeça, cabelos originais, tons de pele, poses frontais, iluminações e aparelhos variados.
9. Calibrar a posição inicial fixa, cobertura e limites úteis do placement manual; registrar revisão imutável, hash, responsável e aprovação por molde.
10. Publicar por tenant somente depois de validação jurídica, técnica e visual.

## Próxima ação desta frente após o descongelamento

Na ordem operacional canônica, pilha, baseline Git, reset, lint, pgTAP 170/170, concorrência, rollback 5–4, JWT/Storage e Auth E2E com lifecycle já foram validados; o rollback 6–4 e os gaps operacionais de Auth vêm antes de privacidade e dados reais. Quando a frente visual voltar a ser gate do piloto, obter fotos frontais produzidas pela barbearia ou comprovação documental das fontes existentes. Testar os assets sintéticos apenas como demonstração aproximada numa matriz consentida, incluindo placement manual v7, extremos de geometria, layouts 320/390/768/desktop, carregamento e celulares reais.
