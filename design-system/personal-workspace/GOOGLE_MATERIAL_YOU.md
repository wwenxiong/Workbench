# 【Google Material You / Material 3】设计系统规范 (DESIGN SPECIFICATION)
# Google Material Design 3 Specification for "Personal Workspace"

> 🎯 **设计目标 (Design Philosophy):**  
> 谷歌官方设计语言从 Material Design 演进为 **Material You (Material 3)**。  
> 核心理念：“**把纸张叠放的物理逻辑，变成了极度圆润、色彩柔和、随心自定义的现代卡片风**”。  
> 界面充满视觉亲和力、呼吸感与温度，长时间注视不易产生视觉疲劳。

---

## 一、 核心视觉语言与设计特征 (Core Visual Characteristics)

### 1. 大圆角与卡片化 (Container & Shape)
- **极少直角**：全面摒弃生硬直角与机械式微圆角。
- **外层大容器与主面板**：统一采用 `rounded-[28px]` 或 `rounded-3xl` (28px ~ 32px)。
- **交互元素与指示器**：统一采用**药丸胶囊形 (Pill Shape)**，即 `rounded-full`（9999px）。
- **每个功能块独立**：每个模块都是一个柔和独立的“容器”，边界温润，无任何视觉攻击性。

### 2. 柔和低饱和度的动态取色 (Material You Tonal Palettes)
- **告别冰冷蓝灰**：采用低饱和度、偏粉调、奶油质感与温润浅灰蓝：
  - **全局应用背景 (`background`)**：`#F8F9FA` / `#F0F4F9`
  - **主容器表面 (`surface`)**：纯白 `#FFFFFF`
  - **表面色调阶梯 (Tonal Containers)**：
    - `surface-container-low`：`#F3F6FC`
    - `surface-container`：`#E9EEF6`
    - `surface-container-high`：`#E3E8EF`
    - `surface-container-highest`：`#D9E2EC`
  - **核心主色 (`primary`)**：Google Blue `#0B57D0` / `#1A73E8`
  - **主强调容器 (`primary-container`)**：`#D3E3FD` / `#C2E7FF`
  - **主容器文字 (`on-primary-container`)**：`#001D35` / `#041E49`
  - **辅助次级色 (`secondary`)**：`#4A5C6B`，容器 `#D7E3F1`，文字 `#061D27`
  - **柔和辅助色 (`tertiary`)**：`#6C537B`（淡藕荷色），容器 `#F6D9FF`

### 3. 物理层次感 (Tonal Elevation)
- **取消浓重阴影**：不再依赖大面积深黑脏阴影区分高低。
- **色调深浅分层**：主要通过表面色调深浅对比（`surface`、`surface-container-low`、`surface-container`）来表达卡片层级，搭配极轻微环境阴影（`rgba(0,0,0,0.02 ~ 0.04)`）。
- **去尖锐硬边框**：边框改为透明或极弱的 `border-slate-200/40`，依靠背景底色与留白划分模块。

### 4. 悬浮操作与药丸胶囊 (FAB & Pills)
- **悬浮操作按钮 (FAB - Floating Action Button)**：经典的圆角微矩形（`rounded-2xl`，16px）或药丸形，带有适度悬浮层次，用于主要快捷动作。
- **长条胶囊搜索栏 (Pill Search Bar)**：居中或顶部的长条形 `rounded-full` 胶囊搜索框（`bg-[#E9EEF6]`）。
- **药丸筛选标签 (Filter Chips)**：微交互与分类标签全部使用 `rounded-full` 药丸状芯片，选中态采用 Tonal 强调填充。

### 5. 大留白与轻盈排版 (Airy Layout & Typography)
- 排版宽松自然，间距留足呼吸空间；
- 字体采用 **Google Sans / Roboto / 现代无衬线字体栈**。

---

## 二、 风格对照与双主题切换标准 (Apple iOS vs Google M3)

| 设计维度 | 🍏 Apple iOS 液态玻璃 | 🎨 Google Material You (M3) |
| :--- | :--- | :--- |
| **容器材质** | 半透明磨砂玻璃 `backdrop-blur-2xl` + 白色微光外边框 | 实色/微透 Tonal 色阶容器，无毛玻璃依赖，无尖锐硬边框 |
| **圆角弧度** | 容器 20px~24px，按钮 12px | 容器 28px~32px，按钮/标签/搜索框 `rounded-full` 药丸胶囊 |
| **主色与容器** | Apple Blue `#0071E3`，浅蓝白半透明底色 | Google Blue `#0B57D0`，浅蓝药丸胶囊 `#C2E7FF` 配深蓝字 `#001D35` |
| **导航激活态** | 半透明蓝微光边框胶囊 | 饱满圆润的药丸胶囊指示器 (`rounded-full`) |
| **操作按钮** | 扁平/渐变圆角矩形 | FAB 悬浮操作按钮 + Pill 胶囊按钮 |
| **全局背景** | 冷浅灰白 `#F7F8FA` + 蓝紫弥散光斑 | 暖调浅灰白 `#F8F9FA` / `#F0F4F9` + 低饱和柔和色块 |

---

## 三、 代码实现规范 (Code Implementation Rules)
1. 全局通过 `ThemeContext` 维持 `'apple' | 'google'` 主题状态，并在根元素注入 `data-theme` 属性；
2. 基础容器类 `.liquid-glass-sidebar`、`.liquid-glass-card`、`.liquid-glass-hero` 依据 `[data-theme="google"]` 自动转换为 M3 容器特性；
3. 支持一键切换、记忆存储与平滑过渡。
