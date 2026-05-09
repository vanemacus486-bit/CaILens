use std::path::Path;
use serde::Serialize;

#[derive(Serialize)]
pub struct FileEntry {
    pub path: String,
    pub modified: u64, // unix timestamp milliseconds
}

#[tauri::command]
pub fn read_dir_recursive(path: String) -> Result<Vec<FileEntry>, String> {
    let root = Path::new(&path);
    let mut entries = Vec::new();
    scan_dir(root, &mut entries).map_err(|e| format!("Failed to scan directory: {}", e))?;
    Ok(entries)
}

fn scan_dir(dir: &Path, entries: &mut Vec<FileEntry>) -> std::io::Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            scan_dir(&path, entries)?;
        } else if path.extension().map(|e| e == "json").unwrap_or(false) {
            let metadata = std::fs::metadata(&path)?;
            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            entries.push(FileEntry {
                path: path.to_string_lossy().to_string(),
                modified,
            });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Atomic write: write to .tmp file then rename to target path.
/// This prevents partial writes if the process crashes mid-write.
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let tmp_path = format!("{}.tmp", path);
    std::fs::write(&tmp_path, &content).map_err(|e| format!("Failed to write temp file: {}", e))?;
    std::fs::rename(&tmp_path, &path).map_err(|e| format!("Failed to rename temp file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
pub fn create_dir_all(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Given a date prefix directory and filename pattern (e.g. `YYYY-MM-DD-`),
/// find the next available sequence number by scanning existing files.
#[tauri::command]
pub fn get_next_sequence(dir: String, prefix: String) -> Result<u32, String> {
    let dir_path = Path::new(&dir);
    if !dir_path.exists() {
        return Ok(1);
    }
    let mut max_seq = 0u32;
    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if let Some(stripped) = name.strip_prefix(&prefix) {
                if let Some(num_str) = stripped.strip_suffix(".json") {
                    if let Ok(num) = num_str.parse::<u32>() {
                        if num > max_seq {
                            max_seq = num;
                        }
                    }
                }
            }
        }
    }
    Ok(max_seq + 1)
}

// ── File watcher ──────────────────────────────────────────────

use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Serialize)]
pub struct FsChangeEvent {
    pub kind: String,
    pub path: String,
}

struct WatcherState(Mutex<Option<RecommendedWatcher>>);

#[tauri::command]
pub fn watch_dir(app: AppHandle, path: String) -> Result<(), String> {
    let app_handle = app.app_handle().clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let kind = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => return,
                };
                for p in &event.paths {
                    let _ = app_handle.emit(
                        "fs-change",
                        FsChangeEvent {
                            kind: kind.to_string(),
                            path: p.to_string_lossy().to_string(),
                        },
                    );
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to start watching: {}", e))?;

    app.manage(WatcherState(Mutex::new(Some(watcher))));

    Ok(())
}

#[tauri::command]
pub fn stop_watching(app: AppHandle) -> Result<(), String> {
    if let Some(state) = app.try_state::<WatcherState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = None; // drop the watcher, stopping it
        }
    }
    Ok(())
}
