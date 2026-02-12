import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  const db = await getDb();
  const collection = db.collection('games');
  
  try {
    switch (req.method) {
      case 'GET':
        // 获取所有游戏
        const games = await collection.find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, games });
        break;
        
      case 'POST':
        // 添加游戏
        const { appid, name } = req.body;
        
        if (!appid || !name) {
          return res.status(400).json({ error: 'Missing appid or name' });
        }
        
        // 检查是否已存在
        const exists = await collection.findOne({ appid: parseInt(appid) });
        if (exists) {
          return res.status(409).json({ error: 'Game already exists' });
        }
        
        // 检查数量限制（免费版最多 5 款）
        const count = await collection.countDocuments();
        if (count >= 5) {
          return res.status(403).json({ error: 'Free tier limited to 5 games' });
        }
        
        const newGame = {
          appid: parseInt(appid),
          name,
          enabled: true,
          createdAt: new Date()
        };
        
        await collection.insertOne(newGame);
        res.status(201).json({ success: true, game: newGame });
        break;
        
      case 'DELETE':
        // 删除游戏
        const { id } = req.query;
        await collection.deleteOne({ appid: parseInt(id) });
        
        // 同时删除相关评论
        await db.collection('reviews').deleteMany({ appid: parseInt(id) });
        await db.collection('daily_stats').deleteMany({ appid: parseInt(id) });
        
        res.status(200).json({ success: true });
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
