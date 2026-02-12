// 简单情感分析（关键词匹配）
const POSITIVE_WORDS = [
  '推荐', '好玩', '不错', '喜欢', '值得', '满意', '棒', '优秀', '神作', ' masterpiece',
  '良心', '惊喜', '沉浸', '感动', '泪目', '上头', '真香', '爱了', 'yyds', '神',
  '流畅', '精致', '良心', '用心', '诚意', ' refund', '退款', '还好', '还行'
];

const NEGATIVE_WORDS = [
  '垃圾', '烂', '失望', '差评', '坑', '恶心', '垃圾游戏', '骗钱', '避雷', 
  '后悔', '无聊', '粗糙', '敷衍', '半成品', '骗', '坑钱', '差评', '退款',
  '卡顿', '闪退', 'bug', '优化差', '不好玩', '劝退', '坐牢', '折磨'
];

export function analyzeSentiment(text) {
  if (!text) return { label: 'neutral', score: 0 };
  
  text = text.toLowerCase();
  let score = 0;
  let matchedWords = [];
  
  // 统计正负词
  POSITIVE_WORDS.forEach(word => {
    if (text.includes(word)) {
      score += 0.5;
      matchedWords.push(word);
    }
  });
  
  NEGATIVE_WORDS.forEach(word => {
    if (text.includes(word)) {
      score -= 0.8;  // 负面词权重更高
      matchedWords.push(word);
    }
  });
  
  // 基于 Steam 推荐/不推荐判断
  // 这里只返回分析结果，实际推荐状态从 API 获取
  
  let label = 'neutral';
  if (score > 0.3) label = 'positive';
  if (score < -0.3) label = 'negative';
  
  return {
    label,
    score: Math.max(-1, Math.min(1, score)),
    keywords: matchedWords.slice(0, 5)  // 最多返回 5 个关键词
  };
}

// 提取热门话题词
const TOPIC_WORDS = ['优化', 'BUG', '剧情', '立绘', 'AI', '价格', '性价比', '操作', '手感', '画面', '音乐', '肝', '氪'];

export function extractTopics(text) {
  if (!text) return [];
  return TOPIC_WORDS.filter(word => text.includes(word));
}
