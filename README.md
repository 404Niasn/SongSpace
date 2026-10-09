# Songspace / 歌境 Backend

Build with AI. Build with Music.

歌曲逐渐成为个人世界的建造材料。当前已实现后端基础设施、基础数据模型及游戏存档同步。

## 本地运行（PowerShell）

在项目根目录执行，使用已有的 `songspace` Conda 环境和 PostgreSQL 数据库：

```powershell
conda activate songspace
python -m pip install -e ".[dev]"
Copy-Item .env.example .env # 已存在 .env 时不要覆盖
# 编辑 .env，设置实际 DATABASE_URL
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

也可不激活环境：`conda run --no-capture-output -n songspace python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`。
开发时可额外添加 `--reload`。
`requirements.lock.txt` 记录本次验证环境的精确依赖版本；需要复现时先运行 `python -m pip install -r requirements.lock.txt`，再安装可编辑项目。

- Swagger：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- 存活检查：`GET /api/v1/health` → `{"status":"ok"}`
- 数据库检查：`GET /api/v1/health/ready` → `{"status":"ok","database":"connected"}`；连接或查询失败返回 503。

应用启动不创建表、不自动迁移；先执行 Alembic。存活检查不依赖数据库；就绪检查只验证连通性，迁移版本通过 Alembic 检查。

## 配置

配置来自系统环境变量或根目录 `.env`，系统环境变量优先。真实 `.env` 已加入忽略规则。

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 必填，格式 `postgresql+psycopg://用户:密码@主机:端口/songspace` |
| `APP_NAME` | API 文档标题，默认 Songspace |
| `APP_ENV` | 环境标识，默认 development |
| `DEBUG` | 日志级别开关，默认 false |
| `CORS_ORIGINS` | JSON 数组，默认空；示例允许本地 Vite 的两个来源 |

用户名和密码中的 `@`、`#`、`%` 等字符需要 URL 编码。不要将真实连接信息提交到版本库。

## 目录与职责

```text
app/
  main.py             应用工厂、生命周期、路由装配
  config.py           Pydantic Settings 配置
  api/router.py       /api/v1 聚合路由
  api/routes/         按能力划分 HTTP 接口
  schemas/            Pydantic 输入输出契约
  services/           业务逻辑；未来音乐理解、世界成长在此实现
  models/             SQLAlchemy ORM 数据模型
  database/           DeclarativeBase、Engine、请求 Session
  core/               通用基础设施，目前只有日志配置
alembic/              迁移环境、模板、版本记录
tests/                单元测试和 PostgreSQL 集成测试
docs/plans/           当前基础架构实施计划
songspace-web/        已有前端
```

Router 调用 Service，Service 使用 Session 和 Model，Schema 定义 HTTP 契约。当前暴露健康接口与游戏会话、存档同步接口。
每个请求使用独立 Session，异常回滚并关闭。依赖不自动 commit；未来写入 Service 使用 `with session.begin():` 管理一个业务动作的事务。
连接池启用 `pool_pre_ping`；连接和 SQL 查询超时当前各为 5 秒。应用关闭时释放连接池。

## 基础模型

所有模型使用 UUID 主键和带时区的创建/更新时间；UUID 由 ORM 生成。`updated_at` 由 SQLAlchemy 写入时更新，直接 SQL 更新需要自行维护。

| 模型 / 表 | 核心字段 | 用途 |
| --- | --- | --- |
| User / users | display_name | 用户身份占位，不包含密码、注册或认证 |
| World / worlds | user_id（唯一）、name、growth_points、state_version、state | 一用户一长期世界；成长积分支持未来音乐树规则；JSONB 保存场景级设置 |
| MusicExploration / music_explorations | world_id、song_title、artist、provider、provider_song_id、status、analysis | 保存歌曲探索来源和未来 AI 结果；状态 pending/completed/failed |
| Asset / assets | key（唯一）、name、category、resource_uri、description | 可复用物件资产目录，资源 URI 可空，不绑定具体 3D 技术 |
| PlacedObject / placed_objects | world_id、asset_id、exploration_id、position_x/y/z、rotation_y、scale | 世界中的物件实例，可追溯歌曲探索；坐标默认 0、旋转单位为弧度、统一缩放默认 1 |

