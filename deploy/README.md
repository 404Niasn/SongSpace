# SongSpace Demo 部署包

部署目标：Ubuntu 24.04 / Linux x86_64，Python 3.12，PostgreSQL，宝塔 Nginx。包内前端已经编译，包含三首地图音乐；后端附带固定版本的 Linux 离线依赖。服务器无需 Node.js，也无需编译 Python 扩展。

解压后顶层为 `songspace/`，建议放到 `/www/wwwroot/songspace`。这是准备好的代码与资源，不含真实 `.env`、本机虚拟环境、玩家数据库或 Git 历史。`RELEASE.json` 记录构建时 Git 基准及未提交文件；本轮采用最新工作区内容。

## 由部署代理执行

1. 确认服务器系统、CPU 架构、Python 3.12 路径、域名及已有站点，安装 PostgreSQL，创建专用数据库用户和数据库。
2. 上传并解压发布包。新部署可在项目根目录执行 `sha256sum -c SHA256SUMS`。
3. 运行 `bash deploy/prepare.sh`。首次会创建仅属主可读写的 `.env` 并暂停。填入服务器数据库连接后重跑；非默认解释器可使用 `PYTHON_BIN=/实际路径/python3.12 bash deploy/prepare.sh`。脚本安装离线依赖并执行迁移。更新已有数据库时先备份。
4. 根据实际运行用户设置项目读取权限、`.env` 访问权限及 `logs/` 写入权限。新建项目可以统一交给运行用户；现有项目先检查属主，避免覆盖无关权限。
5. 通过宝塔进程管理器配置 `supervisor.ini.example` 所示参数，工作目录为项目根目录，命令为 `bash deploy/start.sh`。路径、运行用户以实际服务器为准。
6. 宝塔静态网站根目录设为 `songspace-web/dist`，将 `baota-nginx.conf` 合并进站点的现有 `server {}`，开启 gzip 和 HTTPS。保留宝塔证书、续期及日志规则，检测配置后重载。
7. 执行 `bash deploy/check.sh https://实际域名`，再验收注册、开包、存档同步和重新登录。检查三首音乐播放及暂停，音频 Range 请求应返回 206。

完整部署及功能边界见 [宝塔 Demo 文档](../docs/deploy/baota-demo.md)。拿到服务器后根据实际环境部署；此包不会自动覆盖站点、配置数据库账户或启动公网服务。

离线依赖使用 pip 的目标平台下载及本地安装机制：[pip download](https://pip.pypa.io/en/stable/cli/pip_download/)。进程管理模板参数依据 [Supervisor 官方配置](https://supervisord.org/configuration.html)。

## 重新打包

在本机运行前端生产构建，再从项目根目录执行：

```powershell
cd songspace-web
npm run build
cd ..
.venv\Scripts\python.exe deploy/package_release.py
```

产物放在 `.runtime/releases/`，包括 `.tar.gz`、同名 SHA-256 校验文件和发布说明。打包使用白名单，只收录运行需要的文件；不修改玩家存档。默认使用当前虚拟环境中已安装并验证过的后端依赖版本。
