-- Supabase PostgreSQL Schema for Linklet
-- 使用 Cloudflare Hyperdrive 连接

-- 创建 links 表
CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ip TEXT,
  ua TEXT,
  status INTEGER DEFAULT 1,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  click_count INTEGER DEFAULT 0
);

-- 创建 logs 表
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  url TEXT,
  slug TEXT,
  ip TEXT,
  ua TEXT,
  referer TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_url ON links(url);
CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_slug ON logs(slug);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- 创建视图：链接统计
CREATE OR REPLACE VIEW link_stats AS
SELECT
  l.id,
  l.slug,
  l.url,
  l.create_time,
  COUNT(lg.id) as total_clicks,
  COUNT(DISTINCT lg.ip) as unique_visitors,
  MAX(lg.create_time) as last_clicked
FROM links l
LEFT JOIN logs lg ON l.slug = lg.slug
WHERE l.status = 1
GROUP BY l.id, l.slug, l.url, l.create_time;
