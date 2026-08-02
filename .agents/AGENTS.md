# Project Rules & Workspace Conventions

## 1. VPS Deployment Commands
- **Docker Compose Version**: VPS Server (`srv1869557`) uses Docker Compose v1.
- **Mandatory Command Rule**: ALWAYS use **`docker-compose` (มีขีดกลาง)** แทน `docker compose` (มีเว้นวรรค) เมื่อแนะนำคำสั่งรันบน VPS Terminal
  - ตัวอย่างคำสั่ง:
    - `docker-compose down`
    - `docker-compose up -d --build`
    - `docker-compose ps`
    - `docker-compose logs -f --tail=50 web-ui`

## 2. Admin Privacy & Data Governance Ethics (จรรยาบรรณ Workspace)
- **Admin Privacy Limit**: ผู้ดูแลระบบ (Admin) มีสิทธิ์บริหารจัดการสมาชิก, กำหนดโควต้า, เติมเงิน และตั้งค่าระบบหลัก **แต่ไม่มีสิทธิ์ดูประวัติแชท, ไฟล์ หรือโปรเจกต์งานส่วนตัวของสมาชิกท่านอื่น**
- **Strict Data Isolation**: บังคับใช้ `userId` Verification ในทุก API Handler (`/api/projects`, `/api/chat`)

## 3. UI/UX & Responsive Layout Rules
- **Non-Overlapping UI Architecture**: ป้องกันปุ่มและไอคอนทับซ้อนกันบนหน้าจอ
- **Mobile Touch Navigation**: ใช้ `MobileBottomBar` สำหรับมือถือ และแยกการจัดวางปุ่มบน PC ให้มี Spacing สมดุล
