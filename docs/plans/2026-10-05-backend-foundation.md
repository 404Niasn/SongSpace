# Songspace Backend Foundation Implementation Plan

**Goal:** 在项目根目录搭建可启动、可连接 PostgreSQL、可迁移的后端。

**Architecture:** FastAPI Router 负责 HTTP，Services 负责业务逻辑，Pydantic 负责接口契约，SQLAlchemy 负责持久化。同步 Session 按请求创建，写操作未来由 Service 显式管理事务。Alembic 是唯一建表入口。

**Tech Stack:** Python 3.12 / Conda / FastAPI / SQLAlchemy 2 / psycopg 3 / PostgreSQL / Alembic / Pydantic 2 / pytest。

## 1. 配置与依赖
- 创建 pyproject.toml、环境变量示例、gitignore。
- 在现有 songspace 环境安装项目及测试依赖，检查 pip check。

## 2. 应用与数据库
- 创建 app/config.py、core、database、api、schemas、services。
- 创建应用工厂、lifespan 和 liveness/readiness API。
- 数据库连接失败时 readiness 返回 503；不公开连接信息。

## 3. 数据模型与迁移
- 创建 User、World、MusicExploration、Asset、PlacedObject。
- 一用户一世界，UUID 主键，时间戳，外键和必要约束。
- 初始迁移、Alembic metadata 自动发现、环境变量连接配置。

## 4. 验证与文档
- 单元测试覆盖健康接口、失败返回、Session 回滚、配置校验。
- 使用独立临时 PostgreSQL schema 验证迁移升级/降级/再升级，以及完整对象链写入与外键约束，不删除已有数据库表。
- 检查现有 public 表后执行实际数据库 upgrade head 和 alembic check。
- 使用 conda run -n songspace python -m uvicorn app.main:app 启动，HTTP 检查 health、ready 和 OpenAPI。
- README 记录运行命令、边界、模型和后续迁移方式。完成后停止，不开发前端。
