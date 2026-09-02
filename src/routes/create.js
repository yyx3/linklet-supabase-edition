/**
 * @api {post} /create Create a new short link
 */

import { validateURL, validateSlug, generateRandomString } from '../utils/validators';
import { getCorsHeaders } from '../middleware/cors';
import { getConnection, executeQueryOne, executeQuery } from '../db/connection';

export async function handleCreate(context) {
  const { request, env, url: originUrl } = context;

  try {
    const { url, slug } = await request.json();
    const corsHeaders = getCorsHeaders();

    // 参数验证
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateURL(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (slug && !validateSlug(slug)) {
      return new Response(
        JSON.stringify({ error: 'Invalid slug format. Length must be 2-10, no file extensions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyUrl = new URL(url);
    if (bodyUrl.hostname === originUrl.hostname) {
      return new Response(
        JSON.stringify({ error: 'Cannot shorten links to the same domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取数据库连接
    const client = await getConnection(env);
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const origin = `${originUrl.protocol}//${originUrl.hostname}`;

    // 检查 URL 是否已存在
    if (!slug) {
      const existing = await executeQueryOne(
        client,
        'SELECT slug FROM links WHERE url = $1 AND status = 1 LIMIT 1',
        [url]
      );

      if (existing) {
        return new Response(
          JSON.stringify({ slug: existing.slug, link: `${origin}/${existing.slug}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 检查自定义 slug 是否已存在
    if (slug) {
      const existing = await executeQueryOne(
        client,
        'SELECT url FROM links WHERE slug = $1 LIMIT 1',
        [slug]
      );

      if (existing) {
        if (existing.url === url) {
          return new Response(
            JSON.stringify({ slug, link: `${origin}/${slug}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: 'Slug already exists' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 生成最终的 slug
    const finalSlug = slug || generateRandomString(4);

    // 插入数据库
    const result = await executeQuery(
      client,
      `INSERT INTO links (url, slug, ip, ua, status, create_time) 
       VALUES ($1, $2, $3, $4, 1, NOW()) 
       RETURNING id, slug`,
      [url, finalSlug, clientIP, userAgent]
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to insert link');
    }

    return new Response(
      JSON.stringify({ slug: finalSlug, link: `${origin}/${finalSlug}` }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
