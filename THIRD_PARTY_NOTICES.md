# Avisos de componentes de terceiros

Última revisão: **14/08/2026**. Os hashes, bytes e o total dos modelos/runtime foram reconferidos nesta auditoria; nenhum artefato foi substituído.

Este arquivo registra os artefatos de visão computacional copiados ou empacotados diretamente no projeto. Ele não substitui um inventário automatizado de todas as dependências npm nem concede licença ao código próprio do Barber Vision.

## MediaPipe Tasks Vision

- pacote: `@mediapipe/tasks-vision`;
- versão fixada: `0.10.35`;
- autor indicado no pacote: Google / MediaPipe;
- licença indicada no pacote: Apache License 2.0;
- homepage: [mediapipe.dev](https://mediapipe.dev/);
- arquivos derivados do pacote copiados para distribuição same-origin: `public/mediapipe/wasm/*`.

Texto da licença: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Modelo SelfieMulticlass 256 × 256

- arquivo local: `public/modelos/selfie_multiclass_256x256.tflite`;
- origem: [repositório oficial de modelos MediaPipe](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite);
- model card: [SelfieMulticlass Segmentation](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf);
- tamanho: `16.371.837` bytes;
- SHA-256: `C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0`;
- licença indicada no model card: Apache License 2.0.

O modelo é servido pela própria aplicação e executado no navegador. Isso não significa funcionamento offline: o arquivo ainda precisa ser obtido da hospedagem do Barber Vision, salvo quando houver cache previamente implementado.

## Modelo Face Landmarker

- arquivo local: `public/modelos/face_landmarker.task`;
- origem: [repositório oficial de modelos MediaPipe](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task);
- tamanho: `3.758.596` bytes;
- SHA-256: `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF`;
- licença indicada para a distribuição oficial do MediaPipe: Apache License 2.0.

O bundle é servido pela própria aplicação e executado no navegador por `FaceLandmarker`, em modo `IMAGE` e CPU. Ele localiza até duas faces e fornece landmarks usados para medir testa, têmporas, largura/altura do rosto, rotação e assimetria durante o preparo e seus gates. Esses dados não posicionam o corte no fluxo atual, cujo placement é manual v7. O arquivo não produz reconstrução 3D nem garante pose, qualidade visual ou detecção de toda montagem.

Os dois modelos e as variantes locais do runtime somam `53.885.062` bytes, aproximadamente `51,4 MiB`, no conjunto estático. Isso não significa que todas as variantes WASM sejam baixadas em cada execução.

## Obrigações operacionais

- preservar este aviso e os registros de versão/origem ao redistribuir os artefatos;
- repetir a revisão de licença antes de atualizar pacote ou qualquer modelo;
- conferir novamente hashes após qualquer substituição;
- manter modelos/runtime fora de logs e não atribuir aos modelos garantias de precisão que a documentação oficial não oferece;
- gerar um SBOM ou relatório equivalente antes de produção, cobrindo também as demais dependências npm.

## Licença do Barber Vision

O repositório não possui, nesta auditoria, um arquivo de licença para seu código próprio. Não se deve inferir permissão de redistribuição do Barber Vision a partir das licenças de seus componentes de terceiros.
