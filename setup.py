import subprocess
import os
import sys
import time
import shutil

def print_banner():
    print("\033[96m" + "="*60)
    print("   Sarkari-Simpler: Integrated Project Runner (Python)")
    print("="*60 + "\033[0m")

def check_requirements():
    """Check if necessary tools are installed"""
    print("[1/3] Checking environment...")
    
    node_path = shutil.which("node")
    if not node_path:
        print("\033[91m[Error] Node.js not found! Please install it from https://nodejs.org/\033[0m")
        return False
    
    print(f"  ✓ Node.js found at: {node_path}")
    return node_path

def kill_existing_processes():
    """Kill processes on standard project ports to prevent conflicts"""
    print("[2/3] Cleaning up previous sessions...")
    ports = [8000, 8787]
    for port in ports:
        if sys.platform.startswith('win'):
            try:
                output = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
                for line in output.strip().split('\n'):
                    if 'LISTENING' in line:
                        pid = line.strip().split()[-1]
                        subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
                        print(f"  ✓ Stopped process {pid} on port {port}")
            except:
                pass
    return True

def launch_project(node_path):
    """Start both backend and frontend"""
    print("[3/3] Launching Sarkari-Simpler...")
    
    # Start Backend
    backend = subprocess.Popen(
        [node_path, "mock-server.js"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        bufsize=1,
        universal_newlines=True
    )
    
    # Start Frontend (using Python's built-in server as it's always available)
    frontend = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000", "--directory", "frontend"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    print("\n\033[92m🚀 SUCCESS: All services are live!\033[0m")
    print("\033[94m------------------------------------------------")
    print("🌍 Dashboard:  http://localhost:8000")
    print("⚙️  Backend:    http://localhost:8787")
    print("------------------------------------------------\033[0m")
    print("Press \033[93mCtrl+C\033[0m to stop the server.\n")

    try:
        # Stream backend logs to show it's working
        while True:
            line = backend.stdout.readline()
            if line:
                print(f"\033[90m[Backend]\033[0m {line.strip()}")
            if backend.poll() is not None or frontend.poll() is not None:
                break
    except KeyboardInterrupt:
        print("\n\033[93m[Info] Shutting down services...\033[0m")
    finally:
        backend.terminate()
        frontend.terminate()
        print("\033[92m✓ Clean exit.\033[0m")

if __name__ == "__main__":
    print_banner()
    node = check_requirements()
    if node:
        kill_existing_processes()
        launch_project(node)
