# 单机 Demo：宝塔部署与前后端连接检查

检查日期：2026-10-09。默认 Linux、宝塔 Nginx、独立域名根目录部署，示例项目路径 `/www/wwwroot/songspace`。

## 服务器配置

建议起点：2 核 CPU、4GB 内存、40–60GB SSD、5Mbps 公网带宽；系统可选 Ubuntu 24.04 LTS。前端在本机构建后上传，服务器无需安装 Node.js。

这是基于当前实现的工程估算，未进行服务器并发压测。Three.js 场景在浏览器渲染；服务器提供静态资源、注册和存档读写，无需 GPU。2GB 内存可用于更小的试用，但宝塔、PostgreSQL 和 Python 同机运行余量有限。当前完整 dist 约 12.5MB（含所有静态文件，单次访问不一定全部加载）；多人首次访问更容易受带宽限制。暂不需要 Redis、队列或独立数据库服务器。

轻量服务器适用于小型网站、Web 应用及小游戏，套餐规格以购买页面为准：[阿里云轻量服务器规格](https://www.alibabacloud.com/help/zh/simple-application-server/product-overview/instance-families/)。PostgreSQL 的内存应给同机其他服务留出空间，勿套用专用数据库服务器的内存比例：[PostgreSQL 资源配置](https://www.postgresql.org/docs/current/runtime-config-resource.html)。

## 连接结果和功能边界

| 能力 | 当前连接方式 | Demo 状态 |
| --- | --- | --- |
| 昵称注册、分配账号 ID | POST `/api/v1/game/accounts` | 已接通 |
| ID 登录和跨设备恢复 | POST `/api/v1/game/sessions/restore` | 已接通 |
| 读取、保存、版本冲突保护 | GET / PATCH `/api/v1/game/save` | 已接通，旧版本写入返回 409 |
| 购买、开包、签到、猜歌、探索结算、成就 | 前端计算后保存完整 `game` | 进度已同步，服务端不验证奖励 |
| 装扮、载具、道具、天气、最近记录 | 存入 `game` 的额外字段 | 已同步 |
| 三个世界的歌曲摆件 | 存入 `imagery` | 已同步 |
| 歌曲图鉴、封面、歌词、模型 | 本地打包资源与 `/catalog/` JSON | 可部署，不依赖实时音乐接口 |
| QQ 音乐 | 外链跳转及已有榜单快照 | 未接实时搜索、榜单更新或播放接口 |
| AI 音乐理解、生成世界/物件 | 暂无 API 调用 | 未实现 |
| 共享排行榜、服务端经济和反作弊 | 暂无对应 API | 未实现，不适合把当前成绩用于竞争排名 |
| User / World / Exploration / Asset / PlacedObject 模型 | 已有迁移，无业务路由 | 当前游戏使用独立 game_profiles 快照表 |

现有玩法可先上线 Demo。账号 ID 就是访问凭据，需要 HTTPS。不要把基础模型存在误认为对应业务已经接通；也无需为当前 Demo 把快照存储重写为这些模型。

## 1. 准备前端和目录

在本机 `songspace-web` 运行：

```powershell
npm ci
npm run build
```

把代码部署至 `/www/wwwroot/songspace`，将完整 `songspace-web/dist` 上传至对应目录。上传必须包含 `assets`、`catalog`、`brand`、`covers`、`fonts` 等全部构建产物，不只上传 index.html。本机 `.env` 和 `.venv` 不上传，服务器单独配置。

在宝塔创建静态网站，根目录设置为 `/www/wwwroot/songspace/songspace-web/dist`，使用自己的域名。不要把后端项目根目录设为公开网站目录。

## 2. 安装后端和数据库

安装 Python 3.12 或更新的受支持版本、PostgreSQL；本项目不能直接换成宝塔常见的 MySQL。数据库监听本机，创建专用用户及 `songspace` 数据库，数据库归该用户所有。通过宝塔数据库工具或 PostgreSQL 管理工具操作。

宝塔终端执行（`python3.12` 替换为实际 Python 解释器路径）：

```sh
cd /www/wwwroot/songspace
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock.txt
.venv/bin/python -m pip install --no-deps -e .
cp .env.example .env
```

`cp` 只在首次没有 `.env` 时执行。编辑服务器 `.env`：

```dotenv
APP_NAME=Songspace
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql+psycopg://songspace:REPLACE_WITH_ENCODED_PASSWORD@127.0.0.1:5432/songspace
CORS_ORIGINS=[]
```

密码中的特殊字符须 URL 编码。同域 Nginx 转发不需要额外 CORS 配置。系统环境变量优先于 `.env`，检查进程管理器是否遗留旧值。

执行迁移并确认版本：

```sh
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m alembic current
.venv/bin/python -m alembic check
```

当前应为 `0002_game_profiles (head)`，且没有待生成迁移；后续按部署版本的 head 判断。

## 3. 宝塔管理常驻后端

在宝塔的进程管理功能（如 Supervisor）创建进程：

- 工作目录：`/www/wwwroot/songspace`
- 启动命令：`/www/wwwroot/songspace/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips 127.0.0.1`
- 使用能读取项目和 `.env` 的非 root 用户，开启自动启动及异常重启。
- 日志写入管理器配置的日志目录，并开启轮转。

Demo 先用一个 worker；不要使用 `--reload`。8000 和 5432 无需对公网开放。Uvicorn 仅信任本机反向代理的转发头：[官方代理配置](https://www.uvicorn.org/settings/#http)。

检查后端：

```sh
curl -i http://127.0.0.1:8000/api/v1/health
curl -i http://127.0.0.1:8000/api/v1/health/ready
```

都应返回 200，ready 包含 `"database":"connected"`。ready 只测连通性，不能替代迁移检查。

## 4. Nginx、路由与 HTTPS

在宝塔网站配置的现有 `server {}` 内加入 [Nginx 片段](../../deploy/baota-nginx.conf)。合并或替换已有的 `location /`，避免重复定义；保留宝塔生成的 HTTPS、证书续期和日志设置。检查已有反向代理或伪静态规则是否冲突。

关键配置：

- `/api/` 转发到 `http://127.0.0.1:8000`，`proxy_pass` 地址末尾没有 `/`，保留完整 `/api/v1/…`。否则 FastAPI 收到的路径不匹配。[Nginx 官方说明](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)
- `try_files $uri $uri/ /index.html` 支持直接访问和刷新 `/login`。[Nginx 静态文件说明](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)
- 开启 gzip，缓存带哈希的 `/assets/`；HTML 和目录 JSON 使用重新验证，接口不缓存。
- 在宝塔签发证书并启用 HTTPS，安全组允许网站的 80/443。

Vite 的 `server.proxy` 只对开发服务器有效；生产构建不会自动代理后端。服务器不需要运行 `npm run dev` 或 `vite preview`。

保存后通过宝塔配置检测确认 Nginx 无误，再重载。当前未在目标服务器运行 `nginx -t`，需要在实际环境验证。

## 5. 上线验收与更新

使用自己的域名验证：

1. `/login` 直接打开及刷新正常，`/catalog/qqmusic-hot-100.json` 返回 JSON。
2. `/api/v1/health` 和 `/api/v1/health/ready` 返回 200。未带凭据请求 `/api/v1/game/save` 返回 401，而不是 index.html。
3. 注册昵称，保存账号 ID，开包、装备、摆件或切天气；等待显示同步完成。
4. 退出登录，再用 ID 登录，确认进度恢复；在另一个浏览器用同一 ID 验证恢复。
5. 后端重启后再次登录，确认数据库存档持久化。短暂断开后端时，本机进度保留，恢复后自动重试。

定期备份 PostgreSQL；若需迁移本机已有玩家，使用数据库备份/恢复，Git 只保存代码和素材，不携带玩家数据。更新前先备份数据库；上传新的完整 dist，安装版本所需依赖，执行迁移后重启后端。前端和后端同步更新，以免注册契约不一致。

## 本次验证

- 前端生产构建和 TypeScript 检查通过；存在 Three.js 所在代码块超过 500kB 的体积提示。
- 后端 13 个单元测试通过；本机 PostgreSQL 隔离 schema 集成测试通过，迁移处于 head，模型无漂移。
- 前端 16 组 Node 回归脚本通过；构建目录中的 105 首歌曲封面全部存在。修正了两条仍使用旧文案的歌词断言，Python Ruff 检查通过。
- 真实 HTTP 联调使用实际前端存档模块和 FastAPI，通过注册、赠送、开包、签到、结算、天气、装扮、载具、摆件、猜歌状态、退出/恢复以及旧修订写入拒绝；联调用隔离 SQLite，不修改真实玩家存档。
- 未进行服务器压测、宝塔环境验收、模拟器或真机测试。服务器容量和公网加载速度需上线后观察。
