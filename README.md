# React Quest Player

[![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

**React Quest Player** là một dự án mã nguồn mở nhằm hiện đại hóa bộ trò chơi lập trình khối kinh điển [Blockly Games](https://github.com/google/blockly-games) của Google. Dự án được xây dựng lại hoàn toàn bằng React, TypeScript, và một kiến trúc hướng dữ liệu linh hoạt, tạo ra một nền tảng mạnh mẽ, dễ bảo trì và mở rộng để chơi và tạo các game lập trình.

---

## ✨ Triết lý Kiến trúc

Hệ thống được thiết kế xoay quanh các nguyên tắc phần mềm hiện đại để đảm bảo tính linh hoạt và khả năng mở rộng.

### 1. Tách biệt Hoàn toàn Giữa Logic và Giao diện

Đây là nền tảng của toàn bộ dự án. Mỗi loại game (Maze, Turtle, Pond) được chia thành hai phần riêng biệt:

* **Game Engine (`*Engine.ts`):** Một lớp TypeScript thuần túy, không phụ thuộc vào React hay DOM. Nó chịu trách nhiệm toàn bộ về logic game, luật chơi, trạng thái, và thực thi mã người dùng trong một môi trường sandbox (`js-interpreter`).
* **Game Renderer (`*Renderer.tsx`):** Một component React "thuần túy" chỉ nhận vào `gameState` và `gameConfig` để hiển thị giao diện. Nó không chứa bất kỳ logic game nào.

### 2. Hai Mô hình Thực thi Linh hoạt

`QuestPlayer`, thông qua hook `useGameLoop`, hỗ trợ hai loại engine khác nhau một cách liền mạch để phù hợp với các nhu cầu gameplay đa dạng:

#### 🅰️ **Batch Engine (Ví dụ: Maze)**

* **Hoạt động:** Khi người dùng nhấn "Run", `Engine.execute()` sẽ chạy toàn bộ mã và trả về một **mảng log đầy đủ** các trạng thái của game từ đầu đến cuối. `useGameLoop` sẽ lặp qua mảng log này để tạo hoạt ảnh.
* **Phù hợp với:** Các game giải đố có số bước hữu hạn, xác định.

#### 🅱️ **Step-based Engine (Ví dụ: Turtle, Pond)**

* **Hoạt động:** `useGameLoop` gọi phương thức `Engine.step()` lặp đi lặp lại trong một vòng lặp `requestAnimationFrame`. Mỗi lần `step()`, Engine chỉ thực thi một đoạn mã nhỏ và trả về **trạng thái duy nhất** tại thời điểm đó.
* **Phù hợp với:** Các game có yếu tố thời gian thực, mô phỏng liên tục, hoặc các game vẽ phức tạp.

### 3. Thiết kế Hướng dữ liệu (Data-Driven)

Toàn bộ một màn chơi—từ bản đồ, khối lệnh, luật chơi, NPC, âm thanh, cho đến lời giải—đều được định nghĩa trong một file **`quest.json`** duy nhất. Dữ liệu này được xác thực bằng **Zod** để đảm bảo tính toàn vẹn, giúp việc tạo nội dung mới trở nên cực kỳ đơn giản và an toàn.

## 🚀 Công nghệ sử dụng

* **Framework:** [React](https://reactjs.org/) (v18+ với Hooks)
* **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Lập trình khối:** [Blockly](https://developers.google.com/blockly/) & [react-blockly](https://github.com/nbudin/react-blockly)
* **Soạn thảo mã:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (Engine của VS Code)
* **Sandbox thực thi mã:** [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter)
* **Validation dữ liệu:** [Zod](https://zod.dev/)
* **Đa ngôn ngữ (i18n):** [react-i18next](https://react.i18next.com/)

## 🛣️ Lộ trình Phát triển

Dự án đang trong giai đoạn phát triển tích cực để đạt được sự tương đương về tính năng với `Blockly Games` gốc và vượt qua nó.

### Đã hoàn thành ✅

* [✅] **Nền tảng Kiến trúc:** Hệ thống Engine/Renderer, hỗ trợ 2 luồng thực thi (Batch & Step-based).
* [✅] **Hệ thống Màn chơi Hướng dữ liệu:** Tải và xác thực các file `quest.json` bằng Zod.
* [✅] **Hỗ trợ Đa Editor:** Chuyển đổi linh hoạt giữa Blockly và Monaco Editor.
* [✅] **Hệ thống Đa ngôn ngữ (i18n):** Hỗ trợ dịch giao diện và nội dung màn chơi.
* [✅] **Hệ thống Âm thanh:** `useSoundManager` quản lý hiệu ứng âm thanh và nhạc nền được định nghĩa trong `quest.json`.
* [✅] **Hoàn thiện Game Maze (Batch):** Bao gồm logic game, giao diện, và âm thanh.
* [✅] **Hoàn thiện Game Turtle (Step-based):** Bao gồm logic vẽ, xác thực bằng hình ảnh, và âm thanh.
* [✅] **Hoàn thiện Game Pond (Step-based):** Đạt được sự tương đương về tính năng cốt lõi với bản gốc, bao gồm:
  * Mô phỏng đa tác nhân với AI cho NPC.
  * Vật lý va chạm (giữa các avatar, với tường).
  * API lập trình đầy đủ (`scan`, `cannon`, `swim`...).
  * Cơ chế nạp đạn (reload time) để cân bằng gameplay.
  * Hiệu ứng âm thanh theo sự kiện (bắn, nổ, va chạm).

### Các bước tiếp theo 🚀 (Lộ trình Ngắn hạn)

Mục tiêu là đạt được sự tương đương hoàn toàn về trải nghiệm người dùng với `Blockly Games` gốc.

* [⬜️] **Chỉnh sửa Mã nguồn cho Nhiều Avatar (Pond):** Triển khai UI cho phép người dùng chọn và xem/sửa mã của các NPC.
* [⬜️] **Hiển thị Mã nguồn trong Dialog Kết quả:** Thêm phần hiển thị mã JavaScript đã được làm đẹp vào hộp thoại "Congratulations".
* [⬜️] **Hệ thống Gợi ý theo Ngữ cảnh:** Xây dựng lại các hộp thoại gợi ý xuất hiện trong quá trình chơi.
* [⬜️] **Giao diện (Skins) cho Nhân vật:** Cho phép người dùng chọn các skin khác nhau cho nhân vật trong game Maze.
* [⬜️] Chuyển đổi các game còn lại từ `Blockly Games` (Bird, Movie, Music...).

### Tầm nhìn Tương lai 💡 (Lộ trình Dài hạn)

Tận dụng kiến trúc hiện đại để xây dựng các tính năng thế hệ mới.

* [💡] **Trình Gỡ lỗi Trực quan (Visual Debugger):** Thêm các nút "Pause", "Step Forward" và khả năng xem trạng thái biến của các avatar khi game tạm dừng.
* [💡] **Thanh "Tua" Thời gian (Replay Scrubber):** Cho phép người dùng tua lại toàn bộ trận đấu Pond để phân tích chiến thuật.
* [💡] **Trình tạo Màn chơi (Level Editor):** Xây dựng một công cụ giao diện đồ họa để người dùng (giáo viên, học sinh) có thể tự tạo ra các file `quest.json`.
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
  └── quests/     # Các file JSON định nghĩa màn chơi (maze-1.json, turtle-1.json...).
/src
  ├── components/ # Các component React chung (QuestPlayer, Dialog, Visualization...).
  ├── games/      # Module cho từng game cụ thể.
  │   └── pond/
  │       ├── PondEngine.ts       # Logic cốt lõi, luật chơi, API của game Pond.
  │       ├── PondRenderer.tsx    # Component React để vẽ giao diện game Pond.
  │       ├── blocks.ts           # Định nghĩa các khối lệnh tùy chỉnh.
  │       └── types.ts            # Các interface TypeScript dành riêng cho game Pond.
  ├── hooks/      # Các custom hook có thể tái sử dụng (useGameLoop, useSoundManager).
  ├── types/      # Các interface và schema chung (Quest, IGameEngine, Zod schemas...).
  └── App.tsx     # Component gốc của ứng dụng.
```

## 🤝 Đóng góp

Dự án đang trong giai đoạn phát triển tích cực. Mọi đóng góp, báo lỗi, hoặc đề xuất tính năng đều được chào đón.