`User → World → MusicExploration`，`World → PlacedObject → Asset`。物件还可关联同一世界的 MusicExploration；组合外键阻止跨世界关联。初始物件允许没有探索来源。

删除用户会级联删除世界及其探索、物件。被物件引用的资产和单独的探索记录禁止删除，保留来源；删除整个世界时相关记录一起删除。
成长积分非负，缩放为正且有限，位置与旋转为有限值。这里只保留成长积分，不定义音乐树等级公式，也不自动累加积分。

世界场景状态与物件实例分开存储，避免把整个世界塞进一个大 JSON。`state_version` 是 JSON 数据格式版本，不是并发锁；后续开放保存接口时应设计并发冲突处理。
`state`、`analysis` 使用 JSONB 和 MutableDict，顶层修改可跟踪；嵌套修改需要重新赋值整个字段。AI 候选列表暂留在 analysis，不提前设计独立候选表或 AI 调用抽象层。

## 迁移与验证

```powershell
python -m alembic current
python -m alembic check
# 模型修改后生成并人工审查迁移
python -m alembic revision --autogenerate -m "describe_schema_change"
python -m alembic upgrade head
python -m pytest -q
python -m ruff check app tests alembic
```

新增模型必须在 `app/models/__init__.py` 导入，才能被 Alembic 发现。迁移只读取环境变量配置，alembic.ini 不存数据库密码。
自动生成的迁移需要审查，尤其是重命名、删除和数据回填；不要用 `create_all()` 绕过迁移。

单元测试不连接真实数据库。集成测试默认跳过；通过环境变量启用：

```powershell
$env:TEST_DATABASE_URL = $env:DATABASE_URL # 仅当已在当前 Shell 设置 DATABASE_URL
python -m pytest tests/test_postgresql.py -q
Remove-Item Env:TEST_DATABASE_URL
```

也可以将 `.env` 的连接值填入 `TEST_DATABASE_URL`。集成测试创建随机命名的 `songspace_test_<uuid>` schema，验证迁移升级/降级/再升级、模型一致性、数据写入、唯一约束、来源外键、级联删除和缩放约束；结束后清理该 schema，不清理 public。测试账户需要 CREATE SCHEMA 权限。

当前没有 AI、音乐平台、登录、JWT、WebSocket、任务队列或部署功能；后续按具体业务需求逐步增加。

## 游戏存档接口

本机已创建 PostgreSQL 数据库 `songspace`，连接配置位于被 Git 忽略的 `.env`。迁移 `0002_game_profiles` 为游戏存档新增独立表，不替代原有世界模型。

- `POST /api/v1/game/sessions`：以初始游戏快照建立会话，仅返回一次原始令牌，数据库保存哈希。
- `GET /api/v1/game/save`：Bearer 令牌读取当前存档。
- `PATCH /api/v1/game/save`：提交修订号和完整状态，冲突返回 409，不覆盖较新的存档。

前端 Vite 的 `/api` 代理到本机 8000。浏览器保留离线缓存并显示同步状态。独立登录页 `/login` 上方输入名字作为账号 ID，通过 `POST /api/v1/game/accounts` 注册（重复 ID 返回 409）；下方通过 `POST /api/v1/game/sessions/restore` 验证已有 ID 并恢复存档，兼容旧游戏 ID。ID 相当于密码，数据库只保存凭据哈希。服务端抽卡结算、反作弊和共享排行榜尚未实现。

本次使用根目录 `.venv` 安装依赖。启动后端：`.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`；前端在 `songspace-web` 执行 `npm run dev -- --host 127.0.0.1 --port 5173`。
