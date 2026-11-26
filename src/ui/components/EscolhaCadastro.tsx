import { Modal } from './Modal'
import { Simbolo } from './Marca'

/** Primeiro passo de um cadastro: preencher à mão ou deixar a IA local extrair dos arquivos. */
export function EscolhaCadastro({ aberto, fechar, titulo, item, manual, ia }: {
  aberto: boolean; fechar: () => void; titulo: string; item: string; manual: () => void; ia: () => void
}) {
  return (
    <Modal titulo={titulo} aberto={aberto} fechar={fechar} largura={640}>
      <div className="escolha" style={{ gridColumn: '1 / -1' }}>
        <button className="escolha-opcao" onClick={manual}>
          <span className="escolha-icone">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.7" /></svg>
          </span>
          <strong>Preencher manualmente</strong>
          <span>Você digita os dados {item} no formulário. Rápido quando já sabe tudo de cabeça.</span>
          <em>Formulário →</em>
        </button>
        <button className="escolha-opcao ia" onClick={ia}>
          <span className="escolha-selo">IA local</span>
          <span className="escolha-icone"><Simbolo tamanho={26} /></span>
          <strong>Criar com IA</strong>
          <span>Escreva, cole ou anexe contrato, boleto, print, PDF, planilha… A IA extrai os detalhes e você confere antes de salvar.</span>
          <em>Abrir assistente →</em>
        </button>
      </div>
      <p className="sutil escolha-nota" style={{ gridColumn: '1 / -1' }}>
        A IA roda no seu computador (Claude Code ou Codex, em Ajustes). Os arquivos ficam numa pasta temporária, só para leitura, e são apagados depois.
      </p>
    </Modal>
  )
}
