# Marca pobi · O escondido

Esta é a **fonte oficial da identidade visual do pobi**. Comece aqui antes de criar telas, imagens, ícones ou materiais para o projeto. O conceito aprovado é **03 / O escondido**: o porquinho vive na letra **o** do nome, com duas orelhas e duas narinas. A assinatura é sempre **pobi**, em minúsculas.

[Abrir o guia visual e os downloads](./index.html) · [Geometria e metadados](./source/brand.json)

O guia é HTML independente: abra `assets/branding/index.html` no navegador ou, durante `npm run dev`, visite `/assets/branding/index.html`. Funciona sem conexão. Os SVGs são vetores reais; não são imagens geradas embutidas em um SVG.

## Onde fica cada coisa

| Caminho | Conteúdo e uso |
|---|---|
| `source/brand.json` | Nome, conceito, versão, paleta, tipografia e curvas originais. **Fonte única da geometria.** |
| `logos/pobi.svg` | Assinatura principal: letras escuras + porquinho âmbar, fundo transparente. |
| `logos/pobi-inverse.svg` | Letras creme + porquinho âmbar; para fundos escuros. |
| `logos/pobi-mono-{ink,cream}.svg` | Assinaturas de uma cor, com narinas vazadas. |
| `logos/symbol.svg` | O porquinho isolado; não adicionar olhos ou boca. |
| `logos/symbol-mono-{ink,cream}.svg` | Símbolos de uma cor. |
| `icons/app-icon.svg` | Matriz do ícone: símbolo âmbar, base carvão e margem transparente. |
| `icons/app-icon.{ico,icns}` | Ícones prontos para Windows e macOS. |
| `exports/` | PNGs transparentes das assinaturas e símbolo; ícone em 16, 32, 48, 64, 128, 180, 192, 256, 512 e 1024 px. |
| `fonts/` | WOFF2 variáveis locais, CSS e respectivas licenças OFL. |
| `tokens.css` | Cores primárias geradas de `source/brand.json`, importadas pelo tema do app. |
| `index.html` | Guia visual, cores, exemplos e links para os arquivos finais. |
| `../../scripts/build-brand.mjs` | Gerador reproduzível de SVG, PNG, ICO, ICNS, favicon e ícones Tauri. |

## Paleta

| Cor | Hex | Papel |
|---|---|---|
| Âmbar | `#EA9A19` | Porquinho, ações principais, destaques e dados em gráficos. |
| Creme | `#EDECE1` | Fundos acolhedores e assinatura inversa. |
| Carvão | `#1C1C1C` | Texto principal, navegação e ícone do aplicativo. |
| Âmbar claro | `#F7DCAE` | Apoio, escalas e fundos de baixa intensidade. |

Os **papéis da interface** ficam em `src/ui/theme.css`: `--texto`, `--texto-2`, `--fundo`, `--superficie`, `--elevada`, `--linha` e cores de estado. Eles mudam entre claro e escuro. Não use a cor da marca como substituta indiscriminada desses papéis. Âmbar não é adequado para texto pequeno sobre creme; use `--accent-texto`. Verde/vermelho representam estados financeiros, não a marca.

## Tipografia e forma

- **Assinatura:** curvas desenhadas para a marca. Não digitar “pobi” com outra fonte para simular o logo. Os PNGs e SVGs têm a mesma geometria.
- **DM Sans:** interface, navegação, títulos e textos. Pesos usuais: 400, 500, 600 e 650.
- **Azeret Mono:** dinheiro, dados tabulares, legendas e pequenos rótulos. Pesos usuais: 400 e 500. Prefira `font-variant-numeric: tabular-nums` nos valores.
- As fontes ficam locais: sem Google Fonts ou outras requisições externas. São as versões variáveis latinas do Fontsource 5.3.0, que incluem os acentos portugueses. Licenças preservadas em `fonts/*-OFL.txt` e copiadas para `public/licenses/`, para acompanharem os builds distribuídos.
- Cantos suaves, traços arredondados e espaço livre; evitar efeitos 3D, gradientes na marca, sombras decorativas pesadas ou excesso de âmbar.

## Regras de aplicação

1. Use a assinatura em largura mínima de **88 px** e o símbolo em pelo menos **20 px**. Em 16 px, use o favicon gerado e preserve suas margens.
2. Deixe ao redor da assinatura pelo menos a altura do ponto do `i` (aproximadamente 1/5 da altura da marca). No símbolo isolado, deixe 1/4 de sua largura.
3. Preserve a proporção do `viewBox`; não cortar, esticar, rotacionar ou aproximar as letras.
4. Em fundo claro, use a principal; em fundo escuro, a inversa. As variantes monocromáticas servem para uma única tinta, gravação ou contraste neutro.
5. Não adicionar moeda, olho, boca, focinho separado, sombra ou contorno. A sutileza do símbolo é parte do conceito.
6. Marca decorativa: `alt=""`; marca que identifica o produto: nome acessível **pobi**. Não repetir nomes no leitor de tela.
7. Mantenha o título de produto “Pobi” nos metadados nativos; na comunicação visual, use “pobi”.

## Usar no React

```tsx
import { Marca, Simbolo } from './ui/components/Marca'

<Marca />                 // adapta as letras ao tema da interface
<Marca inversa />         // sempre adequada ao fundo escuro, como a sidebar
<Simbolo />               // símbolo decorativo; dê nome acessível ao botão pai
```

A implementação está em `src/ui/components/Marca.tsx`. Importe os arquivos SVG por URL pelo Vite; não copie as curvas para cada componente. `src/ui/icones.tsx` contém apenas ícones de navegação, não a marca.

## Alterar e regenerar

```sh
npm ci
# Edite a geometria/paleta em assets/branding/source/brand.json.
npm run brand:build
npm run build
npm run lint
npm test
npm run test:ui
```

O gerador atualiza esta pasta, `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` e os ícones em `src-tauri/icons/`. Também emite `tokens.css`. **Não editar os arquivos gerados individualmente.** Inclua todos os derivados no mesmo commit; alterações do logo devem passar por revisão visual do guia e do app.

As fontes são arquivos licenciados, não resultados do gerador. Para substituí-las, preserve as licenças e atualize `fonts/fonts.css` e a documentação. Uma nova ilustração aprovada deve entrar em uma subpasta com nome descritivo, SVG/PNG original e instruções de uso; não sobrescrever o símbolo oficial.

## Para outras IAs e colaboradores

A marca aprovada é esta, não as propostas anteriores de cofrinho de perfil. Consulte este guia e o `AGENTS.md` da raiz, reutilize `Marca`/`Simbolo`, siga os papéis semânticos do tema e verifique claro/escuro, teclado e telas pequenas. Nenhuma alteração de identidade precisa mudar regras financeiras, banco ou migrações.
