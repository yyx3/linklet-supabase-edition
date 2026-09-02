# 详细部署指南

## 一、完整部署流程

### 1. 环境准备

```bash
# 安装 Node.js 依赖
npm install

# 验证 Wrangler 版本
npx wrangler --version
```

### 2. Supabase 配置

#### A. 创建项目

1. 访问 [supabase.com](https://supabase.com)
2. 点击 "New Project"
3. 填写项目信息，选择你的地区
4. 等待项目初始化

#### B. 初始化数据库

在 Supabase 项目的 SQL Editor 中运行 `db/schema.sql`

```sql
-- 粘贴 schema.sql 的全部内容
-- 然后执行
```

#### C. 获取 API 密钥

1. 进入 Project Settings > API
2. 复制 `Project URL` 和 `anon public key`
3. 保存到安全位置

### 3. Cloudflare Workers 配置

#### A. 登录 Cloudflare

```bash
npx wrangler login
```

这将打开浏览器进行授权。

#### B. 创建/更新 wrangler.toml

确保文件中包含：

```toml
name = "linklet-supabase-edition"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = {
  SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co",
  ENVIRONMENT = "production"
}

[env.production.secrets]
SUPABASE_ANON_KEY = "your-anon-key"
```

#### C. 设置生产环境密钥

```bash
# 交互式添加密钥
npx wrangler secret put SUPABASE_ANON_KEY --env production

# 粘贴你的 Supabase 匿名密钥，然后按 Enter
```

### 4. 本地测试

```bash
# 启动本地开发服务器
npm run dev

# 应该看到类似输出：
# ⛅ wrangler 3.26.0
# ▲ [wrangler:inf] Ready on http://localhost:8787
```

测试创建短链：

```bash
curl -X POST http://localhost:8787/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'

# 应该返回：
# {"slug":"abc123","link":"http://localhost:8787/abc123"}
```

### 5. 部署到生产环境

```bash
# 部署到 Cloudflare Workers
npm run deploy

# 应该看到：
# ✨ Deployed successfully! URL: https://linklet-supabase-edition.{your-subdomain}.workers.dev
```

## 二、自定义域名配置

### 步骤 1：购买域名

在任何域名注册商购买域名（GoDaddy、Namecheap 等）

### 步骤 2：添加到 Cloudflare

1. 登录 Cloudflare Dashboard
2. 点击 "Add a site"
3. 输入你的域名
4. 按照提示修改 DNS 设置

### 步骤 3：配置 Workers 路由

1. 进入 Workers > Your Worker > Settings
2. 在 "Domains & Routes" 添加路由
3. 配置如下：

```
域名: yourdomain.com
路由: yourdomain.com/*
 Workers: linklet-supabase-edition
```

### 步骤 4：验证

```bash
# 测试自定义域名
curl https://yourdomain.com/

# 创建短链
curl -X POST https://yourdomain.com/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## 三、监控和日志

### 查看 Workers 日志

```bash
# 实时查看日志
npx wrangler tail
```

### Supabase 数据库监控

1. 进入 Supabase Dashboard
2. 点击 "Database" > "Logs"
3. 查看 SQL 执行日志

### 性能分析

Supabase 提供 "Performance" 标签页，可以查看：
- 查询执行时间
- 数据库大小
- 连接池状态

## 四、备份和恢复

### 自动备份

Supabase 免费计划每 7 天自动备份一次。

### 手动备份

在 Supabase 中：
1. 进入 Settings > Backups
2. 点击 "Create Backup"

### 恢复备份

1. 进入 Settings > Backups
2. 选择要恢复的备份
3. 点击 "Restore"

## 五、扩展和优化

### 添加认证

Supabase 内置 Supabase Auth：

```javascript
const { data: { user } } = await supabase.auth.getUser();
```

### 启用 Realtime

在 Supabase 中启用 Realtime，然后订阅表更改：

```javascript
supabase
  .channel('links')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'links' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

### 数据库扩容

如果超过免费层限制，升级 Supabase 计划：
1. 进入 Supabase Project Settings
2. 点击 "Billing" > "Upgrade"
3. 选择付费计划

## 六、故障排查

### 问题：无法连接 Supabase

**症状**：创建短链返回 500 错误

**解决**：
1. 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
2. 确保 Supabase 项目已启动
3. 检查 Workers 日志：`npx wrangler tail`

### 问题：Slug 重复冲突

**症状**：创建短链返回 409 Conflict

**解决**：
1. 确保 `slug` 列有 UNIQUE 约束
2. 增加重试逻辑或生成更长的 slug

### 问题：重定向速度慢

**症状**：访问短链耗时 > 1 秒

**解决**：
1. 在 Supabase 中添加数据库索引
2. 启用 Cloudflare 缓存
3. 考虑在 Workers KV 中缓存热门链接

### 问题：数据库连接池耗尽

**症状**：高并发下频繁超时

**解决**：
1. Supabase 自动管理连接池
2. 确保 Supabase 计划支持足够的连接数
3. 减少异步操作中的长连接

## 七、成本估算

### Cloudflare Workers
- **免费层**：每月 100,000 次请求
- **付费**：$0.50 per 10M requests

### Supabase
- **免费层**：500MB 数据库 + 1GB 带宽
- **付费**：从 $25/月 开始

### 域名
- **首年**：$8-15/年（取决于 TLD）
- **续费**：$10-15/年

## 八、性能优化建议

1. **启用 Cloudflare 缓存**
   - 将 HTML 主页缓存 1 小时
   - 将 404 页面缓存 10 分钟

2. **KV 缓存热门链接**
   - 使用 Cloudflare Workers KV 缓存常访问的链接

3. **数据库连接优化**
   - 使用连接池（Supabase 已内置）
   - 避免 N+1 查询问题

4. **监控指标**
   - 设置告警监控错误率
   - 监控 p95 响应时间

---

**需要帮助？查看 [README.md](./README.md) 或提交 Issue。**
