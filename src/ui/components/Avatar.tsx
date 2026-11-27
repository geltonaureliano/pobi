import { iniciais, type PerfilUsuario } from '../perfil'

export function Avatar({ perfil, tamanho = 34 }: { perfil: PerfilUsuario; tamanho?: number }) {
  return (
    <span className="avatar" style={{ width: tamanho, height: tamanho, background: perfil.avatar ? undefined : perfil.cor, fontSize: tamanho * 0.38, color: perfil.cor === '#1C1C1C' ? '#f5f4ee' : undefined }}>
      {perfil.avatar ? <img src={perfil.avatar} alt="" /> : iniciais(perfil.nome)}
    </span>
  )
}
