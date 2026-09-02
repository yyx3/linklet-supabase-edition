import { Client } from 'pg';

/**
 * 获取 Hyperdrive 数据库连接
 * @param {Object} env - Cloudflare 环境变量
 * @returns {Promise<Client>} pg 客户端
 */
export async function getConnection(env) {
  // Hyperdrive 绑定的 CONNECTION_POOL_ID
  // 在 wrangler.toml 中配置后，通过 env.HYPERDRIVE 访问
  if (!env.HYPERDRIVE) {
    throw new Error('HYPERDRIVE binding not found. Please configure Hyperdrive in wrangler.toml');
  }

  // 使用 env.HYPERDRIVE.connectionString 初始化 pg client
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
  });
  
  await client.connect();
  return client;
}

/**
 * 执行 SQL 查询
 * @param {Client} client - pg 客户端
 * @param {string} queryStr - SQL 查询字符串
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
export async function executeQuery(client, queryStr, params = []) {
  try {
    const result = await client.query(queryStr, params);
    // pg 库返回的对象中，rows 属性包含了查询结果的数组
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * 执行 SQL 查询并返回第一条记录
 * @param {Client} client - pg 客户端
 * @param {string} queryStr - SQL 查询字符串
 * @param {Array} params - 查询参数
 * @returns {Promise<Object>} 单条查询结果
 */
export async function executeQueryOne(client, queryStr, params = []) {
  const result = await executeQuery(client, queryStr, params);
  return result[0] || null;
}

