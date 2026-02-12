import { getDb } from '../../lib/mongodb';
import { generateSentimentReport } from '../../lib/summarizer';

export default async function handler(req, res) {
  const { appid, refresh = 'false' } = req.query;
  
  if (!appid) {
    return res.status(400).json({ error: 'Missing appid' });
  }
  
  try {
    const db = await getDb();
    const appidNum = parseInt(appid);
    
    // 1. 妫€鏌ユ槸鍚︽湁缂撳瓨鐨勬姤鍛婏紙1灏忔椂鍐咃級
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cachedReport = await db.collection('sentiment_reports')
      .findOne({ 
        appid: appidNum,
        updatedAt: { $gte: oneHourAgo }
      });
    
    // 濡傛灉涓嶆槸寮哄埗鍒锋柊锛屼笖缂撳瓨瀛樺湪锛岀洿鎺ヨ繑鍥炵紦瀛?
    if (refresh !== 'true' && cachedReport) {
      console.log(`Returning cached report for appid ${appidNum}`);
      return res.status(200).json({
        success: true,
        report: cachedReport,
        cached: true
      });
    }
    
    // 2. 鑾峰彇鏈€鏂拌瘎璁?
    const reviews = await db.collection('reviews')
      .find({ appid: appidNum })
      .sort({ date: -1 })
      .limit(100)
      .toArray();
    
    // 3. 鑾峰彇鍘嗗彶缁熻锛堢敤浜庡姣旓級
    const previousStats = await db.collection('daily_stats')
      .find({ appid: appidNum })
      .sort({ date: -1 })
      .skip(1)
      .limit(1)
      .toArray();
    
    const previous = previousStats[0] || null;
    
    // 4. 鐢熸垚鑸嗘儏鎶ュ憡锛堟敮鎸丄I鏅鸿兘鍒嗘瀽锛?
    console.log(`Generating new AI report for appid ${appidNum}...`);
    const report = await generateSentimentReport(reviews, previous);
    
    // 5. 淇濆瓨鎶ュ憡鍒版暟鎹簱
    await db.collection('sentiment_reports').updateOne(
      { appid: appidNum },
      { 
        $set: {
          ...report,
          appid: appidNum,
          reviewCount: reviews.length
        }
      },
      { upsert: true }
    );
    
    // 6. 鍙繚鐣欐渶杩?30 澶╃殑鎶ュ憡
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.collection('sentiment_reports').deleteMany({
      appid: appidNum,
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      report,
      cached: false
    });
    
  } catch (error) {
    console.error('Report API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
