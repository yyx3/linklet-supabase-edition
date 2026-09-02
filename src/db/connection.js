import { sql } from 'postgres';

/**
 * 获取 Hyperdrive 数据库连接
 * @param {Object} env - Cloudflare 环境变量
 * @returns {Object} postgres 客户端
 */
export async function getConnection(env) {
  // Hyperdrive 绑定的 CONNECTION_POOL_ID
  // 在 wrangler.toml 中配置后，通过 env.HYPERDRIVE 访问
  if (!env.HYPERDRIVE) {
    throw new Error('HYPERDRIVE binding not found. Please configure Hyperdrive in wrangler.toml');
  }

  // 使用 env.HYPERDRIVE 获取数据库连接字符串
  // 或者直接使用 env.HYPERDRIVE 作为连接对象
  const client = env.HYPERDRIVE.connect();
  return client;
}

/**
 * 执行 SQL 查询
 * @param {Object} client - postgres 客户端
 * @param {string} queryStr - SQL 查询字符串
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
export async function executeQuery(client, queryStr, params = []) {
  try {
    const result = await client.query(queryStr, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * 执行 SQL 查询并返回第一条记录
 * @param {Object} client - postgres 客户端
 * @param {string} queryStr - SQL 查询字符串
 * @param {Array} params - 查询参数
 * @returns {Promise<Object>} 单条查询结果
 */
export async function executeQueryOne(client, queryStr, params = []) {
  const result = await executeQuery(client, queryStr, params);
  return result[0] || null;
}
