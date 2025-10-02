# React Quest Player

[![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

**React Quest Player** là một dự án hiện đại hóa mã nguồn mở [Blockly Games](https://github.com/google/blockly-games) của Google. Dự án này được xây dựng lại từ đầu bằng React, TypeScript, và một kiến trúc hướng dữ liệu linh hoạt, nhằm tạo ra một nền tảng mạnh mẽ, dễ bảo trì và mở rộng để chơi và tạo các game lập trình khối.

---

## 🎯 Mục tiêu Dự án

Mục tiêu chính là chuyển đổi bộ game Blockly gốc từ một ứng dụng Vanilla JavaScript nguyên khối sang một **"Trình chạy Màn chơi" (Quest Player)** hiện đại:

1. **Hiện đại hóa (Modernization):** Sử dụng React (với Hooks) và TypeScript để cải thiện trải nghiệm của nhà phát triển và tuân thủ các chuẩn mực phát triển web hiện đại.
2. **Module hóa (Modularization):** Tách biệt rõ ràng giữa **Logic Game (Engine)** và **Phần Hiển thị (Renderer)**, cho phép nâng cấp hoặc thay thế giao diện một cách độc lập.
3. **Hướng dữ liệu (Data-Driven):** Toàn bộ một màn chơi (bản đồ, khối lệnh, luật chơi) được định nghĩa trong một file JSON duy nhất, giúp việc tạo nội dung mới trở nên cực kỳ đơn giản.
4. **Linh hoạt (Flexibility):** Có thể được chạy như một ứng dụng web độc lập hoặc đóng gói thành một thư viện để nhúng vào các hệ thống khác (ví dụ: LMS).

## ✨ Kiến trúc Cốt lõi

Hệ thống được thiết kế xoay quanh hai khái niệm chính:

* **Quest Player:** Là component React trung tâm, có khả năng đọc và "chơi" bất kỳ file `quest.json` nào. Nó điều phối việc tải tài nguyên, thực thi mã và cập nhật giao diện.
* **Engine & Renderer:** Mỗi loại game (Maze, Turtle, ...) được đóng gói thành một module riêng biệt, bao gồm:
  * **Game Engine:** Một lớp JavaScript/TypeScript thuần túy, không phụ thuộc vào giao diện, chịu trách nhiệm xử lý toàn bộ logic, luật chơi và thực thi mã trong môi trường sandbox.
  * **Game Renderer:** Một component React "thuần túy" chỉ chịu trách nhiệm vẽ lại giao diện dựa trên trạng thái được cung cấp bởi Engine.

## 🚀 Công nghệ sử dụng

* **Framework:** [React](https://reactjs.org/) (v18+ với Hooks)
* **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/)
* **Lập trình khối:** [Blockly](https://developers.google.com/blockly/) & [react-blockly](https://github.com/nbudin/react-blockly)
* **Validation dữ liệu:** [Zod](https://zod.dev/)
* **Đa ngôn ngữ (i18n):** [react-i18next](https://react.i18next.com/)
* **Build Tool:** [Vite](https://vitejs.dev/)

## 🛠️ Cài đặt và Chạy

Dự án sử dụng `npm` để quản lý các gói phụ thuộc.

1. **Clone a repository:**

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

## 🎮 Cách sử dụng

Khi ứng dụng khởi động, bạn sẽ thấy giao diện cho phép import một màn chơi.

1. Nhấn nút **"Choose File"**.
2. Chọn một file `quest.json` hợp lệ. Một file mẫu có sẵn trong thư mục `public/quests/maze-1.json`.
3. Nếu file hợp lệ, màn chơi sẽ được tải và hiển thị.
4. Kéo thả các khối lệnh và nhấn **"Run"** để bắt đầu.

## 📁 Cấu trúc Thư mục

```txt
/public
  ├── assets/     # Tài sản tĩnh (hình ảnh, âm thanh) cho các game
  └── quests/     # Các file JSON định nghĩa màn chơi
/src
  ├── components/ # Các component React chung (QuestPlayer, Dialog, ...)
  ├── games/      # Các module game cụ thể (maze, turtle, ...)
  │   └── maze/
  │       ├── MazeEngine.ts
  │       ├── Maze2DRenderer.tsx
  │       ├── blocks.ts
  │       └── types.ts
  ├── hooks/      # Các custom hook có thể tái sử dụng
  ├── i18n/       # Các file JSON ngôn ngữ chung
  ├── types/      # Các interface và schema (TypeScript, Zod) chung
  ├── App.tsx     # Component gốc của ứng dụng
  └── main.tsx    # Điểm vào của ứng dụng
```

## 🛣️ Lộ trình Tương lai (Roadmap)

* [✅] Giai đoạn 1: Thiết lập nền tảng React & TypeScript.
* [✅] Giai đoạn 2: Chuyển đổi hoàn chỉnh game **Maze**.
* [✅] Giai đoạn 4 (một phần): Tích hợp hệ thống i18n động.
* [⬜️] Giai đoạn 3: Chuyển đổi các game còn lại (Turtle, Bird, Music, ...).
* [⬜️] Giai đoạn 4: Hoàn thiện layout linh hoạt và các tính năng chung.
* [⬜️] Giai đoạn 5: Đóng gói thành thư viện có thể nhúng.
* [⬜️] Tương lai: Xây dựng công cụ "Level Editor" để tạo file JSON một cách trực quan.

---
