# Modelos locais de visão computacional

Última revisão: **14/08/2026**. Os dois hashes, os bytes e o total estático foram reconferidos; o pipeline descrito abaixo permanece congelado e sem alteração de artefatos.

## `selfie_multiclass_256x256.tflite`

- Origem oficial: `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite`
- Tamanho verificado: `16.371.837` bytes
- SHA-256: `C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0`
- MD5 publicado pelo Google Storage e conferido localmente: `6CA6A40D84BCB910420A1A43A295100A`
- Licença indicada no model card oficial: Apache License 2.0
- Uso: segmentação local de fundo, cabelo, pele corporal, pele facial, roupa e acessórios.

O arquivo é servido pelo próprio Barber Vision e o fluxo ativo o executa no
navegador por `@mediapipe/tasks-vision` 0.10.35. Em 07/08/2026,
`RemocaoCabeloAutomatica.jsx` está integrado a `CabeloSimuladorLocal.jsx`: o
resultado efêmero alimenta a prévia e a máscara de cabelo participa da cobertura
automática e da matte de oclusão. Ela não posiciona, redimensiona nem gira o
novo corte.
O contrato ativo é o recibo v3, algoritmo `hair-occlusion-canvas-v3`.

## `face_landmarker.task`

- Origem oficial: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
- Tamanho verificado: `3.758.596` bytes
- SHA-256: `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF`
- Licença indicada para a distribuição oficial do MediaPipe: Apache License 2.0
- Uso: análise local de uma face frontal, landmarks anatômicos, rotação e assimetria para os gates e limites do preparo/remoção.

O fluxo cria `FaceLandmarker` em modo `IMAGE`, delegate CPU e `numFaces: 2`.
Cada preparo válido executa uma detecção de landmarks e uma segmentação. Trocar
o corte reutiliza ambas as análises e apenas recalcula o alpha, a base fixa do
molde e a matte. O placement ativo é manual v7, algoritmo
`manual-placement-v1`, origem `manual-local`, `automatico: false`, com largura e
altura independentes e confirmação por **Pronto**. Landmarks e o hash do modelo
não entram nesse placement. O auto-fit v6 `face-landmarks-alpha-v3` é histórico
rejeitado pelo fluxo atual.

Quando esse pipeline é executado, a selfie não é enviada ao Google ou
a outro serviço de inferência. Os dois modelos e o runtime ainda são baixados da
hospedagem do Barber Vision; não há garantia de funcionamento offline.

O segmentador fornece máscaras aproximadas e não reconstrói os pixels escondidos
pelo cabelo. A síntese visual continua sendo responsabilidade do código Canvas
do projeto. A implementação aplica análise de landmarks, gates geométricos,
hard clamp pós-blur e recorta a cobertura pelo alpha do cutout posicionado; isso não remove cabelo
original fora da cap nem garante compatibilidade do asset. O pipeline recusa
zero ou mais de uma face com base no Face Landmarker, e a busca residual de um segundo
componente `face-skin` permanece como defesa complementar. Nenhuma das duas
barreiras garante detectar toda montagem, oclusão ou pose incompatível.

## Tamanho estático

| Artefato | Bytes |
| --- | ---: |
| SelfieMulticlass | `16.371.837` |
| Face Landmarker | `3.758.596` |
| Variantes JS/WASM | `33.754.629` |
| Total | `53.885.062` (`~51,4 MiB`) |

O total é inventário do diretório estático, não tráfego obrigatório por preparo:
o navegador seleciona uma variante compatível do runtime e o comportamento de
cache ainda precisa ser medido nos dispositivos-alvo.

Documentação operacional:

- [remoção automática local](../../docs/REMOCAO-AUTOMATICA-LOCAL.md);
- [avisos e licença de terceiros](../../THIRD_PARTY_NOTICES.md).
