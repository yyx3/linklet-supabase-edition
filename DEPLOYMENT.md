# Hyperdrive 部署详细指南

## 一、配置流程

### 1. Supabase 项目设置

#### 获取连接信息

1. 登录 [Supabase](https://supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **Database**
4. 记下以下信息：
   - **Host**: `xxx.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (你的项目密码)

### 2. 创建 Hyperdrive 配置

#### 在 Cloudflare Dashboard 中

1. 进入 **Workers & Pages**
2. 选择 **Hyperdrive**
3. 点击 **Create a Hyperdrive Config**
4. 填写数据库信息：
   ```
   Name: linklet-supabase
   Database: postgres
   Host: xxx.supabase.co
   Port: 5432
   Username: postgres
   Password: your-project-password
   Database Name: postgres
   ```
5. 点击 **Create Hyperdrive**
6. 复制配置 ID（如 `abcd1234...`）

#### 或使用 Wrangler CLI

```bash
# 安装最新 wrangler
npm install -D wrangler@latest

# 创建 Hyperdrive 配置
wrangler hyperdrive create linklet-supabase \
  --host=xxx.supabase.co \
  --database=postgres \
  --port=5432 \
  --user=postgres \
  --password=your-project-password
```

### 3. 配置 wrangler.toml

添加 Hyperdrive 绑定：

```toml
name = "linklet-supabase-edition"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Hyperdrive 绑定
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-config-id"  # 从上面复制
```

### 4. 初始化数据库

执行 `db/schema.sql` 创建表和索引：

#### 方法 A：Supabase Dashboard

1. 进入项目的 **SQL Editor**
2. 创建新查询
3. 粘贴 `db/schema.sql` 的内容
4. 执行

#### 方法 B：使用 psql CLI

```bash
psql -h xxx.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f db/schema.sql
```

#### 方法 C：使用 Supabase CLI

```bash
npm install -g supabase

supabase db push --db-url postgresql://postgres:password@xxx.supabase.co:5432/postgres
```

### 5. 本地测试

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 输出应该显示：
# ⛅ wrangler 3.26.0
# ▲ [wrangler:inf] Ready on http://localhost:8787
```

测试创建短链：

```bash
curl -X POST http://localhost:8787/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'

# 预期响应：
# {"slug":"abc123","link":"http://localhost:8787/abc123"}
```

### 6. 部署到生产

```bash
# 登录 Cloudflare
wrangler login

# 部署
npm run deploy

# 输出应该显示：
# ✨ Deployed successfully!
# URL: https://linklet-supabase-edition.{username}.workers.dev
```

---

## 二、连接工作原理

### Hyperdrive 连接池

Hyperdrive 为你的 Workers 提供了：

1. **连接池管理**：自动管理最多 25 个连接
2. **TCP 重用**：降低延迟
3. **查询缓存**：可选的结果缓存
4. **监控**：连接性能指标

### Workers 中的使用

```javascript
// 在 src/db/connection.js
import { sql } from 'postgres';

export async function getConnection(env) {
  // env.HYPERDRIVE 是 Hyperdrive 数据库客户端
  // 它自动处理连接池、重试等
  return env.HYPERDRIVE.connect();
}

// 执行查询
const client = await getConnection(env);
const result = await client.query(
  'SELECT * FROM links WHERE slug = $1',
  ['abc123']
);
```

---

## 三、Hyperdrive vs 其他方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Hyperdrive** | 内置连接池、自动故障转移、低延迟 | 需要 Workers 付费版 |
| **直连 Supabase** | 简单，无额外配置 | 每个 Worker 创建新连接，性能差 |
| **Supabase SDK** | 官方支持 | 不适合 Workers（无 Node.js） |
| **Cloudflare D1** | 内置数据库 | SQLite 性能有限 |

---

## 四、监控和性能优化

### 1. 监控 Hyperdrive 性能

在 Cloudflare Dashboard 中：

1. **Workers** > **Hyperdrive** > 选择配置
2. 查看指标：
   - 连接数
   - 查询延迟
   - 错误率

### 2. 查看 Workers 日志

```bash
# 实时日志
wrangler tail

# 或访问 Dashboard > Workers > Logs
```

### 3. 优化数据库查询

```javascript
// ❌ 多次查询
for (const slug of slugs) {
  const result = await client.query('SELECT * FROM links WHERE slug = $1', [slug]);
}

// ✅ 批量查询
const result = await client.query(
  'SELECT * FROM links WHERE slug = ANY($1)',
  [slugs]
);
```

### 4. 缓存策略

```javascript
// 使用 Workers KV 缓存
const cached = await KV.get(`link:${slug}`);
if (cached) {
  return Response.redirect(cached, 302);
}

// 查询数据库并缓存
const result = await db.query('SELECT url FROM links WHERE slug = $1', [slug]);
await KV.put(`link:${slug}`, result.url, { expirationTtl: 3600 });
```

---

## 五、常见问题

### Q: Hyperdrive 有免费版本吗？
A: Hyperdrive 本身免费，但需要 Workers 付费版本（$25/月）才能使用。

### Q: 支持多少个并发连接？
A: 标准限制是 25 个连接。升级 Workers 付费版可以增加。

### Q: 可以使用多个 Hyperdrive 配置吗？
A: 可以。在 `wrangler.toml` 中添加多个 `[[hyperdrive]]` 配置。

### Q: 如何处理连接超时？
A: Hyperdrive 自动处理。如果仍有问题，检查 Supabase 防火墙设置。

### Q: 数据在传输中加密吗？
A: 是的。Workers 到 Hyperdrive 再到 Supabase 的所有连接都是加密的（TLS）。

---

## 六、迁移和备份

### 备份 Supabase 数据

1. 自动备份（每 7 天一次）
2. 手动备份：

```bash
# 使用 pg_dump
pg_dump -h xxx.supabase.co \
        -U postgres \
        -d postgres \
        -f backup.sql
```

### 恢复备份

```bash
psql -h xxx.supabase.co \
     -U postgres \
     -d postgres \
     -f backup.sql
```

---

## 七、成本优化

### 选项 1：免费开发

- Cloudflare Workers 免费版（100k req/月）
- Supabase 免费版（500MB）
- **年成本**：~$100（域名）

### 选项 2：标准生产

- Cloudflare Workers 付费版（$25/月）
- Supabase 付费版（$25/月）
- **年成本**：~$700

### 选项 3：高级生产

- Cloudflare Workers 付费版 + 额外容量
- Supabase 付费版 + 更多存储
- **年成本**：$1,000+

---

**需要帮助？查看 [README.md](./README.md) 或提交 Issue。**
