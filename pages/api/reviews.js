import { getDb } from '../../lib/mongodb';
import { analyzeSentiment, extractTopics } from '../../lib/analyzer';

// 抓取 Steam 评论
async function fetchSteamReviews(appid, count = 100) {
  const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=schinese&num_per_page=${count}&filter=recent`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.success !== 1) {
    throw new Error(data.error || 'Failed to fetch reviews');
  }
  
  return data.reviews.map(r => ({
    reviewId: r.recommendationid,
    author: r.author.steamid,
    content: r.review.slice(0, 500),  // 截断 500 字
    recommended: r.voted_up,
    playtime: Math.round(r.author.playtime_forever / 60),
    helpful: r.votes_up,
    funny: r.votes_funny,
    commentCount: r.comment_count,
    date: new Date(r.timestamp_created * 1000),
    steamPurchase: r.steam_purchase,
    receivedFree: r.received_for_free
  }));
}

export default async function handler(req, res) {
  const { appid, action = 'fetch' } = req.query;
  
  if (!appid) {
    return res.status(400).json({ error: 'Missing appid' });
  }
  
  try {
    const db = await getDb();
    
    if (action === 'fetch') {
      // 实时抓取并保存
      const reviews = await fetchSteamReviews(appid);
      
      // 情感分析
      const analyzed = reviews.map(r => {
        const sentiment = analyzeSentiment(r.content);
        const topics = extractTopics(r.content);
        return {
          ...r,
          appid: parseInt(appid),
          sentiment: sentiment.label,
          sentimentScore: sentiment.score,
          keywords: sentiment.keywords,
          topics,
          fetchedAt: new Date()
        };
      });
      
      // 保存到数据库（upsert）
      const bulkOps = analyzed.map(r => ({
        updateOne: {
          filter: { reviewId: r.reviewId },
          update: { $set: r },
          upsert: true
        }
      }));
      
      if (bulkOps.length > 0) {
        await db.collection('reviews').bulkWrite(bulkOps);
      }
      
      // 只保留最新 100 条
      const allReviews = await db.collection('reviews')
        .find({ appid: parseInt(appid) })
        .sort({ date: -1 })
        .skip(100)
        .toArray();
      
      if (allReviews.length > 0) {
        await db.collection('reviews').deleteMany({
          _id: { $in: allReviews.map(r => r._id) }
        });
      }
      
      res.status(200).json({
        success: true,
        count: analyzed.length,
        reviews: analyzed.slice(0, 10)  // 只返回前 10 条
      });
      
    } else if (action === 'get') {
      // 从数据库读取
      const reviews = await db.collection('reviews')
        .find({ appid: parseInt(appid) })
        .sort({ date: -1 })
        .limit(100)
        .toArray();
      
      // 计算统计
      const total = reviews.length;
      const positive = reviews.filter(r => r.recommended).length;
      const negative = total - positive;
      
      res.status(200).json({
        success: true,
        total,
        positive,
        negative,
        positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
        reviews
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
