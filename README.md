# 锰渣智治平台（锰智云枢）

锰渣智治平台（锰智云枢）是一个面向电解锰渣全流程治理与资源化利用的一体化智能系统。系统围绕“采、诊、决、算、交付”五个核心环节展开：先通过现场无人采样和移动视频采集获取可信原始数据，再在云端完成风险诊断与预处理判定，随后由 AI 对资源化路径和配方进行寻优，在数字孪生环节验证性能、合规和经济性，最后落到买方需求、运输组织、方案文档和低碳价值管理，形成从现场到交付的完整业务闭环。

---

## 1. 项目目标

本项目解决的不是单点监测问题，而是电解锰渣治理中常见的系统性问题：

- 原始数据获取依赖人工，现场采样效率低、可信度不足
- 风险判断依赖经验，缺乏统一、可解释的诊断过程
- 资源化去向选择缺少量化比较，配方决策成本高
- 方案“能不能做、值不值得做”缺乏统一核算口径
- 最终成果难以从技术方案走向买方、合同和交付

系统的核心目标是把传统锰渣处置过程升级为：

- 可感知：现场采样、点位状态、视频画面、设备链路可实时查看
- 可解释：每一步结论都能回溯数据来源、处理状态和证据链
- 可核算：强度、合规、成本、收益、碳收益统一纳入计算
- 可交付：支持目标买家、方案文档、合同摘要和业务闭环输出

---

## 2. 业务流程

系统包含五个业务模块，对应五个处理阶段：

### 2.1 边缘感知

- 锰渣堆场原位采样与现场感知
- 负责现场任务执行、点位采样、设备状态、视频接入、采样结果汇总
- 支持二维码扫码进入手机端采集页 `/capture/:sessionId`

### 2.2 云端中枢

- 锰渣批次风险诊断与预处理判定
- 将采样值转化为风险等级、超标证据和预处理建议

### 2.3 AI 大脑

- 锰渣资源化路径决策与配方寻优
- 对多种资源化路线进行比较，输出推荐路径、配方 BOM 和技术依据

### 2.4 数字孪生

- 资源化方案性能预测与价值核算
- 对强度、合规、成本、收益和减碳价值进行联合评估

### 2.5 商业闭环

- 资源化产品供需撮合与低碳价值管理
- 连接买家需求、运输路径、方案文档、合同摘要和低碳收益

---

## 3. 当前功能清单

### 3.1 前端系统能力

- 五模块流程化主界面
- 顶部批次信息、流程门禁和状态指示
- 持久化流程状态：跨刷新、跨浏览器恢复
- 一键重置流程
- AI 助手抽屉 `锰智助手`
- 方案文档页 `/plan-document`
- 手机采集页 `/capture/:sessionId`

### 3.2 视频与会话能力

- 创建视频会话
- 二维码生成与扫码进入手机采集页
- WebRTC 视频采集与查看
- 会话列表管理
- 会话删除
- 支持多会话切换
- 维护服务端会话状态与心跳信息

### 3.3 服务端能力

- Express HTTP API
- WebSocket 信令服务
- AI 助手代理接口
- 系统访问口令门
- 服务端持久化流程状态与路线选择

---

## 4. 技术架构

### 4.1 前端

- React
- Vite
- React Router
- Lucide 图标
- 自定义业务组件与部分 UI 基础组件

主要目录：

- `src/app/components/`：主布局、共享组件、AI 助手抽屉
- `src/app/pages/`：五个模块页、手机采集页、方案文档页
- `src/app/streaming/`：视频会话 API、ICE 配置、viewer/publisher hook
- `src/app/context/`：全局运行时状态、流程状态、服务端同步
- `src/app/assistant/`：AI 助手上下文与请求类型
- `src/app/gate/`：访问口令逻辑

### 4.2 后端

- Node.js
- Express
- ws（WebSocket）

核心文件：

- `server/index.js`

负责：

