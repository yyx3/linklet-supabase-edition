/**
 * @api {get} /:slug Redirect to original URL
 */

import { getConnection, executeQueryOne, executeQuery } from '../db/connection';

const notFoundHTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - 短链不存在</title>
    <style>
      body {
        max-width: 30rem;
        margin: 0 auto;
        padding: 2rem;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        background: #f8f9fa;
      }
      h1 { font-size: 4rem; margin: 1rem 0; }
      p { font-size: 1.2rem; margin: 1rem 0; }
      a { color: #5c7cfa; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>404</h1>
    <p>❌ 短链不存在或已过期</p>
    <p>The short link does not exist or has expired</p>
    <p><a href="/">返回首页 (Back to Home)</a></p>
  </body>
</html>`;

export async function handleRedirect(context) {
  const { request, env, url, ctx } = context;

  try {
    const slug = url.pathname.slice(1);
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';

    // 获取数据库连接
    const client = await getConnection(env);

    // 查询链接
    const linkData = await executeQueryOne(
      client,
      'SELECT id, url FROM links WHERE slug = $1 AND status = 1 LIMIT 1',
      [slug]
    );

    if (!linkData) {
      return new Response(notFoundHTML, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    // 异步记录访问日志（不阻止重定向）
    ctx?.waitUntil(
      executeQuery(
        client,
        `INSERT INTO logs (url, slug, ip, ua, referer, create_time) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [linkData.url, slug, clientIP, userAgent, referer]
      ).catch((err) => console.error('Log error:', err))
    );

    // 返回 302 重定向
    return Response.redirect(linkData.url, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response(notFoundHTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  }
}
