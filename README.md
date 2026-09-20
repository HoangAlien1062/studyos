# 🎓 StudyOS — Nền Tảng Quản Lý & Hỗ Trợ Học Tập Cá Nhân Hóa Toàn Diện

> **StudyOS** là một hệ điều hành học tập cá nhân (Personal Learning Operating System) hiện đại, toàn diện và bảo mật, kết hợp phương pháp học tập khoa học (**Spaced Repetition SM-2**, Ngân hàng câu hỏi phân cấp, Sổ lỗi sai tự động, Luyện thi chuẩn mực) cùng **Trợ lý AI Đa Nhà Cung Cấp** (Multi-Provider AI), **RAG trên tài liệu học tập** và công cụ khai thác dữ liệu trực tiếp (**AI Tools**).

---

## 🌟 ĐIỂM NỔI BẬT

1. **Phân Loại Đối Tượng: Học Sinh Cấp 3 vs Sinh Viên Đại Học**
   - Chuyển đổi linh hoạt giữa 🎒 **Học sinh THPT** và 🎓 **Sinh viên Đại học / Cao đẳng**.
   - Giao diện, thuật ngữ và biểu mẫu tự động thích ứng chuẩn mực:
     - *Học sinh Cấp 3*: Trường THPT, Lớp (10, 11, 12), Khối/Ban thi (A00, B00, D01...), Mã học sinh, Giáo viên bộ môn, Số tiết/tuần.
     - *Sinh viên*: Trường Đại học, Khóa/Năm học (Năm 1, 2, 3, 4), Chuyên ngành, MSSV, Giảng viên, Số tín chỉ.

2. **Khởi Tạo Trang Trắng (Wipe Clean Data) & Quản Lý Dữ Liệu Thật**
   - Tính năng **Xóa sạch toàn bộ dữ liệu** (Factory Reset) trong Cài đặt: chuyển hệ thống về trang trắng 100% (0 môn học, 0 thẻ, 0 câu hỏi, 0 đề thi, 0 lỗi sai) để người dùng thực tế nhập dữ liệu của riêng mình.
   - Hỗ trợ **Khôi phục dữ liệu mẫu** (Demo Reset), **Sao lưu JSON (Export Backup)** và **Khôi phục từ tệp JSON (Import Backup)** ngoại tuyến an toàn.

3. **Core Learning Engine Hoàn Toàn Hoạt Động (Không Mock/Fake)**
   - **Spaced Repetition SM-2**: Thuật toán lặp lại ngắt quãng tính toán lịch ôn thẻ flashcard tối ưu (`Again`, `Hard`, `Good`, `Easy`) cùng hệ số ghi nhớ `Ease Factor`.
   - **Flashcards 3D Flip & Carousel**: Lật thẻ 3 chiều mượt mà, hỗ trợ vuốt chạm cảm ứng tối ưu trên thiết bị di động.
   - **Ngân Hàng Câu Hỏi Phân Cấp**: Cấu trúc Môn học $\rightarrow$ Chương $\rightarrow$ Chủ đề, phân loại độ khó (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), hỗ trợ công thức toán học $\LaTeX$ KaTeX và code block.
   - **Sổ Lỗi Sai Tự Động (Mistake Logbook)**: Tự động gom lỗi sai từ bài thi, phân tích nguyên nhân sai và hỗ trợ chế độ làm lại chuyên sâu.
   - **Phòng Thi & Chấm Điểm Thang 10**: Đồng hồ đếm ngược, chấm điểm chuẩn hóa thang 10 Việt Nam, phân tích điểm mạnh/điểm yếu theo từng chủ đề.
   - **Thống Kê Trực Quan**: Biểu đồ phân bố độ khó, độ chính xác môn học, chuỗi ngày học tập (Streak) và cảnh báo các chủ đề cần củng cố.

