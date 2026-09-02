/**
 * @api {post} /create Create a new short link
 */

import { validateURL, validateSlug, generateRandomString } from '../utils/validators';
import { getCorsHeaders } from '../middleware/cors';

export async function handleCreate(context) {
  const { request, supabase, url: originUrl } = context;

  try {
    const { url, slug } = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const origin = `${originUrl.protocol}//${originUrl.hostname}`;
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

    // 检查 URL 是否已存在
    if (!slug) {
      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('url', url)
        .eq('status', 1)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ slug: existing.slug, link: `${origin}/${existing.slug}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 检查自定义 slug 是否已存在
    if (slug) {
      const { data: existing } = await supabase
        .from('links')
        .select('url')
        .eq('slug', slug)
        .single();

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
    const { data, error } = await supabase
      .from('links')
      .insert([
        {
          url,
          slug: finalSlug,
          ip: clientIP,
          ua: userAgent,
          status: 1,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create short link', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
