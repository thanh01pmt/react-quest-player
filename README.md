# React Quest Player

[![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

**React Quest Player** là một dự án mã nguồn mở nhằm hiện đại hóa bộ trò chơi lập trình kinh điển [Blockly Games](https://github.com/google/blockly-games) của Google. Dự án được xây dựng lại hoàn toàn bằng React, TypeScript, và một kiến trúc hướng dữ liệu linh hoạt, tạo ra một nền tảng mạnh mẽ, dễ bảo trì và mở rộng để chơi và tạo các game lập trình 2D và 3D.

---

## ✨ Triết lý Kiến trúc

Hệ thống được thiết kế xoay quanh các nguyên tắc phần mềm hiện đại để đảm bảo tính linh hoạt và khả năng mở rộng.

### 1. Tách biệt Hoàn toàn Giữa Logic và Giao diện

Đây là nền tảng của toàn bộ dự án. Mỗi loại game được chia thành hai phần riêng biệt:

* **Game Engine (`*Engine.ts`):** Một lớp TypeScript thuần túy, không phụ thuộc vào React hay DOM. Nó chịu trách nhiệm toàn bộ về logic game, luật chơi, và trạng thái.
* **Game Renderer (`*Renderer.tsx`):** Một component React "thuần túy" chỉ nhận vào `gameState` và `gameConfig` để hiển thị giao diện. **Chúng ta có thể có nhiều renderer (2D, 3D) cho cùng một engine.**

### 2. Hai Mô hình Thực thi Linh hoạt

`QuestPlayer`, thông qua hook `useGameLoop`, hỗ trợ hai loại engine khác nhau một cách liền mạch:

#### 🅰️ **Batch Engine (Ví dụ: Maze)**

* **Hoạt động:** `Engine.execute()` chạy toàn bộ mã và trả về một **mảng log đầy đủ** các trạng thái của game. `useGameLoop` sẽ lặp qua mảng log này để tạo hoạt ảnh.

#### 🅱️ **Step-based Engine (Ví dụ: Turtle, Pond)**

* **Hoạt động:** `useGameLoop` gọi phương thức `Engine.step()` lặp đi lặp lại. Mỗi `step()` chỉ thực thi một đoạn mã nhỏ và trả về **trạng thái duy nhất** tại thời điểm đó.

### 3. Thiết kế Hướng dữ liệu (Data-Driven)

Toàn bộ một màn chơi—từ bản đồ, khối lệnh, luật chơi, NPC, âm thanh, nhạc nền, **và cả loại renderer (2D/3D)**—đều được định nghĩa trong một file **`quest.json`** duy nhất. Dữ liệu này được xác thực bằng **Zod** để đảm bảo tính toàn vẹn.

## 🚀 Công nghệ sử dụng

* **Framework:** [React](https://reactjs.org/) (v18+ với Hooks)
* **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Đồ họa 3D:** [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction), [@react-three/drei](https://github.com/pmndrs/drei)
* **Lập trình khối:** [Blockly](https://developers.google.com/blockly/) & [react-blockly](https://github.com/nbudin/react-blockly)
* **Soạn thảo mã:** [Monaco Editor](https://microsoft.github.io/monaco-editor/)
* **Sandbox thực thi mã:** [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter)
* **Validation dữ liệu:** [Zod](https://zod.dev/)
* **Đa ngôn ngữ (i18n):** [react-i18next](https://react.i18next.com/)

## 🛣️ Lộ trình Phát triển

### Đã hoàn thành ✅

* [✅] **Nền tảng Kiến trúc:** Hệ thống Engine/Renderer, hỗ trợ 2 luồng thực thi (Batch & Step-based).
* [✅] **Hệ thống Màn chơi Hướng dữ liệu:** Tải và xác thực `quest.json` bằng Zod.
* [✅] **Hỗ trợ Đa Editor:** Chuyển đổi linh hoạt giữa Blockly và Monaco Editor.
* [✅] **Hệ thống Âm thanh:** Quản lý hiệu ứng âm thanh và nhạc nền được định nghĩa trong `quest.json`.
* [✅] **Công cụ Phát triển:**
  * **Trình Gỡ lỗi Trực quan (Visual Debugger):** Chế độ chạy từng bước, làm nổi bật khối lệnh, hỗ trợ Tạm dừng/Tiếp tục/Bước tới.
  * **Bảng Cài đặt:** Cho phép người dùng tùy chỉnh Renderer, Theme, Lưới, Âm thanh, và Chế độ Sáng/Tối.
* [✅] **Hoàn thiện Game Maze (2D & 3D):**
  * Triển khai song song **Trình render 2D** (dựa trên DOM) và **Trình render 3D** (dựa trên Three.js/R3F).
  * Khả năng lựa chọn renderer thông qua `quest.json`.
* [✅] **Hoàn thiện Game Turtle:** Logic vẽ, xác thực bằng hình ảnh, và âm thanh.
* [✅] **Hoàn thiện Game Pond:** Đạt được sự tương đương về tính năng cốt lõi với bản gốc (AI, vật lý va chạm, API đầy đủ, hiệu ứng âm thanh).

### Các bước tiếp theo 🚀 (Lộ trình Ngắn hạn)

Mục tiêu là đạt được sự tương đương hoàn toàn về trải nghiệm người dùng và chuyển đổi các game còn lại.

* [⬜️] **Chỉnh sửa Mã nguồn cho Nhiều Avatar (Pond):** Triển khai UI cho phép người dùng chọn và xem/sửa mã của các NPC.
* [⬜️] **Hiển thị Mã nguồn trong Dialog Kết quả:** Thêm phần hiển thị mã JavaScript đã được làm đẹp vào hộp thoại "Congratulations".
* [⬜️] **Giao diện (Skins) cho Nhân vật:** Cho phép người dùng chọn các skin khác nhau cho nhân vật trong game Maze (cả 2D và 3D).
* [⬜️] Chuyển đổi các game còn lại từ `Blockly Games` (Bird, Movie, Music...).

### Tầm nhìn Tương lai 💡 (Lộ trình Dài hạn)

Tận dụng kiến trúc hiện đại để xây dựng các tính năng thế hệ mới.

* [💡] **Thanh "Tua" Thời gian (Replay Scrubber):** Cho phép người dùng tua lại toàn bộ trận đấu Pond để phân tích chiến thuật.
* [💡] **Trình tạo Màn chơi (Level Editor):** Xây dựng một công cụ giao diện đồ họa để người dùng có thể tự tạo ra các file `quest.json`.
* [💡] **Đóng gói thành Thư viện Nhúng:** Đóng gói `QuestPlayer` thành một component có thể `npm install` và tích hợp vào các hệ thống quản lý học tập (LMS).

## 🛠️ Cài đặt và Chạy

1. **Clone repository:**

    ```bash
    git clone [URL_CUA_REPOSITORY]
    cd react-quest-player
    ```

2. **Cài đặt các gói phụ thuộc:**

    ```bash
    npm install
    ```

3. **Chạy môi trường phát triển:**

    ```bash
    npm run dev
    ```

    Ứng dụng sẽ có sẵn tại `http://localhost:5173`.

## 📁 Cấu trúc Thư mục

```txt
/public
  ├── assets/     # Tài sản tĩnh (hình ảnh, âm thanh) cho các game.
  └── quests/     # Các file JSON định nghĩa màn chơi (maze-1.json, maze-3d-1.json...).
/src
  ├── components/ # Các component React chung (QuestPlayer, Dialog, SettingsPanel...).
  ├── games/      # Module cho từng game cụ thể.
  │   └── maze/
  │       ├── MazeEngine.ts       # Logic cốt lõi của game Maze (dùng cho cả 2D và 3D).
  │       ├── Maze2DRenderer.tsx  # Component React để vẽ giao diện 2D.
  │       ├── Maze3DRenderer.tsx  # Component React để vẽ giao diện 3D.
  │       └── index.ts            # Export Engine và các Renderer.
  ├── hooks/      # Các custom hook có thể tái sử dụng (useGameLoop, useSoundManager).
  ├── types/      # Các interface và schema chung (Quest, IGameEngine, Zod schemas...).
  └── App.tsx     # Component gốc của ứng dụng.
```

## 🤝 Đóng góp

Dự án đang trong giai đoạn phát triển tích cực. Mọi đóng góp, báo lỗi, hoặc đề xuất tính năng đều được chào đón.
