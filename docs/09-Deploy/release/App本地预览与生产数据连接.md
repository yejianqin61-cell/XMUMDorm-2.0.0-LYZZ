# App 本地预览与生产数据连接

核对日期：2026-10-09。适用于本仓库 `app/` 中的 Expo SDK 57 原生 App，命令使用 Windows PowerShell。

## 当前连接与验证结果

- 根目录 `.env` 已配置 Railway 公网 MySQL 的 `MYSQL_URL`。本机只执行 `SELECT 1` 验证，连接成功；未运行迁移或修改业务数据。连接测试无法独立证明实例归属，使用本地后端前需与 Railway 生产环境的 MySQL 服务配置核对。
- 生产 API 为 `https://xmumdorm-200-lyzz-production.up.railway.app`，本机请求 `/health` 得到 HTTP 200。该健康接口本身不检查数据库，数据库连通性由上面的独立 SQL 验证确认。
- 本机 `app/.env.local` 已设置 `EXPO_PUBLIC_API_BASE_URL` 指向生产 API。这个文件被 Git 忽略，其他电脑需按下文自行设置。
- 本机已验证 Metro 启动、环境变量加载及 Android JavaScript bundle（HTTP 200，1383 个模块）；类型检查通过，lint 为 0 errors / 309 warnings（现有代码警告）。这不代表已完成手机上的原生交互验收。
- 本次提供预览教程，不执行原生构建、发布或上传商店；真机扫码后的界面与交互仍需在手机上检查。

推荐连接方式：**本地 App → 生产 API → 生产 MySQL**。电脑只启动 Metro，不必启动本地 Express，也不需要把数据库密码交给 App。

生产数据会真实变化：成功登录会写审计与经验值，收藏、发布、点评、导入等操作也会写入生产库。请使用自己的已有账号与可保留的内容进行预览。

## 一、最快开始：手机使用 Expo Go

### 1. 安装手机客户端

