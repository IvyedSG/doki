use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

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
        .current_dir(&dir)
        .spawn()
        .ok()?;
    eprintln!("[doki] Backend iniciado (pid {})", child.id());
    Some(child)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let child = start_backend();
            if child.is_none() {
                eprintln!("[doki] Backend no disponible — iniciar manualmente con dev.sh");
            }
            *app.state::<BackendProcess>().0.lock().unwrap() = child;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<BackendProcess>() {
                    if let Some(mut child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        eprintln!("[doki] Backend detenido");
                    }
                }
            }
        });
}
