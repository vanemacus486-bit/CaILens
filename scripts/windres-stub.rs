// windres 替身：产出一个合法的空 COFF 目标文件。
// tauri-build -> embed-resource 在 GNU target 上会调用 windres 嵌图标/清单，
// 这台机器没有 MinGW binutils 里的 windres。资源留空的代价只有「exe 用系统默认图标」。
use std::env;
use std::fs;
use std::process::exit;

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut out: Option<String> = None;
    let mut i = 1;
    while i < args.len() {
        let a = &args[i];
        if a == "-o" || a == "--output" {
            if i + 1 < args.len() {
                out = Some(args[i + 1].clone());
                i += 2;
                continue;
            }
        }
        if let Some(rest) = a.strip_prefix("--output=") {
            out = Some(rest.to_string());
        }
        i += 1;
    }

    let mut hdr = Vec::with_capacity(20);
    hdr.extend_from_slice(&0x8664u16.to_le_bytes());
    hdr.extend_from_slice(&0u16.to_le_bytes());
    hdr.extend_from_slice(&0u32.to_le_bytes());
    hdr.extend_from_slice(&0u32.to_le_bytes());
    hdr.extend_from_slice(&0u32.to_le_bytes());
    hdr.extend_from_slice(&0u16.to_le_bytes());
    hdr.extend_from_slice(&0u16.to_le_bytes());

    if let Some(p) = out {
        if let Err(e) = fs::write(&p, &hdr) {
            eprintln!("windres-stub: write {p} failed: {e}");
            exit(2);
        }
    }
}