4. **Hệ Thống AI Đa Nhà Cung Cấp & RAG Thông Minh (Multi-Provider AI)**
   - **Hỗ trợ đa nhà cung cấp**: Google Gemini (`gemini-3.6-flash`), OpenAI (`gpt-4o`, `gpt-4o-mini`), Anthropic Claude (`claude-3-5-sonnet`), DeepSeek (`deepseek-chat`, `deepseek-reasoner`), OpenRouter và Local AI tùy chỉnh (Ollama / vLLM / LocalAI).
   - **Tự động Fallback (Auto-Failover)**: Tự động chuyển đổi sang mô hình dự phòng khi gặp lỗi Rate Limit (429), Hết quota (403), hoặc Timeout mà không làm ngắt quãng trải nghiệm.
   - **RAG trên tài liệu học tập**: Lập chỉ mục ngữ nghĩa, tìm kiếm tương đồng Vector Cosine và trích dẫn số trang, tên tài liệu chính xác (`Citations`).
   - **AI Data Tools**: AI có thể tự động truy vấn dữ liệu học tập thực tế của bạn (ghi chú, flashcard, câu hỏi, điểm thi, thống kê).
   - **AI Draft Preview Modal**: Cho phép AI tạo nháp Flashcard, Câu hỏi trắc nghiệm hoặc Ghi chú Markdown, hiển thị hộp thoại duyệt trước khi thêm vào hệ sinh thái học tập.

5. **Tìm Kiếm Toàn Cục Phím Tắt (Command Palette `Ctrl + K`)**
   - Tìm kiếm tức thời trên 10 danh mục: Môn học, Chương, Chủ đề, Tài liệu, Ghi chú, Flashcard, Câu hỏi, Sổ lỗi sai, Đề thi, và Lịch sử hội thoại AI.

6. **Bảo Mật & Kiến Trúc Sản Xuất**
   - Mã hóa khóa bí mật AES-256-GCM.
   - Ngăn chặn tấn công SSRF trên Custom Provider Base URL.
   - Khung bảo vệ chống Prompt Injection trong ngữ cảnh RAG.
   - Kiểm tra định dạng tệp và giới hạn dung lượng tải lên an toàn.
   - Cơ chế hoạt động kép: **Ngoại tuyến 100% (Offline LocalStorage/IndexedDB)** hoặc **Đồng bộ Đám mây Trực tuyến (Supabase PostgreSQL + RLS)**.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

- **Frontend**: React 18, TypeScript 5.7, Vite 6, TailwindCSS 3.4, Lucide Icons, KaTeX (Toán học $\LaTeX$), Canvas Confetti.
- **Backend**: Node.js HTTP Streaming SSE Server, TypeScript tsx execution.
- **Database & Cloud Sync**: Supabase PostgreSQL 15, Row Level Security (RLS), Supabase Storage Bucket.
- **Containerization**: Docker Multi-Stage Build, Docker Compose.
- **Testing**: Automated Testing Framework (57/57 tests passing).

---

## 🚀 HƯỚNG DẪN KHỞI ĐỘNG NHANH

### Yêu Cầu Hệ Thống
- **Node.js**: Phiên bản 18.0 trở lên (khuyên dùng Node.js 20 hoặc 22+).
- **Trình quản lý gói**: npm / yarn / pnpm.

### 1. Cài Đặt Thư Viện
```bash
git clone <repository-url>
cd "StudyOS GG"
npm install
```

### 2. Cấu Hình Biến Môi Trường (Tùy chọn)
Sao chép tệp mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
*(Nếu không điền khóa AI hoặc Supabase, StudyOS vẫn chạy bình thường với chế độ lưu trữ trình duyệt offline và cho phép bạn nhập API Key trực tiếp trong giao diện Web).*

### 3. Chạy Ở Môi Trường Phát Triển (Full-Stack Dev)
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:5173`

---

## 🧪 CHẠY KIỂM THỬ TỰ ĐỘNG (TESTING)

Dự án tích hợp bộ kiểm thử tự động toàn diện với **57 bài test chuẩn**:
1. `src/tests/learningEngine.test.ts`: Thuật toán SM-2, Đánh giá câu hỏi, Sinh đề thi, Chấm điểm thang 10, Deduplicate lỗi sai.
2. `src/tests/aiEngine.test.ts`: Mã hóa AES-256, Phòng thủ SSRF, Phân mảnh tài liệu, Vector Store, Fallback AI Router, AI Tools.
3. `src/tests/systemIntegration.test.ts`: Persona Switcher, Cây phân cấp môn học, Toàn bộ luồng E2E, Tìm kiếm toàn cục, Xóa sạch dữ liệu.

Chạy toàn bộ test suite bằng lệnh:
```bash
npm test
```

---

## 📦 BUILD SẢN XUẤT & DEPLOY

### 1. Build Chuẩn Sản Xuất (Standard Production Build)
```bash
npm run build
npm run preview
```
Thư mục xuất bản `/dist` có thể triển khai lên Vercel, Netlify, Cloudflare Pages hoặc máy chủ Nginx.

### 2. Build 1 File HTML Độc Lập Duy Nhất (Single-File Build)
StudyOS hỗ trợ đóng gói toàn bộ CSS, JavaScript, Fonts và SVGs thành một tệp HTML duy nhất để chạy ngoại tuyến không cần web server:
```bash
npm run build:single
```
Tệp kết quả nằm tại `dist-single/index.html`. Bạn có thể mở trực tiếp bằng trình duyệt trên máy tính hoặc điện thoại!

### 3. Chạy Bằng Docker & Docker Compose
Triển khai tức thời môi trường sản xuất với Docker:
```bash
docker-compose up -d --build
```
- Web Application: `http://localhost:5173`
- Backend Standalone Server: `http://localhost:5001`
- Endpoint Kiểm Tra Sức Khỏe: `http://localhost:5001/api/health`

