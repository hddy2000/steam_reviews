// AI 评论总结和舆情分析
import { analyzeSentiment, extractTopics, SENTIMENT_WORDS } from './analyzer.js';

/**
 * 生成评论总结报告
 */
export function generateReviewSummary(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      summary: '暂无评论数据',
      keyPoints: [],
      sentiment: 'neutral'
    };
  }

  // 1. 基础统计
  const total = reviews.length;
  const positive = reviews.filter(r => r.recommended).length;
  const negative = total - positive;
  const positiveRate = Math.round((positive / total) * 100);
  
  // 2. 情感分布
  const sentimentDist = {
    positive: reviews.filter(r => r.sentiment === 'positive').length,
    neutral: reviews.filter(r => r.sentiment === 'neutral').length,
    negative: reviews.filter(r => r.sentiment === 'negative').length
  };

  // 3. 提取高频词（简单 TF-IDF）
  const wordFreq = {};
  reviews.forEach(r => {
    const words = extractKeywordsFromText(r.content);
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });
  
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // 4. 提取关键观点（代表性评论）
  const keyPoints = extractKeyPoints(reviews);

  // 5. 生成总结文本
  const summary = generateSummaryText({
    total,
    positiveRate,
    sentimentDist,
    topKeywords,
    keyPoints
  });

  // 6. 舆情评级
  const sentiment = evaluateSentiment(positiveRate, sentimentDist);

  return {
    summary,
    keyPoints,
    sentiment,
    stats: {
      total,
      positive,
      negative,
      positiveRate,
      sentimentDist,
      avgPlaytime: Math.round(reviews.reduce((sum, r) => sum + (r.playtime || 0), 0) / total)
    },
    keywords: topKeywords,
    updatedAt: new Date()
  };
}

/**
 * 生成舆情分析报告
 */
export function generateSentimentReport(reviews, previousStats = null) {
  const current = generateReviewSummary(reviews);
  
  // 与历史数据对比（如果有）
  let trend = 'stable';
  let change = 0;
  
  if (previousStats) {
    change = current.stats.positiveRate - previousStats.positiveRate;
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'declining';
  }

  // 风险识别
  const risks = identifyRisks(reviews, current);

  // 生成建议
  const suggestions = generateSuggestions(current, risks);

  // 舆情热度（基于评论数量和互动）
  const heatScore = calculateHeatScore(reviews);

  return {
    overall: {
      rating: current.sentiment.rating,  // 'positive' | 'neutral' | 'negative' | 'critical'
      score: current.sentiment.score,    // 0-100
      trend,
      change: Math.round(change),
      heat: heatScore
    },
    summary: current.summary,
    keyPoints: current.keyPoints,
    keywords: current.keywords,
    risks,
    suggestions,
    stats: current.stats,
    updatedAt: new Date()
  };
}

// 辅助函数：从文本提取关键词
function extractKeywordsFromText(text) {
  if (!text) return [];
  
  // 游戏相关关键词库
  const gameKeywords = [
    '优化', 'BUG', '卡顿', '闪退', '剧情', '画面', '立绘', 'AI', 
    '价格', '性价比', '操作', '手感', '音乐', '肝', '氪', '氪金',
    '退款', '推荐', '失望', '惊喜', '神作', '垃圾', '良心',
    '代入感', '情怀', '青春', '校园', '恋爱', '战斗',
    '服务器', '网络', '延迟', '匹配', '外挂'
  ];
  
  const words = [];
  const lowerText = text.toLowerCase();
  
  gameKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      words.push(keyword);
    }
  });
  
  return words;
}

// 提取关键观点（代表性评论）
function extractKeyPoints(reviews) {
  const points = [];
  
  // 找高赞好评
  const topPositive = reviews
    .filter(r => r.recommended && r.helpful > 0)
    .sort((a, b) => b.helpful - a.helpful)
    .slice(0, 3);
  
  topPositive.forEach(r => {
    points.push({
      type: 'positive',
      content: r.content.slice(0, 100) + (r.content.length > 100 ? '...' : ''),
      helpful: r.helpful,
      playtime: r.playtime
    });
  });
  
  // 找高赞差评
  const topNegative = reviews
    .filter(r => !r.recommended && r.helpful > 0)
    .sort((a, b) => b.helpful - a.helpful)
    .slice(0, 3);
  
  topNegative.forEach(r => {
    points.push({
      type: 'negative',
      content: r.content.slice(0, 100) + (r.content.length > 100 ? '...' : ''),
      helpful: r.helpful,
      playtime: r.playtime
    });
  });
  
  return points;
}

