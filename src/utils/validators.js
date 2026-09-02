/**
 * URL 和参数验证工具
 */

/**
 * 验证 URL 格式
 * @param {string} url
 * @returns {boolean}
 */
export function validateURL(url) {
  if (typeof url !== 'string') return false;
  if (url.length < 10 || url.length > 2048) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证 slug 格式
 * @param {string} slug
 * @returns {boolean}
 */
export function validateSlug(slug) {
  if (typeof slug !== 'string') return false;
  if (!/^[a-zA-Z0-9_-]{2,10}$/.test(slug)) return false;
  if (/\.[a-zA-Z0-9]+$/.test(slug)) return false;
  return true;
}

/**
 * 生成随机 slug
 * @param {number} length
 * @returns {string}
 */
export function generateRandomString(length = 4) {
  const characters = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
