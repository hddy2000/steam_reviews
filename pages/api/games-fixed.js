// 修复版 - 游戏管理 API，添加 CORS 支持
import { getDb } from '../../lib/mongodb';

// CORS 中间件
function corsMiddleware(handler) {
  return async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    return handler(req, res);
  };
}

async function handler(req, res) {
  try {
    const db = await getDb();
    const collection = db.collection('games');
    
    console.log('API /games called:', req.method);
    
    switch (req.method) {
      case 'GET':
        const games = await collection.find({}).sort({ createdAt: -1 }).toArray();
        console.log('Found games:', games.length);
        return res.status(200).json({ success: true, games });
        
      case 'POST': {
        const { appid, name } = req.body || {};
        
        console.log('Adding game:', appid, name);
        
        if (!appid || !name) {
          return res.status(400).json({ error: 'Missing appid or name' });
        }
        
        const appidNum = parseInt(appid);
        
        // 检查是否已存在
        const exists = await collection.findOne({ appid: appidNum });
        if (exists) {
          return res.status(409).json({ error: 'Game already exists' });
        }
        
        // 检查数量限制（免费版最多 5 款）
        const count = await collection.countDocuments();
        if (count >= 5) {
          return res.status(403).json({ error: 'Free tier limited to 5 games' });
        }
        
        const newGame = {
          appid: appidNum,
          name: name.trim(),
          enabled: true,
          createdAt: new Date()
        };
        
        await collection.insertOne(newGame);
        console.log('Game added:', newGame);
        
        return res.status(201).json({ success: true, game: newGame });
      }
        
      case 'DELETE': {
        const { id } = req.query;
        const idNum = parseInt(id);
        
        console.log('Deleting game:', idNum);
        
        await collection.deleteOne({ appid: idNum });
        
        // 同时删除相关评论
        await db.collection('reviews').deleteMany({ appid: idNum });
        await db.collection('daily_stats').deleteMany({ appid: idNum });
        
        return res.status(200).json({ success: true });
      }
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}

export default corsMiddleware(handler);
