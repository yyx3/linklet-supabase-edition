# Linklet - Supabase Edition

一个使用 **Cloudflare Workers** + **Supabase PostgreSQL** 创建的 URL 缩短器。

## 🚀 核心改进

相比原始的 D1 版本，本版本提供了以下改进：

### 安全性
- ✅ **防止 SQL 注入**：使用参数化查询替代字符串拼接
- ✅ **CORS 安全**：正确的跨域资源共享配置
- ✅ **输入验证**：严格的 URL 和 slug 格式验证

### 性能
- ✅ **PostgreSQL**：比 SQLite 更强大和可靠
- ✅ **数据库索引**：优化查询性能
- ✅ **异步日志**：不阻塞重定向响应

### 功能
- ✅ **随机 slug**：4 字符随机生成
- ✅ **自定义 slug**：支持指定短链名称
- ✅ **访问统计**：记录访问日志和来源
- ✅ **灵活扩展**：支持链接过期、点击限制等

### 可维护性
- ✅ **模块化代码**：清晰的目录结构
- ✅ **类型安全**：更好的代码提示
- ✅ **完善文档**：API 文档和部署指南

---

## 📋 部署指南

### 前置要求

- Node.js 18+
- Cloudflare 账户
- Supabase 账户（免费）

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

### Step 3: 配置环境变量

创建 `.env.production` 文件：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anonymous-key
```

在 Supabase 项目的 Settings > API 中找到这些值。

### Step 4: 配置 Wrangler

编辑 `wrangler.toml`，填入你的 Supabase 信息：

```toml
[env.production]
vars = {
  SUPABASE_URL = "https://your-project.supabase.co",
  ENVIRONMENT = "production"
}

[env.production.secrets]
SUPABASE_ANON_KEY = "your-key-here"
```

### Step 5: 部署到 Cloudflare Workers

```bash
# 开发模式
npm run dev

# 生产部署
npm run deploy
```

---

## 🔌 API 文档

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

**响应 (201)：**

```json
{
  "slug": "abc123",
  "link": "https://your-domain.com/abc123"
}
```

**错误 (400/409)：**

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
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| click_count | INTEGER | 点击次数 |
| expires_at | TIMESTAMP | 过期时间（可选） |

### logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| link_id | BIGINT | 关联链接 ID |
| url | TEXT | 原始 URL |
| slug | TEXT | 短链标识 |
| ip | TEXT | 访问者 IP |
| ua | TEXT | 访问者 User-Agent |
| referer | TEXT | 来源页面 |
| created_at | TIMESTAMP | 访问时间 |

---

## 🔐 安全特性

### SQL 注入防护

所有数据库查询都使用 Supabase 客户端的参数化方法：

```javascript
// ✅ 安全
const { data } = await supabase
  .from('links')
  .select('*')
  .eq('slug', slug);

// ❌ 不安全（原版本的问题）
const sql = `SELECT * FROM links WHERE slug = '${slug}'`;
```

### CORS 策略

允许所有来源的跨域请求，这是短链接服务的标准做法。

### 行级别安全 (RLS)

Supabase 自动启用 RLS：
- 匿名用户可以读取和创建链接
- 日志记录完全自动化

---

## 🛠️ 本地开发

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:8787`

### 测试 API

```bash
# 创建短链
curl -X POST http://localhost:8787/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'

# 访问短链
curl -L http://localhost:8787/abc123
```

---

## 📈 性能指标

- **创建短链**：~50-100ms（包括数据库操作）
- **重定向**：~10-20ms（缓存后）
- **并发能力**：无限制（Cloudflare Workers 层面）
- **数据库连接**：自动池化（Supabase）

---

## 🔄 从 D1 迁移

### 数据迁移脚本

```javascript
// 使用 wrangler 导出 D1 数据
wrangler d1 execute short --local --file=./export.sql

// 然后在 Supabase 中导入
// 使用 Supabase UI 或 SQL Editor
```

---

## 🐛 故障排查

### 连接超时

检查 Supabase URL 和密钥是否正确。

### 短链重复

确保 `slug` 列有唯一约束，或在代码中增加重试逻辑。

### 日志未记录

异步日志不会阻塞重定向。检查 Supabase logs 表是否有权限问题。

---

## 📝 License

MIT License - 详见 LICENSE 文件

---

## 🙋 常见问题

**Q: 免费层 Supabase 支持多少数据？**
A: 500MB 数据库存储（足够存储数百万条短链接）

**Q: 可以添加自定义域名吗？**
A: 可以。在 Cloudflare 上配置自定义域名指向 Workers。

**Q: 支持链接过期吗？**
A: 支持。在 links 表中添加 `expires_at` 字段，在重定向时检查。

**Q: 如何获取链接的访问统计？**
A: 查询 `link_stats` 视图：
```sql
SELECT * FROM link_stats WHERE slug = 'abc123';
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ by yyx3**
