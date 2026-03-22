@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ======================================
echo   锰智云枢 本地快速部署脚本 (Windows)
echo ======================================
echo.

:: ── 1. 检查 Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18 或以上版本。
    echo        下载地址：https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -e "process.stdout.write(process.versions.node)"') do set NODE_VERSION=%%v
for /f "tokens=1 delims=." %%m in ("!NODE_VERSION!") do set MAJOR=%%m
if !MAJOR! LSS 18 (
    echo [错误] 当前 Node.js 版本为 !NODE_VERSION!，需要 18 或以上版本。
    pause
    exit /b 1
)
echo [√] Node.js !NODE_VERSION!

:: ── 2. 检查 npm ───────────────────────────────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm，请确认 Node.js 安装完整。
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm -v') do set NPM_VERSION=%%v
echo [√] npm !NPM_VERSION!

:: ── 3. 进入脚本所在目录 ───────────────────────────────────────────────────────
cd /d "%~dp0"

:: ── 4. 初始化 .env ────────────────────────────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo.
        echo [提示] 已从 .env.example 生成 .env 文件，请按需修改配置后重新运行本脚本。
        echo        常用配置项：
        echo          PORT                 服务端口（默认 8787）
        echo          APP_PUBLIC_ORIGIN     对外访问地址（本地可留空或填 http://localhost:8787）
        echo          SILICONFLOW_API_KEY   AI 助手 API Key
        echo          APP_GATE_PASSWORD     访问口令（可留空）
        echo.
        set /p CONTINUE="是否现在继续部署？[y/N] "
        if /i not "!CONTINUE!"=="y" (
            echo 已退出，请编辑 .env 后重新运行 deploy-local.bat
            pause
            exit /b 0
        )
    ) else (
        echo [提示] 未找到 .env.example，跳过 .env 初始化，将使用默认配置。
    )
) else (
    echo [√] 已检测到 .env 文件
)

:: ── 5. 安装依赖 ───────────────────────────────────────────────────────────────
echo.
echo [1/2] 正在安装依赖（npm install）...
call npm install
if errorlevel 1 (
    echo [错误] npm install 失败，请检查网络或依赖配置。
    pause
    exit /b 1
)

:: ── 6. 构建前端 ───────────────────────────────────────────────────────────────
echo.
echo [2/2] 正在构建前端（npm run build）...
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败，请检查构建日志。
    pause
    exit /b 1
)

:: ── 7. 读取端口 ───────────────────────────────────────────────────────────────
set PORT=8787
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        :: 跳过注释行
        set _KEY=%%a
        set _KEY=!_KEY: =!
        if /i "!_KEY!"=="PORT" (
            :: 取等号右侧，去掉行内注释和首尾空格
            set _VAL=%%b
            for /f "tokens=1 delims=#" %%c in ("!_VAL!") do set _VAL=%%c
            :: 去除首尾空格
            for /f "tokens=* delims= " %%d in ("!_VAL!") do set _VAL=%%d
            :: 验证为纯数字
            set _NUM=!_VAL!
            for /f "delims=0123456789" %%e in ("!_NUM!") do set _NUM=
            if defined _VAL if "!_NUM!"=="" (
                set PORT=!_VAL!
            )
        )
    )
)

:: ── 8. 启动服务 ───────────────────────────────────────────────────────────────
echo.
echo ======================================
echo   部署完成，正在启动服务...
echo   访问地址：http://localhost:!PORT!
echo   按 Ctrl+C 停止服务
echo ======================================
echo.

set NODE_ENV=production
node server/index.js
