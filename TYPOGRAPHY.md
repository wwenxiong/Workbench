# 项目字体与排版设计规范 (iOS Typography Design System)

> **[重要规范]** 本文档为个人效率工作台的官方排版标准。后续所有界面新增、组件重构与样式开发，**必须严格遵循本文档的字体栈与字阶体系**。

---

## 1. 字体栈规范 (Font Family Stack)

### 1.1 正文与界面文本 (UI & Body)
全面采用 Apple 原生字体族，保证在苹果设备（Mac/iPhone/iPad）上呈现最高水准的清晰度与优雅感，在 Windows 及其他设备上平滑回退至高质量无衬线字体：

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

* **西文字体优先级**：`SF Pro Text` / `SF Pro Display` / `-apple-system`
* **中文字体优先级**：`PingFang SC (苹方)` / `Hiragino Sans GB (冬青黑体)`
* **通用保底**：`Helvetica Neue` / `Helvetica` / `Arial` / `sans-serif`
* **严禁行为**：严禁随意引入第三方非 iOS 风格的网络字体（如 Roboto、Plus Jakarta Sans、Inter、思源宋体等）。

### 1.2 数字、时钟与等宽文本 (Mono & Numbers)
涉及时间戳、时段（如 `09:00-11:00`）、工时打卡（如 `120m`）、代码块及统计数值时，统一使用 Apple 等宽字体，并开启等宽数字特性：

```css
font-family: "SF Mono", Menlo, Monaco, Consolas, "PingFang SC", monospace;
font-feature-settings: "tnum" 1; /* 开启 Tabular Numbers 等宽对齐 */
```

---

## 2. 字阶与字号规范 (Type Scale & Sizes)

为避免界面字号过小导致长时间使用疲劳，**严禁使用小于 11px 的字体**。全局字阶标准定义如下：

| 字阶类别 | CSS 类名 | 目标物理字号 | 行高 (Line Height) | 推荐使用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **微型徽标** | `.text-[9px]` | **11px** | 1.35 | 极小的优先级角标 (如 P1/P2)、极轻量状态小点 |
| **状态徽章** | `.text-[10px]` | **12px** | 1.40 | 循环标签、分类标签 (`#工作`)、卡片副标签 |
| **辅助元数据** | `.text-[11px]` | **13px** | 1.45 | 时间戳、排期时间、打卡时段、输入框辅助提示 |
| **正文 / 待办** | `.text-xs` | **13.5px** | 1.50 | **待办事项标题**、列表主文本、输入框正文、便签内容 |
| **卡片小标题** | `.text-sm` | **15px** | 1.55 | 侧边栏菜单项、模块子标题、弹窗输入框 Label |
| **区域主标题** | `.text-base` | **17px** | 1.60 | 模块顶栏大标题 (如“待办事项”、“工作日报”)、弹窗大标题 |
| **数据突出字** | `.text-lg` / `.text-xl` | **19px ~ 21px** | 1.40 | 统计数字、大打卡时长、关键 KPI 看板数值 |

---

## 3. 渲染品质规范 (Rendering & Smoothing)

为呈现 Apple 特有的视网膜细腻质感，全局必须保持以下渲染配置：

```css
/* 抗锯齿与字形优化 */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;

/* iOS 经典微紧凑字间距 (呼吸感更佳，不松散) */
letter-spacing: -0.015em;
```

---

## 4. 后续开发准则 (Development Guidelines)

1. **统一继承全局样式**：
   - 样式已在 `src/index.css` 全局生效，编写新组件时请使用 Tailwind 标准类（如 `text-xs`, `text-sm`, `text-[11px]`），系统会自动映射至上述放大的 iOS 字阶。
2. **保持单行与整齐排版**：
   - 待办列表等核心条目优先保持单行（`truncate`），长文本通过下拉按钮或查看详情抽屉展开，不破坏整体视觉秩序。
3. **数字对齐规范**：
   - 任何涉及时间、倒计时、用时分钟数、金额等数字的地方，统一添加 `font-mono` 类名，以确保数字变动时不产生左右抖动。
