-- Supabase PostgreSQL Schema for Linklet

-- 创建 links 表
CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ip TEXT,
  ua TEXT,
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  click_count INTEGER DEFAULT 0
);

-- 创建 logs 表
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT REFERENCES links(id) ON DELETE CASCADE,
  url TEXT,
  slug TEXT,
  ip TEXT,
  ua TEXT,
  referer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询性能
CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_url ON links(url);
CREATE INDEX idx_links_status ON links(status);
CREATE INDEX idx_links_created_at ON links(created_at);
CREATE INDEX idx_logs_slug ON logs(slug);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_link_id ON logs(link_id);

-- 创建视图：链接统计
CREATE OR REPLACE VIEW link_stats AS
SELECT
  l.id,
  l.slug,
  l.url,
  l.created_at,
  COUNT(lg.id) as total_clicks,
  COUNT(DISTINCT lg.ip) as unique_visitors,
  MAX(lg.created_at) as last_clicked
FROM links l
LEFT JOIN logs lg ON l.id = lg.link_id
WHERE l.status = 1
GROUP BY l.id, l.slug, l.url, l.created_at;

-- 启用 RLS（行级别安全）
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有人读取活跃链接
CREATE POLICY "Enable read access for all users" ON links
  FOR SELECT USING (status = 1);

CREATE POLICY "Enable read access for logs" ON logs
  FOR SELECT USING (true);

-- 创建策略：允许插入
CREATE POLICY "Enable insert access" ON links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert logs" ON logs
  FOR INSERT WITH CHECK (true);
