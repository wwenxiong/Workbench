# 【高端 iOS 原生级液态玻璃 UI 界面】设计系统规范 (MASTER SPECIFICATION)
# High-End iOS Native Liquid Glass Design System for "Personal Workspace"

> ⚠️ **项目全局强制准则 (STRICT RULE FOR ALL SUBSEQUENT TASKS):**  
> 本项目后续所有页面、组件、对话框、图表与界面的设计和开发，必须**严格遵守**本规范。  
> 严禁偏离本规范规定的材质、色调、字体、布局与图标原则。

---

## 一、 核心视觉设计语言 (Core Visual Language)

整体呈现出类似 **Apple 最新系统设计语言（iOS / iPadOS / macOS）的高级感、克制感与真实工业级软件质感**。

### 1. 液态玻璃材质体系 (Liquid Glass / Frosted Glass System)
- **多层半透明磨砂材质**：
  - 外层容器 / 侧边栏：`bg-white/65 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.03)]`
  - 主卡片 / Hero Card：`bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_10px_36px_rgba(0,0,0,0.035),inset_0_1px_1px_rgba(255,255,255,0.9)]`
  - 子卡片 / 悬浮项：`bg-white/90 backdrop-blur-md border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]`
- **光学高光与微折射边缘**：
  - 玻璃边缘使用极细致的半透明白色微光边框（`border border-white/90`），配合内阴影微高光（`shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]`）；
  - 呈现真实玻璃的物理折射感与景深，杜绝“廉价透明塑料”的单薄感。
- **克制的环境阴影**：
  - 杜绝深重脏乱的投影，仅使用极柔和、高弥散的微环境光晕（`rgba(0, 0, 0, 0.02 ~ 0.035)`）。

### 2. 全局色彩系统 (Color Tokens)
- **主背景色**：极浅灰白 / Ivory White / `#F7F8FA`（带有非常微妙的极浅蓝紫漫反射光斑）
- **玻璃主体**：半透明纯白 `rgba(255, 255, 255, 0.65 ~ 0.85)`
- **文字与层级**：
  - 主标题 / 强调文字：Apple Dark Slate `#1D1D1F`（极高可读性）
  - 正文文本：`#3A3A3C` / `#48484A`
  - 次要说明 / 辅助文本：Apple System Gray `#86868B`
  - 微弱占位符：`#AEAEB2`
- **功能强调色 (Accent Color)**：
  - 克制的主色：**Apple Blue** (`#0071E3` / `#0A84FF`)
  - 辅助功能色：极浅蓝 (`#F0F6FF`)、银灰 (`#F2F2F7`)、极淡紫 (`#F5F3FF`)
- **严禁事项**：
  - ❌ 禁止高饱和度彩虹渐变
  - ❌ 禁止大面积浓重蓝紫渐变
  - ❌ 禁止霓虹发光与赛博朋克风
  - ❌ 禁止纯黑纯灰死板块面

---

## 二、 图标设计铁律 (Strict Iconography Rules)

> 🚨 **严禁使用任何 Emoji！**  
> 严禁出现：😀 😂 ⭐ ❤️ 🔥 📌 🚀 ☀️ 💎 📄 💬 🎉 ⚡ 等任何 Emoji！  
> 严禁彩色 Emoji、3D Emoji、拟物 Emoji 作为功能图标或状态图标！

- **统一风格**：
  - 严格采用 **Apple SF Symbols 风格** / 原生 iOS Line Icon；
  - 统一为**单色极简线性几何图标**（基于 `lucide-react`，统一设置 `strokeWidth={1.5}` 或 `1.75`）；
  - 保持统一的视觉比例与端点圆润度（`strokeLinecap="round" strokeLinejoin="round"`）；
  - 严谨小尺寸像素级清晰对齐，与文字排版保持精准几何基线对齐。

---

## 三、 界面布局与网格规范 (Layout & Grid System)

### 1. 视口比例与结构
- 采用专业桌面端 / iPad 工作台架构：
  - **左侧纵向液态玻璃侧边栏 (Sidebar)**：固定宽度约 17%（240px ~ 260px），高度 `100vh` 悬浮圆角面板；
  - **右侧主工作区 (Main Content Area)**：约 83%，包含固定顶部 Header 与纵向流畅滚动的 Dashboard / 模块内容区。
