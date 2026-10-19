# 歌境 SongSpace · 前端开发指南

产品定位、截图与首次游玩流程见 [项目 README](../README.md)，详细功能见 [产品总结](../docs/product/overview.md)。

## 启动与构建

需要 Node.js `^22.18.0` 或 `>=24.12.0`。在本目录执行：

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
npm run build
```

登录页位于 `/login`，完整注册、登录与存档同步需要后端和 PostgreSQL。Vite 的 `/api` 代理到 `http://127.0.0.1:8000`；后端启动见 [后端指南](../docs/development/backend.md)。

生产构建输出至 `dist/`。部署需同时配置 `/api/` 反向代理与 SPA 路由回退，详见 [部署文档](../docs/deploy/baota-demo.md)。

## 模块导航

| 目录 / 文件 | 职责 |
| --- | --- |
| `src/views/HomeView.vue` | 大厅与功能页面切换、探索准备、装备、结算和账号弹窗 |
| `src/views/LoginView.vue` | 昵称注册、账号 ID 登录与存档恢复 |
| `src/components/` | 卡包、仓库、猜歌、成就、人物 / 载具预览与世界画布 |
| `src/game/save.ts` | 本机状态、卡牌分类、经济、保底、签到及成就规则 |
| `src/game/clipboard.ts` | 账号 ID 复制与 HTTP / 弹窗内的兼容回退 |
| `src/game/cloud.ts` | 账号连接、云端同步、冲突与退出处理 |
| `src/game/race.ts`、`skills.ts` | 三车道探索、控制、计分、道具与回溯 |
| `src/game/vehicles.ts`、`outfits.ts` | 歌曲专属载具与装扮映射 |
| `src/game/imagery.ts`、`content.ts` | 意象库存、世界布置、天气与道具定义 |
| `src/worlds/` | Three.js 世界、天气、模型与微缩场景 |
| `public/catalog/` | 当前 105 首曲库、来源记录、封面索引、摘句与地图音乐配置 |
| `public/audio/` | 当前地图音频资源 |
| `tests/` | 独立玩法验证脚本与只读场景预览页面 |

## 相关验证

`npm run build` 包含 TypeScript 检查与生产构建。按修改范围选择专项脚本：

```powershell
node --experimental-strip-types tests/economy.mjs
node --experimental-strip-types tests/daily-rewards.mjs
node --experimental-strip-types tests/achievements.mjs
node --experimental-strip-types tests/login.mjs
node --experimental-strip-types tests/cloud-reconnect.mjs
node --experimental-strip-types tests/imagery.mjs
node --experimental-strip-types tests/world-weather.mjs
node --experimental-strip-types tests/catalog-vehicles.mjs
node --experimental-strip-types tests/vehicles.mjs
node --experimental-strip-types tests/outfits.mjs
node --experimental-strip-types tests/race-difficulty.mjs
node --experimental-strip-types tests/race-entry.mjs
node --experimental-strip-types tests/clipboard.mjs
node --experimental-strip-types tests/song-worlds.mjs
node --experimental-strip-types tests/space-world.mjs
node --experimental-transform-types tests/high-heels.mjs
```

`high-heels.mjs` 的依赖包含 TypeScript 参数属性，需要 `--experimental-transform-types`，不能仅使用类型剥离。

玩法测试使用测试存档或内存状态；运行前仍应阅读对应脚本的环境要求。场景预览以 `tests/*-preview.html` 为主，通过 Vite 开发服务器访问。

## 实现边界

购买、抽卡和探索结算目前由客户端计算，服务端负责账号与存档。共享排行榜、反作弊与 AI 歌曲分析尚未实现；太空场景中的星球车目前仅为景物。

当前 12 项成就、九类道具、歌曲专属载具、背包 / 高跟鞋装扮与青花配饰等规则以源码为准。部分装饰使用通用意象模型，部分旧载具保留遗留分类逻辑。主题包仅保留旧存档兼容，不在商店出售。

生产构建有 Three.js 包体超过 500 kB 的提示；低性能设备与真实移动设备性能尚未验证。开包支持跳过动画与减少动态效果偏好。
