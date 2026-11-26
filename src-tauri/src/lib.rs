mod ai;

use tauri_plugin_sql::{Migration, MigrationKind};

pub const DB_URL: &str = "sqlite:financas.db";

fn migracoes() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "estrutura inicial",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    },
    Migration {
        version: 2,
        description: "pagamento de fatura e pausa de recorrentes",
        sql: include_str!("../migrations/002_pagamento_fatura.sql"),
        kind: MigrationKind::Up,
    },
    Migration {
        version: 3,
        description: "detalhes de dividas e receitas",
        sql: include_str!("../migrations/003_detalhes.sql"),
        kind: MigrationKind::Up,
    },
    Migration {
        version: 4,
        description: "conversas do assistente de IA",
        sql: include_str!("../migrations/004_conversas_ia.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migracoes())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![ai::motores_disponiveis, ai::executar_analise, ai::executar_ia])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o aplicativo");
}
