#!/usr/bin/env node
// lint-ui.mjs — UI 规范可执行自检（对应 specs/00.base.md §13）
//
// 零依赖，Node >= 18。跨平台（Windows / macOS / Linux）。
//
// 用法：
//   node scripts/lint-ui.mjs                       检查当前目录，违规退出码 1
//   node scripts/lint-ui.mjs --root ../my-app       指定项目根
//   node scripts/lint-ui.mjs --scan src --scan app  指定扫描目录（可重复）
//   node scripts/lint-ui.mjs --update-baseline      债务清理后收紧基线
//
// 两类规则：
//   硬规则  —— 一次都不允许，发现即失败
//     H1 CSS 里裸写 font-size 数值（px / rem / em / %）
//     H2 font-size 低于 9px
//     H3 JSX/TSX 里内联 fontSize
//   棘轮规则 —— 存量债务记进基线，只许减不许增
//     R1 元素/后代选择器（`.card p`、`.banner > svg`）
//     R2 `!important`
//     R3 圆角档位种类（四档为限）
//     R4 规则里硬编码的 `#hex`（token 定义 `--x: #hex` 不算）
//
// 说明：棘轮规则不要求一次清零（老项目往往有几百处），但每次提交后计数不得上升；
// 债务减少后运行 --update-baseline 收紧，基线文件应随代码一起提交。

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", ".git", ".next", "target"]);
const BASELINE_NAME = ".ui-lint-baseline.json";

/** 选择器里出现裸标签（含后代 / 子组合）即视为依赖 DOM 结构 */
const ELEMENT_SELECTOR =
  /(?:^|[\s>+~])(button|input|select|textarea|a|svg|span|div|li|p|label|img|ul|ol|table|tr|td|th|h[1-6])(?=$|[\s,:{.[\]>+~])/;

function parseArgs(argv) {
  const opts = { root: process.cwd(), scan: [], baseline: null, updateBaseline: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--root") opts.root = resolve(argv[++i]);
    else if (a === "--scan") opts.scan.push(argv[++i]);
    else if (a === "--baseline") opts.baseline = resolve(argv[++i]);
    else if (a === "--update-baseline") opts.updateBaseline = true;
    else if (a === "--help" || a === "-h") {
      console.log("用法：node scripts/lint-ui.mjs [--root 目录] [--scan 目录]… [--baseline 文件] [--update-baseline]");
      process.exit(0);
    } else {
      console.error(`未知参数：${a}`);
      process.exit(2);
    }
  }
  if (!opts.scan.length) opts.scan = ["src"];
  if (!opts.baseline) opts.baseline = join(opts.root, BASELINE_NAME);
  return opts;
}

function collect(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collect(p, out);
    else if (/\.(css|scss|less|tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

function scanFile(file, rel, acc) {
  const text = readFileSync(file, "utf8");
  const isStyle = /\.(css|scss|less)$/.test(file);

  if (!isStyle) {
    text.split("\n").forEach((line, i) => {
      if (/fontSize\s*:/.test(line)) {
        acc.hard.push(`${rel}:${i + 1} 内联 fontSize，改用语义 class 或 size 档位`);
      }
    });
    return;
  }

  // 规则头：`{` 之前的文本（支持多行选择器；跳过 at-rule 与声明块尾部）
  for (const m of text.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith("@") || sel.startsWith("/*") || sel.startsWith("//") || sel.includes(";")) continue;
    if (ELEMENT_SELECTOR.test(sel)) acc.elements += 1;
  }

  text.split("\n").forEach((line, i) => {
    const n = i + 1;
    if (/font-size\s*:\s*[0-9.]+(px|rem|em|%)/.test(line)) {
      acc.hard.push(`${rel}:${n} 字号硬编码，改用 var(--text-*)`);
    }
    const small = line.match(/font-size\s*:\s*([0-8](?:\.\d+)?)px/);
    if (small) acc.hard.push(`${rel}:${n} 字号 ${small[1]}px 低于 9px 下限`);

    acc.important += (line.match(/!important/g) || []).length;

    for (const r of line.matchAll(/border-radius\s*:\s*([0-9.]+)px/g)) {
      if (r[1] !== "999") acc.radius.add(r[1]);
    }

    // token 定义行（`--color: #fff`）不算硬编码
    const isTokenDef = /^\s*--[\w-]+\s*:/.test(line);
    if (!isTokenDef) {
      acc.hex += (line.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
    }
  });
}

const opts = parseArgs(process.argv.slice(2));
const files = [];
for (const dir of opts.scan) {
  const abs = resolve(opts.root, dir);
  if (existsSync(abs)) collect(abs, files);
}
if (!files.length) {
  console.log(`未找到可扫描文件（root=${opts.root}，scan=${opts.scan.join(",")}）`);
  process.exit(0);
}

const acc = { hard: [], elements: 0, important: 0, radius: new Set(), hex: 0 };
for (const file of files) scanFile(file, relative(opts.root, file), acc);

const now = {
  elements: acc.elements,
  important: acc.important,
  radiusKinds: acc.radius.size,
  hexColors: acc.hex,
};
const baseline = existsSync(opts.baseline) ? JSON.parse(readFileSync(opts.baseline, "utf8")) : { ...now };

if (opts.updateBaseline) {
  writeFileSync(opts.baseline, JSON.stringify({ ...now, updatedAt: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
  console.log(`基线已更新 → ${opts.baseline}\n  ${JSON.stringify(now)}`);
  process.exit(0);
}

const ratchet = [
  ["元素/后代选择器", now.elements, baseline.elements ?? Infinity],
  ["!important", now.important, baseline.important ?? Infinity],
  ["圆角档位数", now.radiusKinds, baseline.radiusKinds ?? Infinity],
  ["硬编码色值", now.hexColors, baseline.hexColors ?? Infinity],
];
const over = ratchet.filter(([, a, b]) => a > b);

if (acc.hard.length) {
  console.error(`✗ 硬规则违规 ${acc.hard.length} 处（必须修）：`);
  for (const v of acc.hard) console.error("  - " + v);
}
if (over.length) {
  console.error("✗ 存量债务增加（棘轮规则）：");
  for (const [name, a, b] of over) console.error(`  - ${name}：${b} → ${a}`);
}
if (acc.hard.length || over.length) {
  console.error("\n规则见 specs/00.base.md §13；清理债务后运行 --update-baseline 收紧基线。");
  process.exit(1);
}

console.log(
  `✓ UI 规范自检通过（硬规则 0 违规；存量 ${ratchet.map(([n, a, b]) => `${n} ${a}/${b}`).join("，")}）`,
);