- 提供前端静态资源（生产模式）
- 提供 REST API
- 提供 WebSocket 信令
- 管理视频会话
- 管理服务端运行时状态
- 代理硅基流动 AI 接口

### 4.3 数据

- 静态演示数据：`src/imports/demo_data.json`
- 服务端运行时状态：`server/demo-runtime-state.json`

---

## 5. 目录结构

```text
server/
├─ server/
│  ├─ index.js
│  └─ demo-runtime-state.json
├─ src/
│  ├─ app/
│  │  ├─ assistant/
│  │  ├─ components/
│  │  ├─ context/
│  │  ├─ data/
│  │  ├─ gate/
│  │  ├─ hooks/
│  │  ├─ pages/
│  │  ├─ streaming/
│  │  ├─ App.tsx
│  │  └─ routes.ts
│  └─ imports/
│     └─ demo_data.json
├─ dist/
├─ package.json
├─ vite.config.ts
└─ README.md
```

---

## 6. 路由说明

系统当前主要路由如下：

- `/`：模块一，边缘感知
- `/cloud`：模块二，云端中枢
- `/ai-brain`：模块三，AI 大脑
- `/twin`：模块四，数字孪生
- `/market`：模块五，商业闭环
- `/capture/:sessionId`：手机采集页
- `/plan-document`：方案文档页

路由定义文件：

- `src/app/routes.ts`

---

## 7. 环境要求

建议环境：

- Node.js 18 或以上
- npm 9 或以上
- 生产环境 HTTPS 域名
- 若需要公网手机视频采集，建议部署 coturn

---

## 8. 环境变量

在项目根目录创建 `.env`。

示例：

```env
PORT=8787
APP_PUBLIC_ORIGIN=https://mn.mddcommunity.top

APP_GATE_PASSWORD=
VITE_APP_GATE_ENABLED=true

SILICONFLOW_API_KEY=
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen2.5-14B-Instruct
VITE_ENABLE_AI_ASSISTANT=true

VITE_TURN_URLS=turn:mn.mddcommunity.top:3478?transport=udp,turn:mn.mddcommunity.top:3478?transport=tcp
VITE_TURN_USERNAME=turnuser
VITE_TURN_CREDENTIAL=turnpassword
```

字段说明：

- `PORT`：Node 服务端口，默认 `8787`
- `APP_PUBLIC_ORIGIN`：对外访问域名，用于二维码和发布端链接生成
- `APP_GATE_PASSWORD`：系统访问口令，可留空
- `VITE_APP_GATE_ENABLED`：是否启用访问口令门
- `SILICONFLOW_*`：硅基流动 AI 助手配置
- `VITE_ENABLE_AI_ASSISTANT`：是否在前端显示 AI 助手
- `VITE_TURN_*`：TURN 配置，用于公网移动端 WebRTC

---

## 9. 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

该命令会同时启动：

- 前端 Vite 开发服务器
- 后端 Express/WebSocket 服务

相关脚本：

- `npm run dev`：同时启动前后端
- `npm run dev:web`：只启动前端
- `npm run dev:server`：只启动后端（watch 模式）
- `npm run build`：构建前端
- `npm run start:server`：启动后端

开发模式端口：

- 前端：通常为 `5173`
- 后端：`8787`

注意：

- 开发模式下，Vite 会代理 `/api` 和 `/ws` 到后端
- 生产环境不要依赖 `5173/5174` 这类开发端口

---

## 10. 生产部署

### 10.1 构建

```bash
npm run build
```

### 10.2 启动

可直接启动：

```bash
NODE_ENV=production node server/index.js
```

推荐 pm2：

```bash
npm run build
NODE_ENV=production pm2 start server/index.js --name mn-demo
pm2 save
```

更新后：

```bash
npm run build
pm2 restart mn-demo --update-env
```

### 10.3 反向代理

生产环境反代目标应为：

- `127.0.0.1:8787`

不要把正式域名反代到：

- `5173`
- `5174`

那是开发服务器端口，只适用于 `npm run dev`。

---

