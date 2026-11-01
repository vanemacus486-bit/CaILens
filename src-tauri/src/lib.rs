mod fs_commands;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Builder, GlobalShortcutExt};

/// 设置窗口的 label。前端靠 `getCurrentWindow().label` 判断自己是不是设置窗口，
/// 因此这里不能随需求改名。
const SETTINGS_WINDOW_LABEL: &str = "settings";

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
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }

            // Register global shortcut: Alt+Space
            register_global_shortcut(app.handle().clone())?;

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(Builder::new().build())
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
            open_settings_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn register_global_shortcut(app: tauri::AppHandle) -> tauri::Result<()> {
    let global_shortcut = app.global_shortcut();

    let _ = global_shortcut.on_shortcut(
        "Ctrl+Alt+Space",
        move |app: &tauri::AppHandle, _shortcut, _event| {
            let state = app.state::<QuickCaptureState>();
            toggle_quick_capture(app, &state);
        },
    );

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

/// 打开（或聚焦）独立的设置窗口。
///
/// 与主窗口完全独立：有自己的标题栏、可最小化/最大化/全屏、可拖拽缩放。
/// 前端路由是 HashRouter，因此 URL 必须带 `#/`——写成 `/settings-window`
/// 在 HashRouter 下匹配不到路由（quick-capture 那个窗口就踩过这个坑）。
///
/// 单例语义：窗口已存在时不重复创建，只 show + unminimize + focus，
/// 并通过 `settings:set-tab` 事件把要打开的 tab 送进去（用于「从账户菜单
/// 直接跳到外观」这类入口）。前端若还没加载完，事件会丢，但窗口本身会正常
/// 显示默认 tab——可接受的降级。
#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle, tab: Option<String>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        w.show().map_err(|e| e.to_string())?;
        w.unminimize().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
        if let Some(tab) = tab {
            app.emit_to(SETTINGS_WINDOW_LABEL, "settings:set-tab", tab)
                .map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // 首次打开时也要把目标 tab 带进去。不能靠 emit：此刻 WebView 还没加载完，
    // 事件发出去就丢了。塞进 hash 的 query 里，前端挂载时读一次即可。
    let url = match tab.as_deref() {
        Some(t) if !t.is_empty() => {
            format!("index.html#/settings-window?tab={}", t)
        }
        _ => "index.html#/settings-window".to_string(),
    };

    tauri::WebviewWindowBuilder::new(
        &app,
        SETTINGS_WINDOW_LABEL,
        tauri::WebviewUrl::App(url.into()),
    )
    .title("设置 · CaILens")
    .inner_size(1040.0, 760.0)
    .min_inner_size(720.0, 520.0)
    .decorations(false)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
