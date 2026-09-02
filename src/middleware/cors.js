/**
 * CORS 中间件
 */

export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: getCorsHeaders(),
    });
  }
  return null;
}
