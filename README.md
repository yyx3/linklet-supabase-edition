# Linklet - Supabase Edition with Hyperdrive

一个使用 **Cloudflare Workers** + **Supabase PostgreSQL** (via **Hyperdrive**) 创建的 URL 缩短器。

## 🚀 核心改进

相比原始的 D1 版本，本版本提供了以下改进：

### 安全性
- ✅ **防止 SQL 注入**：使用参数化查询替代字符串拼接
- ✅ **CORS 安全**：正确的跨域资源共享配置
- ✅ **输入验证**：严格的 URL 和 slug 格式验证

### 性能
- ✅ **PostgreSQL**：比 SQLite 更强大和可靠
- ✅ **数据库索引**：优化查询性能
- ✅ **Hyperdrive 连接池**：自动管理数据库连接
- ✅ **异步日志**：不阻止重定向响应

### 功能
- ✅ **随机 slug**：4 字符随机生成
- ✅ **自定义 slug**：支持指定短链名称
- ✅ **访问统计**：记录访问日志和来源
- ✅ **灵活扩展**：支持链接过期、点击限制等

### 可维护性
- ✅ **模块化代码**：清晰的目录结构
- ✅ **完善文档**：API 文档和部署指南

---

## 📋 前置要求

- Node.js 18+
- Cloudflare 账户
- Supabase 账户（免费）

---

## 🛠️ 快速开始

### Step 1: 克隆项目

```bash
git clone https://github.com/yyx3/linklet-supabase-edition.git
cd linklet-supabase-edition
npm install
```

### Step 2: 创建 Supabase 项目

1. 前往 [Supabase](https://supabase.com) 创建账户
2. 创建新项目
3. 在 SQL Editor 中执行 `db/schema.sql` 初始化数据库

### Step 3: 配置 Hyperdrive

在 Cloudflare Dashboard 中：

1. 进入 **Workers & Pages**
2. 选择 **Hyperdrive**
3. 创建新的 Hyperdrive 配置
4. 连接到你的 Supabase 数据库
   - 数据库类型：PostgreSQL
   - 主机：`xxx.supabase.co`
   - 端口：`5432`
   - 数据库名：`postgres`
   - 用户名：`postgres`
   - 密码：（Supabase 项目密码）

### Step 4: 配置 Wrangler

编辑 `wrangler.toml`，添加 Hyperdrive 绑定：

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-config-id"
```

在 Cloudflare Dashboard 中获取 `id`。

### Step 5: 部署

```bash
# 开发模式
npm run dev

# 生产部署
npm run deploy
```

访问 `https://your-worker.cloudflare.workers.dev` 或你配置的自定义域名。

---

## 📚 API 文档

### 创建短链接

**请求：**

```http
POST /create HTTP/1.1
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "slug": "mycustom"  // 可选
}
```

**成功响应 (201)：**

```json
{
  "slug": "abc123",
  "link": "https://your-domain.com/abc123"
}
```

**错误响应 (400/409)：**

```json
{
  "error": "Invalid URL format"
}
```

### 访问短链接

```http
GET /abc123 HTTP/1.1

<!-- 响应：302 重定向到原始 URL -->
```

---

## 📊 数据库结构

### links 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| url | TEXT | 原始 URL |
| slug | TEXT | 短链标识（唯一） |
| ip | TEXT | 创建者 IP |
| ua | TEXT | 创建者 User-Agent |
| status | INTEGER | 状态 (1=活跃, 0=禁用) |
| create_time | TIMESTAMP | 创建时间 |
| click_count | INTEGER | 点击次数 |
| expires_at | TIMESTAMP | 过期时间（可选） |

### logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| url | TEXT | 原始 URL |
| slug | TEXT | 短链标识 |
| ip | TEXT | 访问者 IP |
| ua | TEXT | 访问者 User-Agent |
| referer | TEXT | 来源页面 |
| create_time | TIMESTAMP | 访问时间 |

---

## 🔒 安全特性

### SQL 注入防护

所有数据库查询都使用参数化方法：

```javascript
// ✅ 安全
const result = await client.query(
  'SELECT * FROM links WHERE slug = $1',
  [slug]
);

// ❌ 不安全（原版本的问题）
const result = await db.prepare(
  `SELECT * FROM links WHERE slug = '${slug}'`
);
```

### CORS 策略

允许所有来源的跨域请求，这是短链服务的标准做法。

### 行级别安全 (RLS)

Supabase 提供内置的 RLS 支持，可根据需要在 Dashboard 中配置。

---

## 🚀 部署到生产环境

### 自定义域名

1. 在 Cloudflare DNS 中添加 CNAME 记录
2. 在 Workers 中配置路由
3. 测试重定向

### 监控和日志

```bash
# 实时查看 Workers 日志
npx wrangler tail
```

Supabase Dashboard 提供数据库性能监控。

---

## 💡 性能优化建议

1. **启用 Cloudflare 缓存**
   - 将 HTML 主页缓存 1 小时
   - 将 404 页面缓存 10 分钟

2. **使用 Workers KV 缓存热门链接**
   ```javascript
   const cached = await KV.get(`link:${slug}`);
   ```

3. **监控数据库连接池**
   - Hyperdrive 自动管理连接（最多 25 个）
   - 避免长时间连接

4. **优化查询**
   - 使用提供的索引
   - 避免 N+1 查询问题

---

## 🆘 故障排查

### 无法连接 Supabase

1. 检查 Hyperdrive 配置是否正确
2. 验证数据库凭证
3. 检查 Supabase 项目是否正在运行

```bash
npx wrangler tail --format pretty
```

### Slug 重复冲突

确保 `slug` 列有 UNIQUE 约束：

```sql
ALTER TABLE links ADD CONSTRAINT unique_slug UNIQUE(slug);
```

### 重定向速度慢

1. 检查 Hyperdrive 连接状态
2. 在 Supabase Dashboard 查看数据库性能
3. 考虑使用 KV 缓存

---

## 📈 成本估算

| 服务 | 免费层 | 付费层 |
|------|--------|--------|
| **Cloudflare Workers** | 100,000 req/月 | $0.50 / 10M requests |
| **Hyperdrive** | 免费 | 已包含在 Workers 付费中 |
| **Supabase** | 500MB + 1GB 带宽 | $25/月起 |
| **域名** | - | $8-15/年 |

**小型项目总成本**：~$100-150/年

---

## 🔄 数据迁移

如果从原始 D1 版本迁移数据：

```bash
# 1. 导出 D1 数据
wrangler d1 execute short --local --file=export.sql

# 2. 在 Supabase 中导入
# 使用 Supabase SQL Editor 或 CLI
```

---

## 📄 License

MIT License - 详见 LICENSE 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📞 获取帮助

- 📖 [Hyperdrive 文档](https://developers.cloudflare.com/hyperdrive/)
- 📖 [Supabase 文档](https://supabase.com/docs)
- 📖 [Workers 文档](https://developers.cloudflare.com/workers/)
- 🐛 [提交 Issue](https://github.com/yyx3/linklet-supabase-edition/issues)

---

**Made with ❤️ by yyx3**
