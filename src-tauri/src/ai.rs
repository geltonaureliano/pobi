//! Executa o CLI de IA instalado na máquina (Claude Code ou Codex).
//! Apps de interface no macOS não herdam o PATH do terminal, então o binário
//! é procurado pelo shell de login do usuário.

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};

#[derive(Serialize)]
pub struct MotorDisponivel {
    pub motor: String,
    pub caminho: Option<String>,
}

fn shell_de_login() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into())
}

fn localizar(binario: &str) -> Option<String> {
    let saida = Command::new(shell_de_login())
        .args(["-lc", &format!("command -v {binario}")])
        .output()
        .ok()?;
    let caminho = String::from_utf8_lossy(&saida.stdout).trim().to_string();
    (saida.status.success() && !caminho.is_empty()).then_some(caminho)
}

#[tauri::command]
pub fn motores_disponiveis() -> Vec<MotorDisponivel> {
    ["claude", "codex"]
        .iter()
        .map(|m| MotorDisponivel { motor: m.to_string(), caminho: localizar(m) })
        .collect()
}

/// Envia o prompt pela entrada padrão e devolve a saída do CLI como texto.
#[tauri::command]
pub async fn executar_analise(motor: String, prompt: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || rodar(&motor, &prompt, None, &[]))
        .await
        .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
pub struct Anexo {
    pub nome: String,
    pub base64: String,
}

/// Como `executar_analise`, mas grava os anexos numa pasta temporária e deixa a IA
/// ler só essa pasta (somente leitura). A pasta é apagada no fim.
#[tauri::command]
pub async fn executar_ia(motor: String, prompt: String, anexos: Vec<Anexo>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let pasta = std::env::temp_dir().join(format!(
            "pobi-ia-{}",
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0)
        ));
        std::fs::create_dir_all(&pasta).map_err(|e| e.to_string())?;
        let mut nomes = Vec::new();
        for (i, a) in anexos.iter().enumerate() {
            let nome = nome_seguro(&a.nome, i);
            let bytes = decodificar_base64(&a.base64).ok_or_else(|| format!("Anexo inválido: {}", a.nome))?;
            std::fs::write(pasta.join(&nome), bytes).map_err(|e| e.to_string())?;
            nomes.push(nome);
        }
        let resultado = rodar(&motor, &prompt, Some(&pasta), &nomes);
        let _ = std::fs::remove_dir_all(&pasta);
        resultado
    })
    .await
    .map_err(|e| e.to_string())?
}

fn nome_seguro(nome: &str, i: usize) -> String {
    let base: String = nome
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let base = base.trim_start_matches('.');
    if base.is_empty() { format!("anexo-{i}") } else { format!("{:02}-{base}", i + 1) }
}

fn decodificar_base64(s: &str) -> Option<Vec<u8>> {
    let valor = |c: u8| -> Option<u32> {
        Some(match c {
            b'A'..=b'Z' => (c - b'A') as u32,
            b'a'..=b'z' => (c - b'a' + 26) as u32,
            b'0'..=b'9' => (c - b'0' + 52) as u32,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            _ => return None,
        })
    };
    let limpo: Vec<u8> = s.bytes().filter(|c| !c.is_ascii_whitespace() && *c != b'=').collect();
    let mut saida = Vec::with_capacity(limpo.len() * 3 / 4);
    for bloco in limpo.chunks(4) {
        let mut n = 0u32;
        for (i, &c) in bloco.iter().enumerate() {
            n |= valor(c)? << (18 - 6 * i);
        }
        let bytes = [(n >> 16) as u8, (n >> 8) as u8, n as u8];
        saida.extend_from_slice(&bytes[..bloco.len().saturating_sub(1)]);
    }
    Some(saida)
}

const IMAGENS: [&str; 5] = ["png", "jpg", "jpeg", "gif", "webp"];

fn rodar(motor: &str, prompt: &str, pasta: Option<&std::path::Path>, anexos: &[String]) -> Result<String, String> {
    let binario = match motor {
        "claude" | "codex" => motor,
        _ => return Err(format!("Motor desconhecido: {motor}")),
    };
    let caminho = localizar(binario)
        .ok_or_else(|| format!("O CLI `{binario}` não foi encontrado. Instale-o ou escolha outro em Ajustes."))?;

    let mut args: Vec<String> = match binario {
        // -p: modo não interativo; o prompt chega pela entrada padrão.
        "claude" => vec!["-p".into(), "--output-format".into(), "text".into()],
        // exec -: lê o prompt da entrada padrão; somente leitura.
        _ => vec!["exec".into(), "--sandbox".into(), "read-only".into(), "--skip-git-repo-check".into()],
    };
    if let Some(p) = pasta {
        let p = p.to_string_lossy().to_string();
        if binario == "claude" {
            args.extend(["--add-dir".into(), p, "--allowedTools".into(), "Read".into()]);
        } else {
            args.extend(["-C".into(), p.clone()]);
            for a in anexos {
                let ext = a.rsplit('.').next().unwrap_or("").to_lowercase();
                if IMAGENS.contains(&ext.as_str()) {
                    args.extend(["-i".into(), format!("{p}/{a}")]);
                }
            }
        }
    }
    if binario == "codex" {
        args.push("-".into());
    }

    let mut cmd = Command::new(&caminho);
    cmd.args(&args)
        .env("PATH", path_do_login())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(p) = pasta {
        cmd.current_dir(p);
    }
    let mut filho = cmd.spawn().map_err(|e| format!("Falha ao iniciar {binario}: {e}"))?;

    filho
        .stdin
        .take()
        .ok_or("Sem entrada padrão")?
        .write_all(prompt.as_bytes())
        .map_err(|e| e.to_string())?;

    let saida = filho.wait_with_output().map_err(|e| e.to_string())?;
    if !saida.status.success() {
        return Err(format!(
            "{binario} terminou com erro: {}",
            String::from_utf8_lossy(&saida.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&saida.stdout).to_string())
}

fn path_do_login() -> String {
    Command::new(shell_de_login())
        .args(["-lc", "printf %s \"$PATH\""])
        .output()
        .ok()
        .map(|s| String::from_utf8_lossy(&s.stdout).to_string())
        .filter(|p| !p.is_empty())
        .unwrap_or_else(|| std::env::var("PATH").unwrap_or_default())
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn base64_decodifica_com_e_sem_padding() {
        assert_eq!(decodificar_base64("UG9iaQ==").unwrap(), b"Pobi");
        assert_eq!(decodificar_base64("UG9iaSE=").unwrap(), b"Pobi!");
        assert_eq!(decodificar_base64("UG9iaSEh").unwrap(), b"Pobi!!");
        assert!(decodificar_base64("@@").is_none());
    }

    #[test]
    fn nome_de_anexo_nao_escapa_da_pasta() {
        assert_eq!(nome_seguro("../../etc/passwd", 0), "01-_.._etc_passwd");
        assert_eq!(nome_seguro("contrato final.pdf", 1), "02-contrato_final.pdf");
    }
}
