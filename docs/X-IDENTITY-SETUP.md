# X 身份授权配置

拾影 1.1.0 的桌面账号页面使用 OAuth 2.0 Authorization Code + PKCE，用户在系统浏览器的 X 官方页面主动授权。账号身份功能与下载引擎独立，令牌不传入 yt-dlp、网页渲染进程或手机接口。真实 X 登录仍需应用 Client ID 和开发者账户允许访问相关接口；本地模拟测试不能替代真实授权验证。

## 创建开发者应用

1. 打开 https://console.x.com ，用自己的 X 账号登录。首次使用按控制台提示完成开发者注册，填写真实用途。
2. 创建 App，名称可用 `VideoDock Shiying`。用途可描述为：用户主动授权桌面应用查询自身账号名称和用户名；默认仅保留当前运行会话，可选系统加密保存，支持退出和清除。不发布内容，不读取私信。
3. 在应用认证设置启用 OAuth 2.0，应用类型选择 **Native App（Public client）**。此流程使用 PKCE，不在桌面程序里配置 Client Secret。
4. 登记回调 URL，逐字填写（不要添加末尾斜杠）：

   ```text
   http://127.0.0.1:19197/oauth/x/callback
   ```

5. 若要求网站地址，可填写你的项目页面 `https://cnb.cool/00zues00/shiying`。若要求隐私政策等资料，应先提供真实说明页面。
6. 复制 **OAuth 2.0 Client ID**。API Key、Bearer Token、Client Secret 不能替代它。
7. 打开拾影 → 账号授权 → 填写 Client ID → 保存配置 → 连接 X。在官方页面核对授权并同意，返回拾影查看状态。

Client ID 是应用级公开标识。应用维护者配置一次，普通用户只需授权自己的账号；不应让每个普通用户都注册开发者应用。当前本地开发构建保留配置入口，正式分发可以预置经验证的公开 Client ID。平台审核、访问权限及收费以控制台为准，不承诺身份查询免费可用。当前回调用于本地开发验证；正式多平台分发前需确认 X 对生产回调的要求。

## 保存和清除

- 默认：令牌仅由桌面主进程在运行期间持有，关闭应用后不恢复。JS 内存回收不保证物理内存或系统交换区的逐字节擦除。
- 可选“记住授权”：使用 Electron safeStorage 系统加密，在用户应用数据目录的 `accounts/x-identity.enc` 保存密文。系统加密不可用时拒绝长期保存，不退回明文。
- 登录前勾选长期保存时申请 `offline.access`，允许刷新令牌；临时登录后才勾选保存，不会补发离线权限，到期仍可能需要重新授权。
- 取消勾选会删除保存文件，当前内存会话保持到退出。
- 退出并清除立即删除本地授权，并尽力调用 X 撤销接口；网络失败会明确提示，到 X 的“已连接应用”可手动撤销。
- 从密文恢复的会话显示“待验证”，点击“检查身份”后才会显示“已连接”。
- 清除拾影授权不等于退出浏览器里的 X 登录。公开 Client ID 配置会保留。

X 的 `/2/users/me` 要求 `users.read` 和 `tweet.read`；本功能只调用身份接口，不调用推文读取或写入接口。长期保存另加 `offline.access`。应用只接收授权代码，不收集 X 密码或浏览器 Cookie。

## 验证范围

`npm test` 包含回调 state 校验、PKCE、内存会话、加密保存/恢复、取消竞争、远端撤销失败仍清除本地会话、敏感错误隐藏等模拟测试。测试加密适配器使用 AES-GCM，不等于已验证每个系统的 safeStorage 或真实 X 服务。Windows 及实际 X 授权需分别验证。

官方参考：
- https://docs.x.com/fundamentals/developer-apps
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping
- https://www.electronjs.org/docs/latest/api/safe-storage
