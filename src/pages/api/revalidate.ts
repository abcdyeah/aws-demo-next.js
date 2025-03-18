import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 检查是否为POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 检查秘钥（在实际应用中应使用更安全的验证方法）
  const { secret, path } = req.body;

  if (secret !== process.env.REVALIDATION_SECRET) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    // 重新验证指定路径
    await res.revalidate(path);
    return res.json({ revalidated: true });
  } catch (err) {
    // 如果有错误，返回错误信息
    return res.status(500).send('Error revalidating');
  }
}