---

## 🩺 HEALTH CHECK API ENDPOINT

StudyOS cung cấp endpoint kiểm tra trạng thái dịch vụ không tiêu tốn quota AI:
- **URL**: `GET /api/health` hoặc `GET /health`
- **Ví dụ phản hồi JSON**:
```json
{
  "status": "healthy",
  "uptime": 128.45,
  "memory": {
    "heapUsed": "48MB",
    "heapTotal": "104MB",
    "rss": "126MB"
  },
  "timestamp": "2026-09-20T15:00:00.000Z",
  "services": {
    "server": "online",
    "aiRouter": {
      "activeProvider": "google",
      "availableProviders": ["google", "openai", "anthropic", "deepseek", "openrouter"],
      "totalConfigured": 2
    },
    "vectorStore": {
      "status": "ready",
      "totalChunks": 42
    },
    "database": "configured"
  }
}
```

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```text
StudyOS GG/
├── dist/                      # Thư mục build chuẩn
├── dist-single/               # Thư mục build 1 file HTML duy nhất
├── server/                    # Backend Node.js độc lập & Middleware
│   ├── ai/
│   │   ├── providers/         # Bộ chuyển đổi API (Google, OpenAI, Claude, DeepSeek...)
│   │   ├── rag/               # Vector Store, Document Parser, Semantic Chunker
│   │   ├── tools/             # AI Data Tools (Đọc dữ liệu học tập người dùng)
│   │   ├── contextManager.ts  # Ghép nối ngữ cảnh & Quản lý Token budget
│   │   ├── router.ts          # AI Router & Fallback tự động
│   │   ├── security.ts        # Mã hóa AES-256, SSRF Validator, Anti-Injection
│   │   └── index.ts           # Bộ định tuyến API (/api/ai/*, /api/health)
│   └── standalone.ts          # Server HTTP độc lập chạy trên cổng 5001
├── src/
│   ├── components/            # UI Components tái sử dụng (Button, Card, Modal, Tabs...)
│   ├── context/               # React Contexts (Study, Theme, Toast)
│   ├── data/                  # Bộ dữ liệu mẫu ban đầu tiếng Việt
│   ├── lib/                   # Supabase client an toàn
│   ├── pages/                 # Màn hình tính năng (Dashboard, Subjects, Questions, AI...)
│   ├── services/              # Business Logic & Thuật toán học tập
│   │   ├── algorithms/        # SM-2, Question Evaluator, Exam Generator, Grader
│   │   ├── authService.ts     # Quản lý tài khoản & Persona người dùng
│   │   ├── settingsService.ts # Lưu cấu hình & Wipe clean data
│   │   └── storage.ts         # Universal Storage (LocalStorage + In-memory fallback)
│   ├── tests/                 # 3 bộ kiểm thử tự động (57 bài test)
│   └── types/                 # Định nghĩa TypeScript chặt chẽ
├── Dockerfile                 # Multi-stage production Dockerfile
├── docker-compose.yml         # File điều phối Docker Compose
├── supabase_schema.sql        # Toàn bộ DDL PostgreSQL & Chính sách bảo mật RLS
└── package.json
```

---

## 📄 GIẤY PHÉP (LICENSE)
Dự án được phân phối dưới giấy phép **MIT License**. Mọi quyền được bảo lưu.
