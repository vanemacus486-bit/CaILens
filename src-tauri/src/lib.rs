mod fs_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            fs_commands::read_dir_recursive,
            fs_commands::read_dir_with_content,
            fs_commands::read_text_file,
            fs_commands::write_text_file,
            fs_commands::delete_file,
            fs_commands::create_dir_all,
            fs_commands::get_next_sequence,
            fs_commands::watch_dir,
            fs_commands::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
