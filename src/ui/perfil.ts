import { useEffect, useState } from 'react'
import { lerAjuste, salvarAjuste } from '../domain/analise/repository'

/** Nome e avatar do perfil (tabela de ajustes). Mudanças avisam o app todo pelo evento `pobi:perfil`. */
export interface PerfilUsuario { nome: string; avatar: string | null; cor: string }

export const CORES_AVATAR = ['#A39A5B', '#EA9A19', '#1C1C1C', '#C9412E', '#1F9D55', '#3B6FD4', '#8E5BD1', '#D45B9A', '#2AA3A3']
const PADRAO: PerfilUsuario = { nome: 'Gelton', avatar: null, cor: CORES_AVATAR[0] }

export async function lerPerfil(): Promise<PerfilUsuario> {
  const [nome, avatar, cor] = await Promise.all([lerAjuste('nome'), lerAjuste('avatar'), lerAjuste('avatar_cor')])
  return { nome: nome || PADRAO.nome, avatar: avatar || null, cor: cor || PADRAO.cor }
}

export async function salvarPerfil(p: Partial<PerfilUsuario>) {
  if (p.nome !== undefined) await salvarAjuste('nome', p.nome)
  if (p.avatar !== undefined) await salvarAjuste('avatar', p.avatar ?? '')
  if (p.cor !== undefined) await salvarAjuste('avatar_cor', p.cor)
  window.dispatchEvent(new Event('pobi:perfil'))
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<PerfilUsuario>(PADRAO)
  useEffect(() => {
    const carregar = () => { lerPerfil().then(setPerfil).catch(() => {}) }
    carregar()
    window.addEventListener('pobi:perfil', carregar)
    return () => window.removeEventListener('pobi:perfil', carregar)
  }, [])
  return perfil
}

export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'

/** Reduz a imagem escolhida para um quadrado de 256px (JPEG), para guardar leve no banco. */
export function imagemParaAvatar(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    if (!arquivo.type.startsWith('image/')) return falha(new Error('Escolha uma imagem (JPG, PNG, HEIC…).'))
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256)
      URL.revokeObjectURL(url)
      ok(canvas.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir essa imagem.')) }
    img.src = url
  })
}
