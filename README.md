# Race Plan

PWA offline-first para consultar o plano de uma corrida de trail (pontos de passagem, distâncias, D+/D-, ritmo e horário previsto) em formato de cartões deslizáveis, otimizada para uso em corrida.

## Stack

Sem build, sem dependências. HTML, CSS e JS puros, servidos como ficheiros estáticos.

## Estrutura

```
index.html         Shell da app (header + contentor #list)
app.js              Lê data.json, gera os cartões e trata scroll/estado
style.css           Estilos
data.json           Dados do percurso (um objeto por ponto de passagem)
manifest.json       Manifest da PWA (ícones, cores, modo standalone)
service-worker.js   Cache offline (cache-first com fallback à rede)
icons/              Ícones da app (192px e 512px)
```

## Modelo de dados (`data.json`)

Array de pontos de passagem, ordenado pela ordem da corrida:

| Campo | Tipo | Descrição |
|---|---|---|
| `ponto` | string | Nome do local |
| `km` | number | Km acumulado desde a partida |
| `dPlusAcum` | number | Desnível positivo acumulado (m) |
| `adistancia` | number | Distância desde o ponto anterior (km) |
| `secDPlusMinus` | number | Desnível (+/-) do segmento anterior até este ponto (m) |
| `segmento` | string | Tempo estimado do segmento (`h:mm:ss`) |
| `pace` | string | Ritmo médio do segmento (`min:seg/km`) |
| `decorrido` | string | Tempo total decorrido desde a partida (`h:mm:ss`) |
| `relogio` | string | Hora do dia prevista de passagem (`HH:mm`) |
| `especial` | boolean | Marca o ponto como especial (crew, abastecimento, meta, partida, etc.) |

`app.js` deriva a etiqueta do badge (`badgeLabel`) a partir de palavras-chave no nome do ponto (`crew`, `abastecimento`/`liquidos`, `meta`, `partida`); qualquer outro ponto marcado como `especial` recebe a etiqueta genérica "⭐ ponto especial".

## Comportamento da app

- `init()` faz `fetch("data.json")`, gera um cartão por ponto (`buildCard`) e injeta-os em `#list`.
- Um `IntersectionObserver` (`trackVisibleCard`) deteta o cartão mais visível durante o scroll e guarda o seu índice em `localStorage` (`race-plan:index`).
- Ao recarregar, a app lê esse índice (`loadIndex`) e faz `scrollIntoView` para o último ponto visto — permite continuar de onde ficou durante a corrida.

## PWA / offline

- `manifest.json` define nome, ícones, `display: standalone` e cor de tema, para instalação no ecrã inicial (Android/iOS).
- `service-worker.js` faz cache de todos os assets estáticos (`CACHE_NAME = "race-plan-v1"`) com estratégia cache-first e fallback para a rede; em cada `activate` remove caches antigas.
- **Nota:** ao alterar `data.json`, `app.js` ou `style.css`, é preciso subir a versão de `CACHE_NAME` em `service-worker.js`, senão os dispositivos que já instalaram a app continuam a servir a versão em cache.

## Correr localmente

Como usa `fetch("data.json")` e regista um service worker, precisa de ser servido via HTTP (não abrir `index.html` diretamente com `file://`):

```bash
npx serve .
# ou
python3 -m http.server 8080
```

## Atualizar o plano da corrida

Editar `data.json` mantendo a mesma ordem de campos por ponto. Não é preciso tocar em `app.js` a não ser que se queira alterar a lógica de badges ou o layout dos cartões.
