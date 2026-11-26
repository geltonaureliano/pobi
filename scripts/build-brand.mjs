/** Gera TODOS os SVGs, PNGs e ícones nativos a partir de uma única geometria. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const dir = path.join(root, 'assets/branding')
const brand = JSON.parse(await readFile(path.join(dir, 'source/brand.json'), 'utf8'))
const { colors: c, geometry: g } = brand
for (const folder of ['logos', 'icons', 'exports', '../../public/licenses', '../../src-tauri/icons']) {
  await mkdir(path.join(dir, folder), { recursive: true })
}

function svg(viewBox, content, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${content}</svg>\n`
}
function pig(color, holes = c.ink) {
  // A máscara mantém as narinas vazadas nas variantes monocromáticas.
  return holes === null
    ? `<path fill="${color}" fill-rule="evenodd" d="${g.pig}${g.nostrils}"/>`
    : `<path fill="${color}" d="${g.pig}"/><path fill="${holes}" d="${g.nostrils}"/>`
}
function wordmark(letters, symbol, holes = c.ink) {
  return svg(g.wordmarkViewBox, `<path fill="${letters}" fill-rule="evenodd" d="${g.letters}"/><circle fill="${letters}" cx="${g.dot.cx}" cy="${g.dot.cy}" r="${g.dot.r}"/><g transform="${g.wordmarkPigTransform}">${pig(symbol, holes)}</g>`, 'pobi')
}
const files = {
  'logos/pobi.svg': wordmark(c.ink, c.amber),
  'logos/pobi-inverse.svg': wordmark(c.cream, c.amber),
  'logos/pobi-mono-ink.svg': wordmark(c.ink, c.ink, null),
  'logos/pobi-mono-cream.svg': wordmark(c.cream, c.cream, null),
  'logos/symbol.svg': svg(g.symbolViewBox, pig(c.amber), 'pobi — símbolo'),
  'logos/symbol-mono-ink.svg': svg(g.symbolViewBox, pig(c.ink, null), 'pobi — símbolo'),
  'logos/symbol-mono-cream.svg': svg(g.symbolViewBox, pig(c.cream, null), 'pobi — símbolo'),
  'icons/app-icon.svg': svg('0 0 1024 1024', `<rect x="32" y="32" width="960" height="960" rx="224" fill="${c.ink}"/><g transform="translate(202 162) scale(7.75)">${pig(c.amber)}</g>`, 'pobi — aplicativo'),
}
for (const [name, contents] of Object.entries(files)) await writeFile(path.join(dir, name), contents)

for (const [name, value] of Object.entries(c)) {
  if (!/^#[0-9A-F]{6}$/i.test(value)) throw new Error(`Cor inválida: ${name}`)
}
const colorTokens = Object.entries(c).map(([name, value]) => `  --brand-${name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${value.toLowerCase()};`).join('\n')
await writeFile(path.join(dir, 'tokens.css'), `/* Gerado por npm run brand:build. Fonte: source/brand.json. */\n:root {\n${colorTokens}\n}\n`)

const master = Buffer.from(files['icons/app-icon.svg'])
for (const size of [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]) {
  await sharp(master).resize(size, size).png().toFile(path.join(dir, `exports/app-icon-${size}.png`))
}
for (const name of ['pobi', 'pobi-inverse', 'pobi-mono-ink', 'pobi-mono-cream', 'symbol']) {
  await sharp(Buffer.from(files[`logos/${name}.svg`])).resize({ width: name === 'symbol' ? 1024 : 1656 }).png().toFile(path.join(dir, `exports/${name}.png`))
}

const nativeDir = path.join(root, 'src-tauri/icons')
const nativeSizes = {
  '32x32': 32, '128x128': 128, '128x128@2x': 256, icon: 1024,
  Square30x30Logo: 30, Square44x44Logo: 44, Square71x71Logo: 71,
  Square89x89Logo: 89, Square107x107Logo: 107, Square142x142Logo: 142,
  Square150x150Logo: 150, Square284x284Logo: 284, Square310x310Logo: 310,
  StoreLogo: 50,
}
for (const [name, size] of Object.entries(nativeSizes)) {
  await sharp(master).resize(size, size).png().toFile(path.join(nativeDir, `${name}.png`))
}

// ICO moderno com PNGs internos, aceito pelo Windows e pelos navegadores.
async function ico(sizes) {
  const frames = await Promise.all(sizes.map(size => sharp(master).resize(size, size).png().toBuffer()))
  const header = Buffer.alloc(6 + 16 * sizes.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  frames.forEach((frame, i) => {
    const pos = 6 + i * 16
    header[pos] = sizes[i] === 256 ? 0 : sizes[i]
    header[pos + 1] = header[pos]
    header.writeUInt16LE(1, pos + 4)
    header.writeUInt16LE(32, pos + 6)
    header.writeUInt32LE(frame.length, pos + 8)
    header.writeUInt32LE(offset, pos + 12)
    offset += frame.length
  })
  return Buffer.concat([header, ...frames])
}
const windowsIcon = await ico([16, 32, 48, 256])
await writeFile(path.join(nativeDir, 'icon.ico'), windowsIcon)
await writeFile(path.join(dir, 'icons/app-icon.ico'), windowsIcon)
await writeFile(path.join(root, 'public/favicon.ico'), await ico([16, 32, 48]))

// ICNS usa PNGs para todas as resoluções de tela Retina atuais.
const chunks = []
for (const [type, size] of [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]]) {
  const png = await sharp(master).resize(size, size).png().toBuffer()
  const header = Buffer.alloc(8)
  header.write(type, 0, 'ascii')
  header.writeUInt32BE(png.length + 8, 4)
  chunks.push(header, png)
}
const icns = Buffer.alloc(8)
icns.write('icns', 0, 'ascii')
icns.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4)
const macIcon = Buffer.concat([icns, ...chunks])
await writeFile(path.join(nativeDir, 'icon.icns'), macIcon)
await writeFile(path.join(dir, 'icons/app-icon.icns'), macIcon)
await writeFile(path.join(root, 'public/favicon.svg'), files['icons/app-icon.svg'])
await sharp(master).resize(180, 180).png().toFile(path.join(root, 'public/apple-touch-icon.png'))
// As licenças acompanham as fontes também no dist/ e no bundle nativo.
for (const license of ['DM-Sans-OFL.txt', 'Azeret-Mono-OFL.txt']) {
  await writeFile(path.join(root, 'public/licenses', license), await readFile(path.join(dir, 'fonts', license)))
}
console.log('Marca gerada: SVG, PNG (16–1024px), favicon, ICO e ICNS.')
