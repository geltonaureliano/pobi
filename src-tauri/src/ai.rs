//! Executa o CLI de IA instalado na máquina (Claude Code ou Codex).
//! Apps de interface no macOS não herdam o PATH do terminal, então o binário
//! é procurado pelo shell de login do usuário.

use serde::Serialize;
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
    tauri::async_runtime::spawn_blocking(move || {
        let binario = match motor.as_str() {
            "claude" | "codex" => motor.as_str(),
            _ => return Err(format!("Motor desconhecido: {motor}")),
        };
        let caminho = localizar(binario)
            .ok_or_else(|| format!("O CLI `{binario}` não foi encontrado. Instale-o ou escolha outro em Ajustes."))?;

        let args: Vec<&str> = match binario {
            // -p: modo não interativo; o prompt chega pela entrada padrão.
            "claude" => vec!["-p", "--output-format", "text"],
            // exec -: lê o prompt da entrada padrão; somente leitura.
            _ => vec!["exec", "--sandbox", "read-only", "--skip-git-repo-check", "-"],
        };

        let mut filho = Command::new(&caminho)
            .args(&args)
            .env("PATH", path_do_login())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Falha ao iniciar {binario}: {e}"))?;

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
    })
    .await
    .map_err(|e| e.to_string())?
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
