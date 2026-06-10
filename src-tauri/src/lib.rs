mod fs_commands;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Builder, GlobalShortcutExt};

struct QuickCaptureState {
    window_label: &'static str,
    last_toggle: std::sync::atomic::AtomicBool,
}

impl QuickCaptureState {
    fn new() -> Self {
        Self {
            window_label: "quick-capture",
            last_toggle: std::sync::atomic::AtomicBool::new(false),
        }
    }
}

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

            // Register global shortcut: Alt+Space
            register_global_shortcut(app.handle().clone())?;

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            Builder::new()
                .with_shortcut("Ctrl+Alt+Space")
                .unwrap()
                .with_handler(|app, _shortcut, _event| {
                    let state = app.state::<QuickCaptureState>();
                    toggle_quick_capture(app, &state);
                })
                .build(),
        )
        .manage(QuickCaptureState::new())
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

fn register_global_shortcut(app: tauri::AppHandle) -> tauri::Result<()> {
    let global_shortcut = app.global_shortcut();
    let _window_label = "quick-capture";

    // Fallback: Ctrl+Shift+A (registered at runtime, not via Builder)
    let _ = global_shortcut.on_shortcut(
        "Ctrl+Shift+A",
        move |app: &tauri::AppHandle, _shortcut, _event| {
            let state = app.state::<QuickCaptureState>();
            toggle_quick_capture(app, &state);
        },
    );

    Ok(())
}

fn toggle_quick_capture(
    app: &tauri::AppHandle,
    state: &tauri::State<QuickCaptureState>,
) {
    let was_pressed = state
        .last_toggle
        .compare_exchange(false, true, std::sync::atomic::Ordering::SeqCst, std::sync::atomic::Ordering::SeqCst)
        .is_ok();

    let window = app.get_webview_window(state.window_label);

    if was_pressed {
        // First press: show and focus the window
        if let Some(w) = window {
            w.show().ok();
            w.set_focus().ok();
            w.set_always_on_top(true).ok();
        } else {
            if let Ok(w) = tauri::WebviewWindowBuilder::new(
                app,
                state.window_label,
                tauri::WebviewUrl::App("/quick-capture".into()),
            )
            .title("")
            .inner_size(560.0, 88.0)
            .decorations(false)
            .always_on_top(true)
            .center()
            .resizable(false)
            .skip_taskbar(true)
            .build()
            {
                w.show().ok();
                w.set_focus().ok();
            }
        }
    } else {
        if let Some(w) = window {
            w.hide().ok();
        }
        state.last_toggle.store(false, std::sync::atomic::Ordering::SeqCst);
    }
}