- **网格与间距系统**：
  - 严格遵循 **8px / 4px Spacing System**（间距阶梯：4px, 8px, 12px, 16px, 20px, 24px, 32px）；
  - 大面积留白，卡片之间保持呼吸感（gap: 20px / 24px）；
  - 统一圆角：主容器 `rounded-[28px]`，功能卡片 `rounded-2xl` (16px ~ 20px)，按钮/交互胶囊 `rounded-xl` (12px)。

---

## 四、 核心组件规格标准 (Component Specifications)

### 1. 左侧 Sidebar
- **品牌 Logo**：极简几何几何矢量图标（双环相交/光圈微晶质感），配粗体「个人工作台」，英文字「My Workspace」；
- **导航菜单列表**：
  1. 首页 (Home)
  2. 待办事项 (CheckSquare)
  3. 快速记录 (Edit3)
  4. 日程 (Calendar)
  5. 项目 (FolderKanban)
  6. 文件 (FileText)
  7. 设置 (Settings)
- **选中态胶囊**：半透明蓝白玻璃胶囊（`bg-blue-500/10 text-[#0071E3] font-semibold border border-blue-500/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]`）；
- **底部专注状态卡片**：
  - 标签：「专注时长」
  - 大数字：「4.2 小时」
  - 微标签：「今日专注 +12%」（Apple 绿标）
  - 配合极简平滑柱状/折线微图表。

### 2. 顶部 Header
- **搜索栏**：左侧原生玻璃圆角胶囊搜索框（「搜索任务、项目、文件或笔记……」配 `⌘ K` 快捷键徽标）；
- **右侧功能区**：精致日期文本、通知铃铛（带原生红点）、圆角用户头像、用户名「张一鸣」、Chevron 下拉符号。

### 3. 主区域 Hero Glass Card
- 标题：「个人工作台」
- 副标题：「专注、记录与管理你的每一天」
- 辅助箴言：「持续专注，积累点滴。」
- 材质：大型半透明液态磨砂玻璃板，背景融入超低饱和度抽象几何折射光晕与微透光波，不与前景文字产生对比度干扰。

### 4. Dashboard 专业五卡网格
1. **今日待办**：
   - 顶部「今日待办」与精致数字「3 / 5」或动态计数；
   - 极细 4px 原生进度条；
   - 纯正 Apple Checkbox / Check Circle 交互；
   - 任务清单（完成产品需求文档评审、与设计团队同步界面方案、回复客户邮件并跟进反馈、整理项目周报、阅读《深度工作》第3章）。
2. **快速记录**：
   - 原生输入框「随手记录你的想法……」；
   - 极简文字卡片，附带精细分类标签与相对时间，零 Emoji。
3. **日程安排**：
   - 细线时间轴、圆点指示器、玻璃质感日程卡（09:00、11:00、14:30、16:00）。
4. **项目进度**：
   - 3 个核心项目，极细高质感进度条与准确百分比（68%、42%、75%）。
5. **最近文件**：
   - 极简矢量文件图标（DOCX、SKETCH、PPTX），纯净高质感。

---

## 五、 排版与字体规范 (Typography)

- **字体栈**：
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", 
               "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  ```
- **字重梯队**：
  - 大标题：`font-bold` (600 ~ 700)
  - 模块标题：`font-semibold` (600)
  - 正文：`font-normal` (400)
  - 辅助说明 / 标签：`font-medium` (500) 或 `font-light` (300)
- **严禁**：任何手写体、艺术体、粗劣海报体。

---

## 六、 开发执行检查清单 (Delivery Checklist)

- [ ] 严禁出现任何 Emoji 字符或 Emoji 图标；
- [ ] 所有可点击元素拥有 `cursor-pointer` 与 150-250ms 平滑过渡态；
- [ ] 玻璃材质背景文字对比度必须满足 WCAG 4.5:1 要求，保证日光下清晰易读；
- [ ] 边框必须为半透明微白（`border-white/80` 或 `border-slate-200/60`）；
- [ ] 页面在各类显示器与视口尺寸下保持像素级平整严谨。
