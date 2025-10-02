# React Quest Player

[![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

**React Quest Player** là một dự án mã nguồn mở nhằm hiện đại hóa bộ trò chơi lập trình khối kinh điển [Blockly Games](https://github.com/google/blockly-games) của Google. Dự án được xây dựng lại hoàn toàn bằng React, TypeScript, và một kiến trúc hướng dữ liệu linh hoạt, tạo ra một nền tảng mạnh mẽ, dễ bảo trì và mở rộng để chơi và tạo các game lập trình.

---

## 🎯 Mục tiêu Dự án

Mục tiêu chính là chuyển đổi bộ game Blockly gốc từ một ứng dụng JavaScript nguyên khối sang một **"Trình chạy Màn chơi" (Quest Player)** hiện đại và linh hoạt:

1. **Hiện đại hóa (Modernization):** Sử dụng các công nghệ web hiện đại như React (với Hooks) và TypeScript để cải thiện trải nghiệm phát triển và độ tin cậy của mã nguồn.
2. **Module hóa (Modularization):** Tách biệt hoàn toàn giữa **Lõi Game (Engine)** và **Phần Hiển thị (Renderer)**, cho phép nâng cấp hoặc thay thế giao diện mà không ảnh hưởng đến logic của trò chơi.
3. **Hướng dữ liệu (Data-Driven):** Toàn bộ một màn chơi—từ bản đồ, khối lệnh, luật chơi, cho đến lời giải—đều được định nghĩa trong một file JSON duy nhất, giúp việc tạo nội dung mới trở nên cực kỳ đơn giản.
4. **Linh hoạt (Flexibility):** Kiến trúc có khả năng hỗ trợ nhiều loại game với các mô hình thực thi khác nhau và có thể được đóng gói để nhúng vào các hệ thống khác (ví dụ: LMS).

## ✨ Kiến trúc Cốt lõi

Hệ thống được thiết kế xoay quanh hai khái niệm chính: `QuestPlayer` và cặp `Engine/Renderer`. Điểm đặc biệt của kiến trúc này là khả năng hỗ trợ hai luồng thực thi game khác nhau một cách liền mạch.

### 1. Quest Player

Là component React trung tâm, có khả năng đọc và "chơi" bất kỳ file `quest.json` nào. Nó điều phối việc tải tài nguyên, khởi tạo engine, quản lý vòng lặp game, và cập nhật giao diện.

### 2. Engine & Renderer

Mỗi loại game (Maze, Turtle, Pond) là một module độc lập, bao gồm:

* **Game Engine:** Một lớp TypeScript thuần túy, không phụ thuộc giao diện, chịu trách nhiệm xử lý toàn bộ logic, luật chơi và thực thi mã trong môi trường sandbox (`js-interpreter`).
* **Game Renderer:** Một component React "thuần túy" chỉ chịu trách nhiệm vẽ lại giao diện dựa trên `gameState` được cung cấp.

### Luồng thực thi (Execution Models)

`QuestPlayer` hỗ trợ hai loại engine:

#### 🅰️ **Batch Engine (Ví dụ: Maze)**

* **Hoạt động:** Khi người dùng nhấn "Run", `Engine.execute()` sẽ chạy toàn bộ mã và trả về một **mảng log đầy đủ** các trạng thái của game từ đầu đến cuối.
* **Animation:** `QuestPlayer` lặp qua mảng log này và cập nhật `gameState` cho `Renderer` sau mỗi khoảng thời gian nhất định, tạo ra hoạt ảnh.
* **Phù hợp với:** Các game có số bước hữu hạn, xác định và không có tương tác thời gian thực.

#### 🅱️ **Step-based Engine (Ví dụ: Turtle, Pond)**

* **Hoạt động:** `Engine.execute()` chỉ khởi tạo môi trường. `QuestPlayer` sẽ gọi phương thức `Engine.step()` lặp đi lặp lại trong một vòng lặp (`requestAnimationFrame`).
* **Animation:** Mỗi lần `step()` được gọi, Engine chỉ thực thi một đoạn mã nhỏ, cập nhật trạng thái nội bộ, và trả về một **trạng thái duy nhất** tại thời điểm đó.
* **Phù hợp với:** Các game có yếu tố thời gian thực, mô phỏng liên tục, hoặc các game vẽ phức tạp cần được render từng bước.

## 🎮 Các Game đã Triển khai

* [✅] **Maze:** Một game giải đố cơ bản sử dụng **Batch Engine**.
* [✅] **Turtle:** Game vẽ hình học sử dụng **Step-based Engine**, với logic xác thực lời giải bằng cách so sánh hình ảnh trên canvas.
* [✅] **Pond:** Phiên bản đầu tiên của một game mô phỏng thời gian thực với nhiều tác nhân (multi-agent), sử dụng **Step-based Engine** để quản lý nhiều đối thủ cùng lúc.

## 🚀 Công nghệ sử dụng

* **Framework:** [React](https://reactjs.org/) (v18+ với Hooks)
* **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/)
* **Lập trình khối:** [Blockly](https://developers.google.com/blockly/) & [react-blockly](https://github.com/nbudin/react-blockly)
* **Validation dữ liệu:** [Zod](https://zod.dev/)
* **Đa ngôn ngữ (i18n):** [react-i18next](https://react.i18next.com/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Fields tùy chỉnh:** [@blockly/field-angle](https://www.npmjs.com/package/@blockly/field-angle)

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
  ├── hooks/      # Các custom hook có thể tái sử dụng (vd: usePrefersColorScheme).
  ├── i18n/       # Các file JSON ngôn ngữ chung của ứng dụng.
  ├── types/      # Các interface và schema chung (Quest, IGameEngine, Zod schemas...).
  ├── App.tsx     # Component gốc của ứng dụng.
  └── main.tsx    # Điểm vào của ứng dụng, nơi khởi tạo React và i18n.
```

## 🛣️ Lộ trình Phát triển

### Đã hoàn thành [✅]

* [✅] Nền tảng React & TypeScript với Vite.
* [✅] Kiến trúc linh hoạt hỗ trợ 2 luồng thực thi (batch & step-based).
* [✅] Hệ thống i18n động, hỗ trợ cả ngôn ngữ trong file quest.
* [✅] Hỗ trợ Giao diện Tối (Dark Mode) tự động cho Blockly.
* [✅] Hoàn thiện game **Maze** (Batch Engine).
* [✅] Hoàn thiện game **Turtle** (Step-based Engine với xác thực bằng hình ảnh).
* [✅] Triển khai phiên bản đầu của game **Pond** (Mô phỏng đa tác nhân, hỗ trợ NPC).

### Các bước tiếp theo [⬜️]

* [⬜️] Hoàn thiện tất cả các API & cơ chế vật lý cho game **Pond** (va chạm giữa các avatar, các loại NPC phức tạp hơn).
* [⬜️] Tích hợp **ACE Editor** như một lựa chọn thay thế cho Blockly trong các màn chơi Pond Tutor.
* [⬜️] Chuyển đổi các game còn lại từ Blockly Games (Bird, Movie, Music...).
* [⬜️] Đóng gói dự án thành một thư viện có thể nhúng vào các ứng dụng khác.

### Tầm nhìn tương lai [💡]

* [💡] Xây dựng một **"Trình chỉnh sửa Màn chơi" (Level Editor)** giao diện đồ họa để tạo các file `quest.json` một cách trực quan.

---

## 🤝 Đóng góp

Dự án đang trong giai đoạn phát triển tích cực. Mọi đóng góp, báo lỗi, hoặc đề xuất tính năng đều được chào đón.
