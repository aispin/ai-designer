---
name: ai-designer
description: UI 设计规范库入口。在生成、修改、评审任何 Web UI 代码前加载：先读 specs/00.base.md（框架无关基础规范），再按 package.json 中的技术栈命中的框架 spec（当前提供 shadcn/ui + Tailwind CSS v4 + Ant Design 6.x）。用于样式书写、间距/字号/圆角档位、按钮与表单、弹窗浮层、动效、组件库选型与 Token 桥接、antd 6 废弃 API 校验。触发词：写页面、改 UI、调样式、按钮/表格/表单/弹窗、组件库选型、设计规范、shadcn、antd、tailwind。
---

# ai-designer

UI 规范库。规则来自真实项目实操，写成可直接检查的终态形式。

## 何时用

- 要写或改任何 Web UI 代码（组件、页面、样式文件、design token）
- 要做组件库选型裁决（shadcn / antd / ProComponents / 其他）
- 要评审 UI 代码是否合规
- 项目已装 antd / shadcn / Tailwind，但不确定当前版本的 API 写法

不适用：纯后端、脚本、CLI、文档排版。

## 加载顺序（固定，不可跳）

1. **必读** `specs/00.base.md` —— 框架无关基础规范，任何技术栈都生效。
2. **再读命中的框架 spec** —— 见下表，只读命中的那一份；未命中则只用 `00.base.md`，并在回复中说明「当前技术栈无框架协议，仅按基础规范执行」。
3. 需要查具体条款时用 `文件名 §节号` 定位（如 `00.base.md §6`），不要通读全文后再猜。

## 技术栈识别

读项目 `package.json` 的 `dependencies` + `devDependencies`，按下表映射：

| 命中特征 | 加载 |
|---|---|
| `antd` 且 `shadcn`（或 `components.json` / `components/ui/`）且 `tailwindcss` >= 4 | `specs/01.shadcn-ui+tailwindcss+ant-design.md` |
| 仅 `tailwindcss`，无组件库 | `specs/00.base.md`（框架 spec 待补） |
| 其他组件库（HeroUI / MUI / Chakra / Naive UI 等） | `specs/00.base.md` + 声明无框架协议 |

映射表未命中时**不要自行套用 01 的规则**——01 的分层与 Token 桥接专门针对 antd + shadcn 共存，套错会产生互相冲突的样式架构。

## 工作流

1. **识别栈** → 按上表加载 spec。
2. **查证 API**（栈含 antd 时强制）→ 先 `antd_info` / `antd_doc` / `antd_changelog`，或降级 `antd doc` / `antd changelog`；两者都不可用时**问用户**，禁止凭记忆生成 antd 6 代码。
3. **判定归属** → 视觉层（骨架/导航/原子交互/空状态）走 shadcn + Tailwind；功能层（排序/筛选/分页/多字段联动/树/级联/穿梭/日期范围/上传/虚拟列表）走 antd。判不了默认 shadcn。
4. **查重** → 先搜仓库有没有现成封装或同类组件，禁止重复造。
5. **写码** → 只用桥接后的语义 token；尺寸/字号/圆角从档位表取值，不在调用处覆写。
6. **自检** → 项目里有 `scripts/lint-ui.mjs`（或已从本库拷贝）就先跑它（见 `00.base.md §14`），
   再走 `00.base.md §13` 的人工条目；栈含 antd 再跑 `01` §8 的修正路径。
7. **回复** → 只报结论、改动文件、遗留风险。不复述规范原文；需要引用时用条款号。

## 红线（违反即错误，提交前必修）

摘自两份 spec，只列高频项，完整清单以 spec 为准：

1. 禁泛元素/后代选择器（`.card p`、`.banner > svg`），改用角色 class；深度 ≤ 2 层。
2. 禁 `!important`。覆盖不生效时按「`@layer` 顺序 → 特异性 → 变量 → 组件变体」排查。
3. 颜色只用语义 token。禁 `#hex`、禁 `bg-[#1677ff]`、禁 `style={{ color: … }}`（动态计算值除外并注释）。
4. 间距/固定宽高取 4px 倍数，节奏优先 8px；禁 `p-[7px]`、`gap-[10px]`。
5. 字号只用 10 档 token，**9px 是硬下限**，正文与控件 ≥ 12px，禁半档、禁裸 `font-size`。
6. 圆角只用四档（4 / 5 / 10 / 14px），全仓不超过 4 种；按钮与输入必须同档。
7. 按钮只有三档变体（primary / secondary / ghost）；尺寸/字号/hover 只在组件定义，调用处只许改布局类。
8. 同一行控件同高（28px）；图标按钮图标 14px，文字按钮图标 12px。
9. 文字容器禁固定 `height`；内容与边框内边距 ≥ 8px；弹窗 body 左右 20px。
10. 动效只过渡 `transform` / `opacity`，时长只用 180 / 160 / 250ms 三档，尊重 `prefers-reduced-motion`。
11. antd 只许根路径命名导入（`import { Table } from 'antd'`），禁子路径、禁 babel-plugin-import。
12. 反馈 API 必须 `App.useApp()`，禁 `message.xxx` / `Modal.confirm` 静态调用。
13. 禁 `.ant-` 全局选择器覆盖；改用 `ConfigProvider` 的 `theme.token` / `theme.components`。
14. 禁生成 antd 6 废弃 API（`dropdownClassName`、`visible`、`bordered`、`size="default"` 等），清单见 `01` §4.5。
15. Token 方向单向：antd CSS 变量 → Tailwind `@theme inline` → shadcn 变量。禁两套并行定义。
16. shadcn/Tailwind 页面必须有 `.tw-root` 包裹；整页 antd 功能层用 `.ant-app`。
17. shadcn CLI 用 `shadcn` 不是 `shadcn-ui`；新增组件前先查 registry，不得猜名或手写仿制品。
18. 禁同时新增两套体系的同类原子组件。

## 反模式

| 做法 | 为什么不 |
|---|---|
| 通读两份 spec 再开始写 | 上下文被规则淹没，真正的判定反而漏掉。按 §节号按需取 |
| 用 shadcn `<Table>` 手写排序/分页 | 功能层归 antd，手写的筛选/分页/可编辑单元格必然缺键盘与无障碍行为 |
| 用 antd `<Button>` 搭主界面 | 视觉层要可改源码；antd 的按钮尺寸与圆角不在自己控制范围内 |
| 在页面里用一堆覆盖类"修"组件 | 下次改动会再修一遍；改组件本身或新增变体 |
| 规范没覆盖就自创规则 | 先声明「spec 无覆盖」，给出方案并标注需要补的条款 |
| 引用规范时说"按规范要求" | 无信息量；给 `00.base.md §6` 这样的定位 |

## 扩展

新增框架 spec：`specs/NN.<stack>.md`，覆盖版本基线、查证方式、分层与禁交叉、样式隔离、Token 桥接、组件获取、判定表、修正路径；然后在本文的技术栈识别表登记。未登记的 spec 不会被加载。