安装支持 **SDK 57** 的 [Expo Go](https://expo.dev/go)。Android 可在官方页面选择对应版本；iPhone 上的 App Store 版本必须与 SDK 57 兼容。如果提示 SDK 不兼容，请使用兼容版本或下文的 development build，不要为此随意升级项目 SDK。

电脑和手机接入可互通的同一局域网。校园 Wi-Fi 如果隔离设备，可改用手机热点或第三节的 tunnel。

### 2. 在电脑上打开 PowerShell

```powershell
Set-Location 'C:\Users\阴沛森\Desktop\XMUMDorm-2.0.0-LYZZ\app'
```

第一次在新电脑运行，或更新代码后依赖发生变化时，执行：

```powershell
npm.cmd ci
```

本机已有依赖时可直接进入下一步。使用 `npm.cmd` / `npx.cmd` 可避免 PowerShell 对 `.ps1` 包装脚本的执行策略限制。

### 3. 配置生产 API

本机已配置此文件；新电脑可创建 `app/.env.local`，内容为：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://xmumdorm-200-lyzz-production.up.railway.app
```

也可在当前 PowerShell 窗口设置，优先于文件配置：

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='https://xmumdorm-200-lyzz-production.up.railway.app'
```

不要将 `MYSQL_URL`、数据库密码或 `JWT_SECRET` 放进 App 环境变量。`EXPO_PUBLIC_*` 会进入客户端代码；这里仅放公开 API 地址。配置规则见 [Expo 环境变量文档](https://docs.expo.dev/guides/environment-variables/)。

### 4. 启动并扫码

```powershell
npx.cmd expo start --go --lan --clear
```

保持终端运行。Android 在 Expo Go 中扫描终端二维码；iPhone 使用相机扫描并选择 Expo Go。如果 iPhone 提示需要登录，在电脑执行 `npx.cmd expo login`，并在手机 Expo Go 登录同一个 Expo 账号。

App 加载的是电脑当前代码，接口访问生产 API。保存代码后会触发刷新；终端按 `r` 可重新加载，按 `Ctrl+C` 停止 Metro。修改 API 环境变量后重新启动 Metro 并完整重载 App。

本项目的选图、日期时间选择器和 FlashList 在 SDK 57 文档中均标为包含于 Expo Go，因此这些依赖本身不要求先构建开发客户端。Expo Go 的项目配置和权限行为仍不能代替正式 App 验收。参见 [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)、[DateTimePicker](https://docs.expo.dev/versions/v57.0.0/sdk/date-time-picker/)、[FlashList](https://docs.expo.dev/versions/v57.0.0/sdk/flash-list/)。

## 二、需要调试后端时：本地 Express 连接生产 MySQL

只检查 App 界面时使用第一节即可。需要预览本地后端代码时，再使用本节；本地服务仍有写生产库的能力。

### 1. 后端终端：验证连接并启动

```powershell
Set-Location 'C:\Users\阴沛森\Desktop\XMUMDorm-2.0.0-LYZZ'

# 仅 SELECT 1，输出结果或错误代码，不输出凭据。
node -r dotenv/config -e "(async()=>{const {pool}=require('./database');try{await pool.query({sql:'SELECT 1',timeout:10000});console.log('DB connection OK (SELECT 1)');}catch(e){console.error('DB connection failed:',e.code||'UNKNOWN');process.exitCode=1;}finally{await pool.end();}})();"
if ($LASTEXITCODE -ne 0) {
    throw '数据库连接失败，请先核对连接配置'
}

# 连接成功后再启动服务；后台重置和推送任务保持关闭。
$env:ENABLE_BACKGROUND_JOBS='0'
$env:PORT='4040'
$env:NODE_ENV='production'
npm.cmd run dev
```

生产模式用于关闭开发期行为，`npm run dev` 仍通过 nodemon 提供代码重启。关闭后台任务不会使后端变成只读。首次安装后端依赖可在根目录执行 `npm.cmd ci`，不要执行迁移、建库、种子数据或管理员创建脚本。

根目录 `.env` 仅供后端使用，且必须留在 Git 忽略范围内。有效数据库配置优先级为 `DATABASE_URL` → `MYSQL_URL` → `RAILWAY_MYSQL_URL` → `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`。本机当前使用 `MYSQL_URL`；不要只改 `DB_HOST` 就以为替换了连接。新电脑连接 Railway MySQL 时需使用允许外部连接的公网地址，`*.railway.internal` 仅供平台内服务使用。凭据在本机编辑器中填写，无需粘贴到聊天或 App 配置。

### 2. 查电脑的 IPv4 地址

```powershell
ipconfig
```

选择当前 Wi-Fi 或以太网适配器的 IPv4，例如 `192.168.1.105`。手机浏览器访问 `http://192.168.1.105:4040/health`，应得到健康响应。若访问失败，先检查网络隔离与 Windows 防火墙对 Node 的专用网络访问权限。

### 3. App 终端：切换到本地后端

另开一个 PowerShell 窗口：

```powershell
Set-Location 'C:\Users\阴沛森\Desktop\XMUMDorm-2.0.0-LYZZ\app'
# 将示例 IP 替换成电脑实际 IPv4。
$env:EXPO_PUBLIC_API_BASE_URL='http://192.168.1.105:4040'
npx.cmd expo start --go --lan --clear
```

手机上的 `127.0.0.1` 指手机自身，不能指向电脑。Android 模拟器连接电脑后端可用 `http://10.0.2.2:4040`。

要恢复访问生产 API，在 App 终端停止 Metro，再执行：

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='https://xmumdorm-200-lyzz-production.up.railway.app'
npx.cmd expo start --go --lan --clear
```

## 三、手机连不上 Metro 时

若第一节的二维码一直连接失败，先确认 Windows 允许 Node 在当前专用网络通信，手机与电脑可以互访。网络隔离无法排除时，可停止 Metro，再启动 tunnel：

```powershell
npx.cmd expo start --go --tunnel --clear
```

首次使用按 CLI 提示安装 tunnel 所需的 `@expo/ngrok`，随后扫描新二维码。tunnel 依赖外部服务，可能较慢或不可用；可改用可互通的热点网络。

**tunnel 只转发 Metro，不会转发本地后端 4040 端口。** 所以本教程的生产 API 路径仍可用；使用第二节的本地后端时，手机还必须能够访问电脑的 API 地址。参数说明见 [Expo CLI 文档](https://docs.expo.dev/more/expo-cli/)。

## 四、正式原生预览：development build

这一步用于安装项目自身的开发 App，检查原生配置、权限提示和最终交互；以下为后续执行步骤，本次未执行构建。本机当前未安装 `expo-dev-client`，未绑定 EAS `projectId`，也未发现可直接使用的 adb/Java 工具，所以不能把现状当成已具备原生构建环境。

Windows 可使用 EAS 云端构建 Android 开发 APK：

```powershell
Set-Location 'C:\Users\阴沛森\Desktop\XMUMDorm-2.0.0-LYZZ\app'
npx.cmd expo install expo-dev-client
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
# 绑定正确的团队 EAS 项目；确认后再继续。
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --platform android --profile development
```

仓库已有 `eas.json` 的 `development` 配置，配置流程中保留 `developmentClient: true` 与 `distribution: internal`。安装构建页面提供的 Android APK 后，日常预览运行：

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='https://xmumdorm-200-lyzz-production.up.railway.app'
npx.cmd expo start --dev-client --lan --clear
```

用已安装的开发 App 打开二维码。以后只改 JavaScript/TypeScript 通常无需重新构建；新增原生依赖、更改原生配置或升级 SDK 后需要重新构建。`app/.env.local` 被 Git 忽略，云端构建不会自动得到它；若需要 APK 离开 Metro 仍使用指定地址，应在 EAS 的 development 环境中配置公开变量 `EXPO_PUBLIC_API_BASE_URL`。

Windows 无法本地运行 iOS Simulator；iPhone 的自有 development build 可使用 EAS 云端构建，需按官方流程准备签名账号并注册设备。第一节的 Expo Go 不要求本机安装 Xcode 或 Android Studio。参见 [创建 development build](https://docs.expo.dev/develop/development-builds/create-a-build/) 与 [EAS 构建设置](https://docs.expo.dev/build/setup/)。

## 五、常见问题

| 现象 | 处理 |
| --- | --- |
| 扫码后提示 SDK 不匹配 | 使用兼容 SDK 57 的 Expo Go，或构建本项目 development build。 |
| 页面出来了，接口仍请求 127.0.0.1 | 检查是否在 `app/` 启动 Metro、变量名是否为 `EXPO_PUBLIC_API_BASE_URL`、当前终端是否留有旧变量；重启 Metro 并完整重载。 |
| 返回 401 / 登录状态异常 | 使用真实已有账号重新登录；本地后端切换与线上后端可能使用不同 JWT 密钥，旧 token 不能假定通用。 |
| 本地后端数据库连接失败 | 检查有效连接串优先级、公网可达性及凭据；不要通过执行迁移解决连接问题。 |
| 浏览器 5173 能打开，但没有原生 App | `frontend/` 是独立 Web 客户端；原生预览应在 `app/` 启动 Metro 并通过手机客户端打开。 |

Web 客户端手机浏览器预览见[移动端预览指南](移动端预览指南.md)。
