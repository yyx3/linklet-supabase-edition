/**
 * @api {get} /:slug Redirect to original URL
 */

import notFoundHTML from '../public/404.html';

export async function handleRedirect(context) {
  const { request, supabase, url } = context;

  try {
    const slug = url.pathname.slice(1); // 移除前导 /
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';

    // 使用参数化查询防止 SQL 注入
    const { data: linkData, error } = await supabase
      .from('links')
      .select('url, id')
      .eq('slug', slug)
      .eq('status', 1)
      .single();

    if (error || !linkData) {
      return new Response(notFoundHTML, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    // 异步记录访问日志（不阻塞重定向）
    supabase
      .from('logs')
      .insert([
        {
          link_id: linkData.id,
          url: linkData.url,
          slug,
          ip: clientIP,
          ua: userAgent,
          referer,
          created_at: new Date().toISOString(),
        },
      ])
      .catch((err) => console.error('Log error:', err));

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
