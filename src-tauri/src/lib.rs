use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct AppProcesses {
    backend: Mutex<Option<Child>>,
    llama: Mutex<Option<Child>>,
}

fn find_backend_py() -> Option<std::path::PathBuf> {
    let candidates = [
        "../doki-be/run.py",
        "../../doki-be/run.py",
        "doki-be/run.py",
        "../run.py",
    ];
    for c in &candidates {
        let p = std::path::PathBuf::from(c);
        if p.exists() {
            return Some(p.parent().unwrap().to_path_buf());
        }
    }
    None
}

fn start_backend() -> Option<Child> {
    let dir = find_backend_py()?;
    let child = Command::new("uv")
        .args(["run", "python", "run.py"])
        .env("DOKI_DESKTOP", "true")
        .current_dir(&dir)
        .spawn()
        .ok()?;
    eprintln!("[doki] Backend iniciado (pid {})", child.id());
    Some(child)
}

fn find_llama_server(app_handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // 1. Try bundled resource path first (for production)
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        let target = if cfg!(target_arch = "aarch64") && cfg!(target_os = "macos") {
            "llama-server-aarch64-apple-darwin"
        } else if cfg!(target_arch = "x86_64") && cfg!(target_os = "macos") {
            "llama-server-x86_64-apple-darwin"
        } else {
            "llama-server"
        };
        
        let p = res_dir.join(target);
        if p.exists() {
            return Some(p);
        }
        let p = res_dir.join("binaries").join(target);
        if p.exists() {
            return Some(p);
        }
    }
    
    // 2. Try development candidates
    let target = if cfg!(target_arch = "aarch64") && cfg!(target_os = "macos") {
        "llama-server-aarch64-apple-darwin"
    } else if cfg!(target_arch = "x86_64") && cfg!(target_os = "macos") {
        "llama-server-x86_64-apple-darwin"
    } else {
        "llama-server"
    };

    let candidates = [
        format!("binaries/{}", target),
        format!("src-tauri/binaries/{}", target),
        format!("../src-tauri/binaries/{}", target),
        "llama-server".to_string(),
    ];
    
    for c in &candidates {
        let p = std::path::PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

fn find_model_path(app_handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // 1. Try resource path
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        let p = res_dir.join("resources/models/model.gguf");
        if p.exists() {
            return Some(p);
        }
    }
    // 2. Try dev paths
    let candidates = [
        "resources/models/model.gguf",
        "src-tauri/resources/models/model.gguf",
        "../resources/models/model.gguf",
        "../../resources/models/model.gguf",
    ];
    for c in &candidates {
        let p = std::path::PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

fn start_llama_server(app_handle: &tauri::AppHandle) -> Option<Child> {
    let server_bin = find_llama_server(app_handle)?;
    let model_path = find_model_path(app_handle)?;
    let child = Command::new(server_bin)
        .args([
            "-m",
            model_path.to_str()?,
            "--port",
            "11435",
            "-c",
            "8192",
        ])
        .spawn()
        .ok()?;
    eprintln!("[doki] llama-server iniciado (pid {}) con modelo {:?}", child.id(), model_path);
    Some(child)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppProcesses {
            backend: Mutex::new(None),
            llama: Mutex::new(None),
        })
        .setup(|app| {
            let backend_child = start_backend();
            if backend_child.is_none() {
                eprintln!("[doki] Backend no disponible — iniciar manualmente con dev.sh");
            }
            
            let llama_child = start_llama_server(app.handle());
            if llama_child.is_none() {
                eprintln!("[doki] llama-server no disponible — asegúrese de colocar model.gguf en resources/models");
            }

            let state = app.state::<AppProcesses>();
            *state.backend.lock().unwrap() = backend_child;
            *state.llama.lock().unwrap() = llama_child;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<AppProcesses>() {
                    if let Some(mut child) = state.backend.lock().unwrap().take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        eprintln!("[doki] Backend detenido");
                    }
                    if let Some(mut child) = state.llama.lock().unwrap().take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        eprintln!("[doki] llama-server detenido");
                    }
                }
            }
        });
}