## 11. 视频会话与移动采集

### 11.1 会话流程

1. 桌面端在模块一创建会话
2. 系统生成二维码和发布链接
3. 手机扫码进入 `/capture/:sessionId`
4. 手机授权摄像头并点击开始采集
5. 桌面端查看视频画面和链路状态

### 11.2 会话接口

- `POST /api/stream-sessions`
- `GET /api/stream-sessions`
- `GET /api/stream-sessions/:id`
- `DELETE /api/stream-sessions/:id`

### 11.3 当前支持

- 创建会话
- 删除会话
- 二维码发布
- 手机采集
- viewer 查看
- 多会话切换

### 11.4 当前边界

- 多会话切换仍受 WebRTC 会话状态影响
- 切换体验已做优化，但并不等于绝对零重协商
- 公网移动端建议使用 TURN

---

## 12. 服务端运行时状态

本项目已经将以下信息持久化到服务端：

- 当前选中的材料路线
- 五个流程模块的状态
- 各模块完成时间

状态文件：

- `server/demo-runtime-state.json`

这意味着：

- 页面刷新后流程不会丢失
- 更换浏览器后仍能恢复流程状态
- 可以通过前端按钮一键重置流程

相关接口：

- `GET /api/demo-runtime`
- `POST /api/demo-runtime/material`
- `POST /api/demo-runtime/flows/:moduleKey/:action`
- `POST /api/demo-runtime/reset`

---

## 13. AI 助手

系统内置 `锰智助手`，通过硅基流动 API 提供页面内解释能力。

当前设计原则：

- 只基于系统内数据和页面上下文回答
- 主要用于解释当前页面、说明推荐理由、总结证据
- 由服务端代理调用，不在前端暴露 API Key

主要接口：

- `POST /api/assistant`

如果启用访问口令门，AI 助手也会受保护。

---

## 14. 访问口令门

若设置：

- `APP_GATE_PASSWORD`
- `VITE_APP_GATE_ENABLED=true`

则主系统会启用访问口令门。  
用户进入主系统前必须先输入口令。  
当前设计中：

- 主系统受保护
- AI 助手接口受保护
- 手机采集页和方案文档页不受此 gate 影响

---

## 15. 常用排查

### 15.1 页面能打开，但手机视频不出画面

优先检查：

- 是否使用 HTTPS 域名
- TURN 配置是否生效
- coturn 是否正常运行
- 反代是否正确支持 `/ws`

### 15.2 页面返回 502

优先检查：

- OpenResty/1Panel 反代端口是否为 `8787`
- 后端生产服务是否在运行
- 是否误反代到开发端口 `5173/5174`

### 15.3 流程状态总是保留上一次结果

可点击系统左侧底部：

- `一键重置流程`

### 15.4 会话太多

模块一的视频会话列表支持：

- 单个会话删除

---

## 16. 路演建议

建议按以下顺序演示：

1. 点击 `一键重置流程`
2. 从模块一开始，演示现场采样和二维码视频接入
3. 进入模块二，展示风险诊断结果
4. 在模块三展示路线决策与配方寻优
5. 在模块四展示性能与经济核算
6. 在模块五展示方案文档、买家匹配和闭环交付

如果现场需要快速重来：

- 重置流程
- 视情况删除旧视频会话

---

## 17. 当前已知限制

- 视频会话存于服务端内存，服务重启后会丢失
- 多会话切换已支持，但还不是严格意义上的监控墙架构
- AI 助手为受约束的页面内助手，不是通用知识库
- 访问口令门是最小防护方案，不是完整鉴权系统

---

## 18. 维护建议

后续如果继续演进，优先级建议如下：

1. 将视频会话持久化到服务端数据库或缓存
2. 优化多会话切换体验，进一步接近零重协商
3. 为手机采集页增加更明确的 RTC 诊断面板
4. 为运行时状态增加“流程重置 + 会话清空”组合操作
5. 将 AI 助手接入更严格的权限控制和调用限流
