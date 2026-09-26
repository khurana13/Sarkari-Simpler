import subprocess
import os
import sys
import time
import shutil

# Configuration
FRONTEND_PORT = 8000
BACKEND_PORT = 8787
NODE_DEFAULT_PATH = r"C:\Program Files\nodejs\node.exe"

def kill_port_process(port):
    """Find and kill the process using a specific port (Windows)"""
    try:
        cmd = f'netstat -ano | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True).decode()
        
        for line in output.strip().split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                pid = parts[-1]
                print(f"[Info] Port {port} is busy (PID: {pid}). Killing process...")
                subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
                return True
    except Exception:
        pass
    return False

def find_node():
    """Find node executable"""
    node_path = shutil.which("node")
    if node_path:
        return node_path
    if os.path.exists(NODE_DEFAULT_PATH):
        return NODE_DEFAULT_PATH
    return None

def main():
    print("=" * 60)
    print(" Sarkari-Simpler: All-in-One Local Runner ")
    print("=" * 60)

    # Clean up existing processes
    kill_port_process(FRONTEND_PORT)
    kill_port_process(BACKEND_PORT)

    node_path = find_node()
    if not node_path:
        print("[Error] Node.js not found! Please install Node.js.")
        sys.exit(1)

    print(f"[Backend] Starting on Port {BACKEND_PORT}...")
    backend_proc = subprocess.Popen(
        [node_path, "mock-server.js"],
        cwd=os.getcwd()
    )

    time.sleep(1)

    print(f"[Frontend] Starting on Port {FRONTEND_PORT}...")
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(FRONTEND_PORT), "--directory", "frontend"],
        cwd=os.getcwd()
    )

    print("\n[Success] Both services are running!")
    print(f"Frontend URL: http://localhost:{FRONTEND_PORT}")
    print(f"Backend Health: http://localhost:{BACKEND_PORT}/health")
    print("\nPress Ctrl+C to stop both services.\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("[Error] Backend stopped unexpectedly!")
                break
            if frontend_proc.poll() is not None:
                print("[Error] Frontend stopped unexpectedly!")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Info] Stopping services...")
    finally:
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
