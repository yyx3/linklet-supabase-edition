import { createClient } from '@supabase/supabase-js';
import { handleCreate } from './routes/create';
import { handleRedirect } from './routes/redirect';
import { handleCors } from './middleware/cors';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // 创建 Supabase 客户端
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    const context = { request, env, supabase, url };

    try {
      if (url.pathname === '/create' && request.method === 'POST') {
        return await handleCreate(context);
      }

      if (url.pathname.match(/^\/[a-zA-Z0-9_-]+$/) && request.method === 'GET') {
        return await handleRedirect(context);
      }

      if (url.pathname === '/' || url.pathname === '') {
        return serveHTML();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

function serveHTML() {
  return new Response(require('./public/index.html'), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}
