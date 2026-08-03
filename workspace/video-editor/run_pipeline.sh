#!/bin/bash
# Script รันกระบวนการตัดต่อ Easy AI Editor 100%

set -e

echo "🚀 กำลังเริ่มต้นกระบวนการ Easy AI Editor Pipeline..."

# 1. สร้างโฟลเดอร์หลัก
mkdir -p input transcript temp output reports

# 2. รันสคริปต์ประมวลผลหลัก
python3 auto_edit.py

echo "✅ ทำงานเสร็จสมบูรณ์! คุณสามารถเปิดพรีวิววิดีโอในหน้าเว็บ Web UI ได้ทันที"
