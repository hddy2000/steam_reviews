// AI 评论总结和舆情分析
import { analyzeSentiment, extractTopics, SENTIMENT_WORDS } from './analyzer.js';

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_MODEL = 'kimi-k2.5';

/**
 * 调用 Kimi AI 进行智能总结
 */
async function callKimiAI(prompt, systemPrompt = '') {
  if (!KIMI_API_KEY) {
    console.warn('KIMI_API_KEY not set, skipping AI summary');
    return null;
  }

  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Kimi API error:', error);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Failed to call Kimi API:', error);
    return null;
  }
}

/**
 * 使用 Kimi AI 生成舆情总结
 */
async function generateAISummary(reviews, stats) {
  // 准备评论样本（最多20条代表性评论）
  const sampleReviews = reviews
    .sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
    .slice(0, 20);

  const reviewsText = sampleReviews.map((r, i) => 
    `[${i + 1}] ${r.recommended ? '👍' : '👎'} 游玩${r.playtime}小时: ${r.content.slice(0, 200)}`
  ).join('\n\n');

  const prompt = `请分析以下游戏评论，生成舆情总结报告：

【数据统计】
- 总评论数: ${stats.total}
- 好评率: ${stats.positiveRate}%
- 正面情感: ${stats.sentimentDist.positive}条
- 中性情感: ${stats.sentimentDist.neutral}条  
- 负面情感: ${stats.sentimentDist.negative}条
- 平均游玩时长: ${stats.avgPlaytime}小时

【代表性评论样本】
${reviewsText}

请提供以下分析（用JSON格式返回）：
{
  "summary": "总体舆情概述（100字以内）",
  "keyPoints": ["核心观点1", "核心观点2", "核心观点3"],
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["问题1", "问题2"],
  "risks": ["风险点1"],
  "suggestions": ["建议1", "建议2"],
  "sentiment": "positive/neutral/negative/critical"
}`;

  const systemPrompt = '你是一位专业的游戏舆情分析师，擅长从玩家评论中提取关键信息，给出客观、准确的分析。输出必须是合法的JSON格式。';

  const result = await callKimiAI(prompt, systemPrompt);
  
  if (!result) return null;

  try {
    // 尝试解析JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // 如果不是JSON，返回原始文本
    return { summary: result, raw: true };
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    return { summary: result, raw: true };
  }
}

/**
 * 生成评论总结报告
 */
export async function generateReviewSummary(reviews) {
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

  // 5. 生成统计信息
  const stats = {
    total,
    positive,
    negative,
    positiveRate,
    sentimentDist,
    avgPlaytime: Math.round(reviews.reduce((sum, r) => sum + (r.playtime || 0), 0) / total)
  };

  // 6. 尝试使用 Kimi AI 生成总结
  let aiSummary = null;
  if (KIMI_API_KEY && reviews.length > 0) {
    try {
      aiSummary = await generateAISummary(reviews, stats);
    } catch (error) {
      console.error('AI summary failed:', error);
    }
  }

  // 7. 生成总结文本（如果AI失败则使用规则生成）
  let summary, sentiment, finalKeyPoints, strengths, weaknesses, aiRisks, aiSuggestions;
  
  if (aiSummary) {
    summary = aiSummary.summary || generateSummaryText({ total, positiveRate, sentimentDist, topKeywords, keyPoints });
    sentiment = { 
      rating: aiSummary.sentiment || evaluateSentiment(positiveRate, sentimentDist).rating,
      score: evaluateSentiment(positiveRate, sentimentDist).score,
      label: evaluateSentiment(positiveRate, sentimentDist).label
    };
    finalKeyPoints = aiSummary.keyPoints?.map((p, i) => ({ 
      type: i < aiSummary.keyPoints.length / 2 ? 'positive' : 'negative',
      content: p 
    })) || keyPoints;
    strengths = aiSummary.strengths || [];
    weaknesses = aiSummary.weaknesses || [];
    aiRisks = aiSummary.risks || [];
    aiSuggestions = aiSummary.suggestions || [];
  } else {
    summary = generateSummaryText({ total, positiveRate, sentimentDist, topKeywords, keyPoints });
    sentiment = evaluateSentiment(positiveRate, sentimentDist);
    finalKeyPoints = keyPoints;
    strengths = [];
    weaknesses = [];
    aiRisks = [];
    aiSuggestions = [];
  }

  return {
    summary,
    keyPoints: finalKeyPoints,
    sentiment,
    stats,
    keywords: topKeywords,
    aiGenerated: !!aiSummary,
    aiAnalysis: aiSummary ? {
      strengths,
      weaknesses,
      risks: aiRisks,
      suggestions: aiSuggestions
    } : null,
    updatedAt: new Date()
  };
}

/**
 * 生成舆情分析报告
 */
export async function generateSentimentReport(reviews, previousStats = null) {
  const current = await generateReviewSummary(reviews);
  
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
