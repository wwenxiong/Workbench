# 项目字体与排版设计规范 (MiSans Typography Design System)

> **[重要规范]** 本文档为个人效率工作台的官方排版标准。后续所有界面新增、组件重构与样式开发，**必须严格遵循本文档的字体栈与字阶体系**。

---

## 1. 字体栈规范 (Font Family Stack)

### 1.1 正文与界面文本 (UI & Body)
全面采用小米 MiSans 字体族，保证在所有平台呈现统一、清晰、现代的视觉感受。系统通过 CDN 在线引入 MiSans WebFont（Regular 400 / Medium 500 / Semibold 600 / Bold 700），确保即使用户本地未安装也能正确渲染：

```css
font-family: "MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

* **首选字体**：`MiSans`（通过 CDN WebFont 加载 Regular/Medium/Semibold/Bold 四个字重）
* **苹果设备回退**：`-apple-system` / `BlinkMacSystemFont` / `PingFang SC`
* **Windows 回退**：`Segoe UI` / `Microsoft YaHei`
* **通用保底**：`Roboto` / `Hiragino Sans GB` / `sans-serif`

### 1.2 数字、时钟与等宽文本 (Mono & Numbers)
涉及时间戳、时段（如 `09:00-11:00`）、工时打卡（如 `120m`）、代码块及统计数值时，统一使用等宽字体，并开启等宽数字特性：

```css
font-family: "SF Mono", Menlo, Monaco, Consolas, "MiSans", monospace;
font-feature-settings: "tnum" 1;
font-variant-numeric: tabular-nums;
```

---

## 2. 字阶与字号规范 (Type Scale & Sizes)

为避免界面字号过小导致长时间使用疲劳，全局字阶标准定义如下：

| 字阶类别 | 目标物理字号 | 字重 | 行高 | 推荐使用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **问候语大标题** | **26px** | 600 (Semibold) | 1.3 | "下午好，邬文雄" 等首页问候 |
| **卡片区块标题** | **18px** | 600 (Semibold) | 1.4 | 今日待办、快捷记录、日程安排、最近文件、常用工具 |
| **正文与列表项** | **15px** | 400 (Regular) | 24px | 待办内容、输入框文字、笔记正文、便签内容 |
| **全局搜索栏** | **14px** | 500 (Medium) | normal | 顶部 AI 智能速记输入框及占位文字 |
| **辅助与标签信息** | **13px** | 500 (Medium) | 1.45 | 时间戳、胶囊标签、副标题、进度状态、分类标签 |

---

## 3. 颜色对比度规范 (Color Contrast)

| 用途 | 色值 | 说明 |
| :--- | :--- | :--- |
| **主要文字** | `#1D2129` | 深炭灰，用于标题、正文、核心列表项（禁止使用过浅灰色） |
| **次要/已完成文字** | `#4E5969` | 中性灰，用于已完成项、时间戳、副标题、辅助说明 |
| **占位/极轻文字** | `#86909C` | 浅灰色，仅用于 placeholder 等极轻提示文本 |
| **主题蓝** | `#1677FF` | 品牌蓝，用于激活态、链接、主操作按钮 |

---

## 4. 渲染品质规范 (Rendering & Smoothing)

全局必须保持以下渲染配置：

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
letter-spacing: -0.01em;
```

---

## 5. 后续开发准则 (Development Guidelines)

1. **统一继承全局样式**：样式已在 `src/index.css` 全局生效，编写新组件时请使用 Tailwind 标准类或直接引用上述规范字号（如 `text-[15px]`, `text-[18px]`, `text-[13px]`）。
2. **保持单行与整齐排版**：待办列表等核心条目优先保持单行（`truncate`），长文本通过查看详情抽屉展开。
3. **数字对齐规范**：任何涉及时间、倒计时、用时分钟数的地方，统一添加 `font-mono` 类名和 `font-variant-numeric: tabular-nums`。
4. **字体加载**：MiSans WebFont 通过 `index.html` 中的 CDN `<link>` 标签加载（`cdn.jsdelivr.net/npm/misans@4.0`），无需本地安装。
