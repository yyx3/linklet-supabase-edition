import { handleCreate } from './routes/create';
import { handleRedirect } from './routes/redirect';
import { handleCors } from './middleware/cors';
import { getConnection } from './db/connection';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    const context = { request, env, url, ctx };

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
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Linklet - URL 缩短器</title>
    <style>
      :root {
        --color-primary: #5c7cfa;
        --color-primary-dark: #4263eb;
        --color-primary-alpha: #5c7cfa50;
        --body-color: #495057;
        --body-bg: #f8f9fa;
        --border-color: #dee2e6;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        max-width: 30rem;
        margin: 0 auto;
        padding: 2rem;
        color: var(--body-color);
        background: var(--body-bg);
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
      }

      h1 {
        font-size: 3rem;
        font-weight: 300;
        text-align: center;
        opacity: 0.2;
        margin-bottom: 2rem;
      }

      input, button {
        -webkit-appearance: none;
        appearance: none;
        display: block;
        width: 100%;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 0.25rem;
        box-sizing: border-box;
        color: #33404d;
        line-height: inherit;
        font-size: 1rem;
      }

      input {
        margin-bottom: 1rem;
      }

      input:focus {
        box-shadow: 0 0 0 0.25rem var(--color-primary-alpha);
        border-color: var(--color-primary);
        outline: 0;
      }

      button {
        background-color: var(--color-primary);
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 500;
        margin-bottom: 1rem;
      }

      button:hover {
        background-color: var(--color-primary-dark);
      }

      .result {
        margin-top: 2rem;
        padding: 1rem;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 0.25rem;
        display: none;
      }

      .result.show {
        display: block;
      }

      .result-url {
        word-break: break-all;
        padding: 0.5rem;
        background: #f0f0f0;
        border-radius: 0.25rem;
        margin: 0.5rem 0;
        font-family: monospace;
      }

      .copy-btn {
        background-color: #28a745;
      }

      .copy-btn:hover {
        background-color: #218838;
      }

      .error {
        color: #dc3545;
      }
    </style>
  </head>
  <body>
    <h1>Linklet</h1>

    <form id="shortenerForm">
      <input
        type="url"
        id="urlInput"
        placeholder="粘贴长链接 (Paste your long URL)"
        required
      />
      <input
        type="text"
        id="slugInput"
        placeholder="自定义短链(可选) (Custom slug - optional)"
      />
      <button type="submit">生成短链 (Shorten)</button>
    </form>

    <div id="loading" style="display:none;text-align:center">
      <p>正在生成... (Processing...)</p>
    </div>

    <div id="result" class="result">
      <p>✅ 短链生成成功</p>
      <p>短链:</p>
      <div class="result-url" id="resultUrl"></div>
      <button type="button" class="copy-btn" id="copyBtn">复制 (Copy)</button>
      <div id="errorMsg" class="error"></div>
    </div>

    <script>
      const form = document.getElementById('shortenerForm');
      const urlInput = document.getElementById('urlInput');
      const slugInput = document.getElementById('slugInput');
      const loading = document.getElementById('loading');
      const result = document.getElementById('result');
      const resultUrl = document.getElementById('resultUrl');
      const copyBtn = document.getElementById('copyBtn');
      const errorMsg = document.getElementById('errorMsg');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = '';
        result.classList.remove('show');
        loading.style.display = 'block';

        try {
          const response = await fetch('/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: urlInput.value,
              slug: slugInput.value || undefined,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || data.message || '生成失败');
          }

          resultUrl.textContent = data.link;
          result.classList.add('show');
          urlInput.value = '';
          slugInput.value = '';
        } catch (error) {
          errorMsg.textContent = '❌ ' + error.message;
          result.classList.add('show');
        } finally {
          loading.style.display = 'none';
        }
      });

      copyBtn.addEventListener('click', () => {
        const text = resultUrl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '已复制 (Copied!)';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 2000);
        });
      });
    </script>
  </body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}
