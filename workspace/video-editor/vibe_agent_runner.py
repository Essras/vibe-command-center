#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import traceback
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
STEPS_LOG_PATH = BASE_DIR / "vibe_agent_steps.json"
AUTO_RUN_LOG = BASE_DIR / "auto_run.log"

def log_to_file(text):
    print(text)
    with open(AUTO_RUN_LOG, "a", encoding="utf-8") as f:
        f.write(text + "\n")

def save_steps(steps):
    try:
        with open(STEPS_LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(steps, f, ensure_ascii=False, indent=2)
    except Exception as e:
        pass

def update_step(steps, step_name, status, error=None, healing=None):
    for s in steps:
        if s["name"] == step_name:
            s["status"] = status
            if error:
                s["error"] = error
            if healing:
                s["healing"] = healing
            break
    else:
        steps.append({
            "name": step_name,
            "status": status,
            "error": error,
            "healing": healing
        })
    save_steps(steps)

def try_install_package(package_name):
    log_to_file(f"🔧 [Self-Healing] กำลังติดตั้งไลบรารีที่ขาดหายไป: {package_name}...")
    try:
        # Run pip install with system packages flag if allowed (Alpine/Ubuntu environment)
        cmd = [sys.executable, "-m", "pip", "install", package_name, "--break-system-packages"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            cmd = [sys.executable, "-m", "pip", "install", package_name]
            res = subprocess.run(cmd, capture_output=True, text=True)
        
        if res.returncode == 0:
            log_to_file(f"✅ [Self-Healing] ติดตั้ง {package_name} สำเร็จแล้ว!")
            return True
        else:
            log_to_file(f"❌ [Self-Healing] ไม่สามารถติดตั้ง {package_name} ได้: {res.stderr}")
            return False
    except Exception as e:
        log_to_file(f"❌ [Self-Healing] เกิดข้อผิดพลาดตอนรัน pip install: {e}")
        return False

def call_gemini_to_fix_code(api_key, file_path, file_content, error_msg):
    log_to_file(f"🧠 [Self-Healing] กำลังเรียกใช้งาน AI (Gemini 2.5 Flash) เพื่อวิเคราะห์และแก้ไขโค้ดที่ผิดพลาด...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""You are an expert AI code debugger. A python script failed in the pipeline.
File path: {file_path}

Here is the source code:
```python
{file_content}
```

Here is the error message / stack trace:
```
{error_msg}
```

Please identify the bug, fix it, and return ONLY the complete corrected python code. 
Do not explain the bug. Do not write markdown wrapping (no ```python). Just output the raw python code."""

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            res = json.loads(response.read().decode('utf-8'))
            text = res['candidates'][0]['content']['parts'][0]['text']
            
            # Sanitization of model output if it contains markdown formatting
            if "```python" in text:
                text = text.split("```python", 1)[1]
            if "```" in text:
                text = text.split("```", 1)[0]
            
            return text.strip()
    except Exception as e:
        log_to_file(f"⚠️ [Self-Healing] AI API call failed: {e}")
        return None

def execute_command_with_healing(cmd, steps, step_name):
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        update_step(steps, step_name, "PROCESSING")
        log_to_file(f"\n🚀 [Agent Step] กำลังเริ่มรัน: {cmd}")
        
        # Run command
        process = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(BASE_DIR))
        
        # Log stdout/stderr
        if process.stdout:
            log_to_file(process.stdout.strip())
        if process.stderr:
            log_to_file(process.stderr.strip())
            
        if process.returncode == 0:
            log_to_file(f"✅ [Agent Step] ทำงานสำเร็จ: {step_name}")
            update_step(steps, step_name, "COMPLETED")
            return True
            
        # Error Healing
        error_msg = process.stderr or process.stdout or "Unknown Error"
        log_to_file(f"⚠️ [Agent Step] ทำงานล้มเหลว (Exit Code: {process.returncode})")
        
        # Scenario 1: Python Module NotFound
        if "ModuleNotFoundError: No module named" in error_msg or "ImportError: No module named" in error_msg:
            # Parse package name
            import re
            match = re.search(r"No module named ['\"]([^'\"]+)['\"]", error_msg)
            if match:
                missing_pkg = match.group(1)
                update_step(steps, step_name, "FAILED", error=error_msg, healing=f"Installing missing library '{missing_pkg}'...")
                if try_install_package(missing_pkg):
                    retry_count += 1
                    continue
                    
        # Scenario 2: Python Code Error (Syntax, Logic)
        gemini_key = os.getenv("GEMINI_API_KEY")
        # Find if the command runs a python file locally
        python_files = [word for word in cmd.split() if word.endswith(".py")]
        
        if gemini_key and python_files and retry_count < max_retries - 1:
            target_py = BASE_DIR / python_files[0]
            if target_py.exists():
                update_step(steps, step_name, "FAILED", error=error_msg, healing=f"Using Gemini AI to self-heal and debug '{python_files[0]}'...")
                with open(target_py, "r", encoding="utf-8") as f:
                    content = f.read()
                
                fixed_code = call_gemini_to_fix_code(gemini_key, python_files[0], content, error_msg)
                if fixed_code:
                    with open(target_py, "w", encoding="utf-8") as f:
                        f.write(fixed_code)
                    log_to_file(f"✅ [Self-Healing] อัปเดตไฟล์แก้ไขโค้ด '{python_files[0]}' เรียบร้อยแล้ว! กำลังลองรันใหม่อีกครั้ง...")
                    retry_count += 1
                    continue
        
        # If no healing worked, exit loop
        update_step(steps, step_name, "FAILED", error=error_msg)
        return False
        
    update_step(steps, step_name, "FAILED", error="Max retries reached without successful healing")
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: vibe_agent_runner.py '<command1>' '<command2>' ... or a JSON file path")
        sys.exit(1)
        
    arg = sys.argv[1]
    # Check if the first argument is a JSON file containing the commands list
    if arg.endswith(".json"):
        json_path = Path(arg)
        if not json_path.exists():
            json_path = BASE_DIR / arg
            
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    commands = json.load(f)
            except Exception as e:
                log_to_file(f"❌ Failed to parse commands JSON: {e}")
                sys.exit(1)
        else:
            log_to_file(f"❌ Commands JSON file not found: {arg}")
            sys.exit(1)
    else:
        commands = sys.argv[1:]
    
    steps = []
    
    # Auto-detect GPU encoder and set it in environment for all subprocesses
    os.environ["ENCODER"] = "libx264"
    try:
        res = subprocess.run("ffmpeg -encoders 2>/dev/null | grep -q 'h264_nvenc'", shell=True)
        if res.returncode == 0:
            os.environ["ENCODER"] = "h264_nvenc"
            log_to_file("⚙️ [GPU] Detected NVIDIA GPU, using encoder: h264_nvenc")
        else:
            log_to_file("⚙️ [GPU] No NVIDIA GPU detected, using CPU encoder: libx264")
    except Exception as e:
        log_to_file(f"⚠️ [GPU] GPU detection failed: {e}")
        
    # Initialize steps
    for idx, cmd in enumerate(commands):
        # Infer step name
        step_name = f"Step {idx + 1}: "
        if "auto_edit" in cmd:
            step_name += "Auto Edit Pipeline"
        elif "ffmpeg" in cmd:
            step_name += "Video Rendering"
        elif "pip" in cmd:
            step_name += "Dependency Install"
        else:
            step_name += cmd.split()[0] if cmd.split() else f"Command #{idx+1}"
        steps.append({"name": step_name, "status": "PENDING"})
        
    save_steps(steps)
    
    log_to_file(f"🤖 [Vibe Agent Runner] เริ่มการทำงานแบบ Autonomous Loop (มีระบบ Self-Healing)")
    log_to_file(f"📂 โฟลเดอร์ทำงาน: {BASE_DIR}")
    
    success = True
    for idx, cmd in enumerate(commands):
        step_name = steps[idx]["name"]
        if not execute_command_with_healing(cmd, steps, step_name):
            success = False
            log_to_file(f"\n❌ [Vibe Agent Runner] การทำงานหยุดชะงักที่ขั้นตอน: {step_name}")
            break
            
    if success:
        log_to_file(f"\n🎉 [Vibe Agent Runner] การประมวลผลคำสั่งสำเร็จสมบูรณ์ 100%!")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
