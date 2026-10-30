// dlltool 替身：把 .def 转成导入库，内部交给 rust-lld 的 link 模式。
//
// 为什么需要它：rustc 在 windows-gnu target 上给 `raw-dylib` 链接属性（windows-sys 0.61 /
// windows-link 走这条路）生成导入库时会调 `dlltool`。rustup 自带的
// `self-contained/dlltool.exe` 内部还要调 `as.exe`，而本机没有 MinGW binutils，
// 于是报 `dlltool.exe: CreateProcess`。
//
// 实测 `rust-lld -flavor link /lib /def:X /out:Y /machine:x64` 能产出合法导入库
// （COFF 归档），所以这里只做参数翻译。
//
// 定位 rust-lld：优先环境变量 CAILENS_RUST_LLD，否则靠 PATH（build-env.ps1 会把
// rustc 的 bin 目录加进去）。
//
// 用法（由 rustc 调用，无需手动执行）：
//   dlltool.exe -d kernel32.def -D kernel32.dll -l libkernel32.a -m i386:x86-64 -f --64

use std::env;
use std::process::{exit, Command};

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let mut def: Option<String> = None;
    let mut out: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        let a = args[i].as_str();
        match a {
            // 需要取值的参数
            "-d" | "--input-def" => {
                if i + 1 < args.len() {
                    def = Some(args[i + 1].clone());
                    i += 2;
                    continue;
                }
            }
            "-l" | "--output-lib" => {
                if i + 1 < args.len() {
                    out = Some(args[i + 1].clone());
                    i += 2;
                    continue;
                }
            }
            // 有值但用不上的
            "-D" | "--dllname" | "-m" | "--machine" | "--temp-prefix" | "-e" | "--output-exp"
            | "-z" | "--output-def" | "--ident" | "-U" | "--add-underscore" => {
                i += 2;
                continue;
            }
            _ => {}
        }
        i += 1;
    }

    // 版本探测 / 帮助调用：安静成功，别让编译脚本因为拿不到 -d 就中断。
    let (def, out) = match (def, out) {
        (Some(d), Some(o)) => (d, o),
        _ => exit(0),
    };

    let lld = env::var("CAILENS_RUST_LLD").unwrap_or_else(|_| "rust-lld".to_string());
    let status = Command::new(&lld)
        .arg("-flavor")
        .arg("link")
        .arg("/lib")
        .arg(format!("/def:{}", def))
        .arg(format!("/out:{}", out))
        .arg("/machine:x64")
        .arg("/nologo")
        .status();

    match status {
        Ok(s) if s.success() => exit(0),
        Ok(s) => {
            eprintln!("dlltool-stub: rust-lld exited with {:?}", s.code());
            exit(1)
        }
        Err(e) => {
            eprintln!("dlltool-stub: cannot run `{}`: {}", lld, e);
            exit(2)
        }
    }
}
