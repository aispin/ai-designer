# ai-designer

面向 AI Agent 的 UI 设计规范库。**只收经过真实项目验证、能落地检查的规则**，不收教程、不收风格建议、不绑定任何业务。

## 为什么需要它

Agent 生成 UI 时的失败模式高度集中：

| 现象 | 根因 |
|---|---|
| 用了 v5 的 antd API，跑起来全是弃用警告 | 凭训练记忆生成，不查当前版本 API |
| 每个页面按钮高矮不一、圆角从 2px 到 12px 都有 | 没有 token，没有档位，调用处随手覆写 |
| 文字贴边、被裁切 | 文字容器写了固定高度 |
| Tailwind 的 preflight 把 antd 样式冲掉 | 两套组件库没有样式隔离协议 |
| 改样式只能加 `!important` | 选择器靠元素和结构定位，特异性失控 |

这些不是审美问题，是**协议缺失**。本库把每条规则写成「禁止什么 / 改成什么 / 怎么自查」的终态形式，让 Agent 和人用同一套判据。

## 目录结构

```
specs/
├── 00.base.md                                无框架依赖的基础规范（所有项目必读）
├── 01.shadcn-ui+tailwindcss+ant-design.md    shadcn/ui + Tailwind v4 + antd 6 混合栈
└── …                                        后续框架协议按 02/03/… 递增
scripts/lint-ui.mjs                          可执行自检（零依赖，见 00.base.md §14）
SKILL.md                                      Agent 入口：加载顺序、工作流、红线
```

## 可执行自检

`scripts/lint-ui.mjs`（零依赖，Node ≥ 18）把 `00.base.md §13` 里可机械判定的 4 条做成检查：

```bash
node scripts/lint-ui.mjs --root ../my-app          # 检查别的项目
node scripts/lint-ui.mjs --update-baseline         # 债务减少后收紧基线
```

硬规则（裸 `font-size`、<9px、内联 `fontSize`）发现即失败；
棘轮规则（元素选择器、`!important`、圆角档位、硬编码色值）记进 `.ui-lint-baseline.json`，
只许减不许增。老项目不必一次清零，但数字不应回涨。

## 规范清单

### 00.base.md — 通用设计基础规范

不依赖任何框架或组件库，换技术栈后规则依然成立。

| 章节 | 内容 |
|---|---|
| §1 | 样式书写 C1–C10：禁泛元素/后代选择器、深度 ≤2、禁 `!important`、`:where()` 重置、颜色只用 token、禁静态内联样式、一 class 一角色、声明顺序 + 自查脚本 |
| §2 | 颜色与 Token 纪律 |
| §3 | 4px 网格、常用取值、圆角四档、阴影用法 |
| §4 | 字号 10 档 type scale（9–44px，9px 硬下限） |
| §5 | 可点击元素 |
| §6 | 按钮系统：三档变体、三档尺寸、禁用/hover/边框约定 |
| §7 | 表单与输入 |
| §8 | 容器与内容防贴边 |
| §9 | 对话框与浮层 |
| §10 | 图标与图表 |
| §11 | 动效 |
| §12 | 交互复用 |
| §13 | 提交前自检 10 条 |

### 01.shadcn-ui+tailwindcss+ant-design.md — 混合栈协议

| 章节 | 内容 |
|---|---|
| §0 | 版本基线（React 19 / antd 6.6 / Tailwind 4.3 / ProComponents 策略） |
| §1 | MCP 前置查证：antd 官方 MCP 8 工具、shadcn MCP、ProComponents 社区 MCP、降级路径 |
| §2 | 分层：shadcn+Tailwind = 视觉叙事层，antd = 功能引擎层，禁交叉 + 落地顺序 |
| §3 | Tailwind v4 样式隔离：`@plugin` scoped-preflight、`@layer` 顺序、禁 `.ant-` 全局覆盖 |
| §4 | antd 6 导入规范 + 废弃 API 清单 |
| §5 | Design Token：antd CSS 变量为单一真相源，`@theme inline` 桥接到 Tailwind / shadcn |
| §6 | shadcn 组件获取（CLI / registry / 源码即仓库） |
| §7–§9 | 快速判定表、违反修正路径、Agent 行为约束 |

## 使用方式

### 人

按需直读。改 UI 前先看 `00.base.md` §13 自检清单；涉及 shadcn/antd 时加读 `01.*`。

### Agent

从 `SKILL.md` 进入。它的职责是：识别技术栈 → 固定加载 `00.base.md` + 命中的框架 spec → 按工作流执行（查证 API → 判定归属 → 写码 → 跑自检）→ 只引用条款号，不复述规则。

## 规范编写约定

新增或修改规范时守这 6 条：

1. **只写终态规则**。不写迁移计划、审计数据、修订记录、产品现状。
2. **无框架依赖的规则必须放 `00.base.md`**。框架文件不得重复定义基础规则，只能引用并按需加严，不能放宽。
3. **每条规则可检查**。要么给禁止写法/正确写法的对照，要么给 grep / DevTools 自查步骤；写不出检查方式的不收录。
4. **不耦合业务**。不出现具体产品名、页面名、字段名。
5. **文件头固定 4 行**：文档说明 / 更新说明 / 更新时间 / 最后更新。
6. **交叉引用用 `文件名 §节号`**，例如 `00.base.md §6`，不用「上文」「第 5 节」这类相对指代。

## 新增一份框架 spec

以引入 HeroUI + Tailwind 为例：

1. 新建 `specs/02.heroui+tailwindcss.md`，文件头 4 行照抄格式。
2. 开头声明：本文件只写框架规则，基础规范见 `00.base.md`。
3. 至少覆盖：版本基线、官方 MCP/CLI 查证方式、与既有栈的分层与禁交叉、样式隔离与层叠、Token 桥接方向、组件获取方式、判定表、违反修正路径。
4. 会与已有框架 spec 冲突的场景（同一页面同时命中两套协议）必须写明裁决规则。
5. 在 `README.md` 规范清单与 `SKILL.md` 技术栈识别表中登记，否则 Agent 不会加载它。

## Roadmap

- [ ] `02.*` 第二套框架协议（候选：HeroUI + Tailwind、Vue/Naive UI、Svelte/Skeleton）
- [ ] 可执行检查脚本：把各 spec 的自检项收成一条命令（`lint:ui`）
- [ ] Token 初始值模板：色板、字号、间距、圆角的一次性脚手架
- [ ] 页面级配方：列表页 / 表单页 / 详情页 / 空状态 / 错误状态的标准结构

## 许可

[MIT](./LICENSE) © 2026 ZEO