// 生成总结文本
function generateSummaryText({ total, positiveRate, sentimentDist, topKeywords, keyPoints }) {
  const parts = [];
  
  // 总体评价
  if (positiveRate >= 80) {
    parts.push(`玩家评价非常正面（${positiveRate}%好评），整体口碑优秀。`);
  } else if (positiveRate >= 60) {
    parts.push(`玩家评价较为正面（${positiveRate}%好评），整体口碑良好。`);
  } else if (positiveRate >= 40) {
    parts.push(`玩家评价褒贬不一（${positiveRate}%好评），存在争议。`);
  } else {
    parts.push(`玩家评价偏负面（${positiveRate}%好评），需要关注。`);
  }
  
  // 讨论热点
  if (topKeywords.length > 0) {
    const hotTopics = topKeywords.slice(0, 5).map(k => k.word).join('、');
    parts.push(`玩家热议话题：${hotTopics}。`);
  }
  
  // 代表性观点
  const positivePoints = keyPoints.filter(p => p.type === 'positive');
  const negativePoints = keyPoints.filter(p => p.type === 'negative');
  
  if (positivePoints.length > 0) {
    parts.push(`好评玩家认为：${positivePoints[0].content}`);
  }
  
  if (negativePoints.length > 0) {
    parts.push(`差评玩家指出：${negativePoints[0].content}`);
  }
  
  return parts.join('\n\n');
}

// 评估舆情等级
function evaluateSentiment(positiveRate, sentimentDist) {
  let rating, score, label;
  
  if (positiveRate >= 80) {
    rating = 'positive';
    score = 85;
    label = '好评如潮';
  } else if (positiveRate >= 60) {
    rating = 'positive';
    score = 70;
    label = '多半好评';
  } else if (positiveRate >= 40) {
    rating = 'neutral';
    score = 50;
    label = '褒贬不一';
  } else if (positiveRate >= 20) {
    rating = 'negative';
    score = 35;
    label = '多半差评';
  } else {
    rating = 'negative';
    score = 20;
    label = '差评如潮';
  }
  
  return { rating, score, label };
}

// 识别风险点
function identifyRisks(reviews, summary) {
  const risks = [];
  
  // 差评率过高
  if (summary.stats.positiveRate < 50) {
    risks.push({
      type: 'high_negative_rate',
      level: 'high',
      message: '差评率过高，需紧急关注'
    });
  }
  
  // 负面关键词激增
  const negativeWords = ['退款', '垃圾', '骗钱', '坑', '失望'];
  const negativeCount = reviews.filter(r => 
    negativeWords.some(word => r.content.includes(word))
  ).length;
  
  if (negativeCount > reviews.length * 0.3) {
    risks.push({
      type: 'negative_sentiment_spike',
      level: 'medium',
      message: '负面情绪评论占比较高，建议排查游戏问题'
    });
  }
  
  // 技术问题提及
  const techIssues = reviews.filter(r => 
    /(bug|闪退|卡顿|优化|服务器)/i.test(r.content)
  ).length;
  
  if (techIssues > reviews.length * 0.2) {
    risks.push({
      type: 'technical_issues',
      level: 'medium',
      message: '较多玩家反馈技术问题，建议优先修复'
    });
  }
  
  return risks;
}

// 生成建议
function generateSuggestions(summary, risks) {
  const suggestions = [];
  
  if (risks.length === 0) {
    suggestions.push('当前舆情良好，继续保持');
  } else {
    risks.forEach(risk => {
      switch (risk.type) {
        case 'high_negative_rate':
          suggestions.push('建议主动回应玩家关切，发布改进计划');
          break;
        case 'negative_sentiment_spike':
          suggestions.push('关注社区反馈，及时修复影响体验的问题');
          break;
        case 'technical_issues':
          suggestions.push('优先修复技术问题，发布优化补丁');
          break;
      }
    });
  }
  
  // 基于好评的建议
  if (summary.stats.positiveRate > 70) {
    suggestions.push('口碑良好，可考虑加大推广力度');
  }
  
  return suggestions;
}

// 计算热度分（0-100）
function calculateHeatScore(reviews) {
  const totalInteractions = reviews.reduce((sum, r) => 
    sum + (r.helpful || 0) + (r.commentCount || 0), 0
  );
  const avgInteractions = totalInteractions / reviews.length;
  
  // 基于平均互动数计算热度
  let score = Math.min(100, Math.round(avgInteractions * 10));
  
  // 加上评论数量权重
  if (reviews.length > 50) score += 10;
  if (reviews.length > 100) score += 10;
  
  return Math.min(100, score);
}
