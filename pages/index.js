import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'report'
  const [newAppId, setNewAppId] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchGames(); }, []);
  useEffect(() => { 
    if (selectedGame) {
      fetchReviews(selectedGame.appid);
      fetchReport(selectedGame.appid);
    }
  }, [selectedGame]);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
        if (data.games.length > 0 && !selectedGame) {
          setSelectedGame(data.games[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    }
  };

  const fetchReviews = async (appid) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?appid=${appid}&action=get`);
      const data = await res.json();
      if (data.success) setReviews(data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
    setLoading(false);
  };

  const fetchReport = async (appid) => {
    try {
      const res = await fetch(`/api/report?appid=${appid}`);
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    }
  };

  const addGame = async (e) => {
    e.preventDefault();
    if (!newAppId || !newGameName) return;

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: newAppId, name: newGameName })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ 已添加 ${newGameName}`);
        setNewAppId('');
        setNewGameName('');
        fetchGames();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ 添加失败');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteGame = async (appid) => {
    if (!confirm('确定要删除这个游戏吗？')) return;
    
    try {
      const res = await fetch(`/api/games?id=${appid}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('✅ 已删除');
        fetchGames();
        if (selectedGame?.appid === appid) {
          setSelectedGame(null);
          setReviews(null);
          setReport(null);
        }
      }
    } catch (err) {
      setMessage('❌ 删除失败');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const refreshData = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setMessage('正在更新数据...');
    
    try {
      // 1. 抓取新评论
      const fetchRes = await fetch(`/api/reviews?appid=${selectedGame.appid}&action=fetch`);
      const fetchData = await fetchRes.json();
      
      if (fetchData.success) {
        // 2. 重新获取评论和报告
        await fetchReviews(selectedGame.appid);
        await fetchReport(selectedGame.appid);
        setMessage(`✅ 已更新 ${fetchData.count} 条评论并生成报告`);
      }
    } catch (err) {
      setMessage('❌ 更新失败');
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Steam 评论舆情监控</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header style={styles.header}>
        <h1 style={styles.title}>🎮 Steam 评论舆情监控</h1>
        <p style={styles.subtitle}>AI 智能分析 | 监控 {games.length}/5 款游戏</p>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.grid}>
        {/* 左侧：游戏列表 */}
        <div style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>📊 监控游戏</h2>
          
          <div style={styles.gameList}>
            {games.map(game => (
              <div
                key={game.appid}
                style={{
                  ...styles.gameCard,
                  ...(selectedGame?.appid === game.appid ? styles.gameCardActive : {})
                }}
                onClick={() => setSelectedGame(game)}
              >
                <div style={styles.gameName}>{game.name}</div>
                <div style={styles.gameId}>ID: {game.appid}</div>
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); deleteGame(game.appid); }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          {games.length < 5 && (
            <form style={styles.addForm} onSubmit={addGame}>
              <h3 style={styles.formTitle}>+ 添加游戏</h3>
              <input
                style={styles.input}
                placeholder="AppID (如: 1991040)"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="游戏名称"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
              />
              <button style={styles.addBtn} type="submit">添加</button>
            </form>
          )}
        </div>

        {/* 右侧：详情 */}
        <div style={styles.main}>
          {selectedGame ? (
            <>
              <div style={styles.gameHeader}>
                <h2 style={styles.gameTitle}>{selectedGame.name}</h2>
                <button
                  style={styles.refreshBtn}
                  onClick={refreshData}
                  disabled={loading}
                >
                  {loading ? '更新中...' : '🔄 立即更新'}
                </button>
              </div>

              {/* Tab 切换 */}
              <div style={styles.tabs}>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'reviews' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('reviews')}
                >
                  💬 评论列表
                </button>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'report' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('report')}
                >
                  📊 舆情报告
                </button>
              </div>

              {activeTab === 'reviews' && reviews && (
                <>
                  {/* 统计卡片 */}
                  <div style={styles.statsGrid}>
                    <StatCard title="总评论" value={reviews.total} />
                    <StatCard title="好评率" value={`${reviews.positiveRate}%`} 
                      color={reviews.positiveRate >= 70 ? '#4caf50' : reviews.positiveRate >= 50 ? '#ff9800' : '#f44336'} />
                    <StatCard title="好评" value={reviews.positive} color="#4caf50" />
                    <StatCard title="差评" value={reviews.negative} color="#f44336" />
                  </div>

                  {/* 评论列表 */}
                  <h3 style={styles.sectionTitle}>最新评论</h3>
                  <div style={styles.reviewList}>
                    {reviews.reviews?.slice(0, 20).map((review, idx) => (
                      <div key={review.reviewId || idx} style={{
                        ...styles.reviewCard,
                        borderLeft: `4px solid ${review.recommended ? '#4caf50' : '#f44336'}`
                      }}>
                        <div style={styles.reviewHeader}>
                          <span style={{ ...styles.reviewLabel, color: review.recommended ? '#4caf50' : '#f44336' }}>
                            {review.recommended ? '👍 推荐' : '👎 不推荐'}
                          </span>
                          <span style={styles.reviewMeta}>
                            {review.playtime}小时 | {new Date(review.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={styles.reviewContent}>
                          {review.content.slice(0, 200)}{review.content.length > 200 && '...'}
                        </p>
                        {review.keywords?.length > 0 && (
                          <div style={styles.keywords}>
                            {review.keywords.map((kw, i) => (
                              <span key={i} style={styles.keyword}>{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'report' && report && (
                <div style={styles.reportContainer}>
                  {/* 舆情总览 */}
                  <div style={styles.reportHeader}>
                    <div style={styles.sentimentBadge(report.overall.rating)}>
                      {report.overall.label}
                    </div>
                    <div style={styles.scoreDisplay}>
                      <span style={styles.scoreValue}>{report.overall.score}</span>
                      <span style={styles.scoreLabel}>舆情分</span>
                    </div>
                  </div>

                  {/* 关键指标 */}
                  <div style={styles.metricsGrid}>
                    <MetricCard 
                      label="好评率" 
                      value={`${report.stats.positiveRate}%`}
                      trend={report.overall.change}
                    />
                    <MetricCard 
                      label="舆情热度" 
                      value={`${report.overall.heat}/100`}
                    />
                    <MetricCard 
                      label="平均游戏时长" 
                      value={`${report.stats.avgPlaytime}小时`}
                    />
                    <MetricCard 
                      label="评论总数" 
                      value={report.stats.total}
                    />
                  </div>

                  {/* AI 总结 */}
                  <div style={styles.reportSection}>
                    <h3 style={styles.sectionTitle}>🤖 AI 智能总结</h3>
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryText}>{report.summary}</p>
                    </div>
                  </div>

                  {/* 热议关键词 */}
                  {report.keywords?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>🔥 热议关键词</h3>
                      <div style={styles.keywordsCloud}>
                        {report.keywords.slice(0, 10).map((kw, idx) => (
                          <span key={idx} style={{
                            ...styles.cloudKeyword,
                            fontSize: `${Math.max(0.9, 1.4 - idx * 0.05)}rem`,
                            opacity: Math.max(0.6, 1 - idx * 0.1)
                          }}>
                            {kw.word} ({kw.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 关键观点 */}
                  {report.keyPoints?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>💡 关键观点</h3>
                      {report.keyPoints.map((point, idx) => (
                        <div key={idx} style={{
                          ...styles.keyPoint,
                          borderLeft: `4px solid ${point.type === 'positive' ? '#4caf50' : '#f44336'}`
                        }}>
                          <div style={styles.keyPointHeader}>
                            <span style={{ color: point.type === 'positive' ? '#4caf50' : '#f44336' }}>
                              {point.type === 'positive' ? '👍 好评' : '👎 差评'}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                              👍 {point.helpful} | {point.playtime}小时
                            </span>
                          </div>
                          <p style={styles.keyPointContent}>{point.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 风险提示 */}
                  {report.risks?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>⚠️ 风险提示</h3>
                      {report.risks.map((risk, idx) => (
                        <div key={idx} style={{
                          ...styles.riskItem,
                          borderLeft: `4px solid ${risk.level === 'high' ? '#f44336' : '#ff9800'}`
                        }}>
                          <strong>{risk.level === 'high' ? '🔴' : '🟠'} {risk.message}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 建议 */}
                  {report.suggestions?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>📋 建议</h3>
                      <ul style={styles.suggestionList}>
                        {report.suggestions.map((suggestion, idx) => (
                          <li key={idx} style={styles.suggestionItem}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 更新时间 */}
                  <div style={styles.updateTime}>
                    报告生成时间: {new Date(report.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>请从左侧选择一款游戏，或添加新游戏</div>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <p>Steam 评论舆情监控 | AI 智能分析 | 免费版限制：5 款游戏，保留最近 100 条评论</p>
        <p>由 Baby 🐾 开发 | 数据每日自动更新</p>
      </footer>
    </div>
  );
}

function StatCard({ title, value, color = '#4a9eff' }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

function MetricCard({ label, value, trend }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      {trend !== undefined && (
        <div style={{ 
          ...styles.metricTrend, 
          color: trend > 0 ? '#4caf50' : trend < 0 ? '#f44336' : '#888' 
        }}>
          {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
  },
  header: {
    textAlign: 'center',
    padding: '30px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  title: {
    fontSize: '2rem',
    margin: 0,
    marginBottom: '10px'
  },
  subtitle: {
    color: '#888',
    margin: 0
  },
  message: {
    background: 'rgba(74, 158, 255, 0.2)',
    padding: '12px 20px',
    margin: '20px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  sidebar: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
    height: 'fit-content'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    marginBottom: '15px',
    color: '#4a9eff'
  },
  gameList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px'
  },
  gameCard: {
    background: 'rgba(255,255,255,0.1)',
    padding: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s'
  },
  gameCardActive: {
    background: 'rgba(74, 158, 255, 0.3)',
    border: '1px solid #4a9eff'
  },
  gameName: {
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  gameId: {
    fontSize: '0.85rem',
    color: '#888'
  },
  deleteBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(244, 67, 54, 0.8)',
    border: 'none',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem'
  },
  addForm: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px'
  },
  formTitle: {
    fontSize: '1rem',
    marginBottom: '10px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#fff',
    boxSizing: 'border-box'
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    background: '#4a9eff',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  main: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px'
  },
  gameHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  gameTitle: {
    margin: 0
  },
  refreshBtn: {
    padding: '10px 20px',
    background: '#4a9eff',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '10px'
  },
  tab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  tabActive: {
    background: 'rgba(74, 158, 255, 0.3)',
    color: '#fff'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'rgba(0,0,0,0.3)',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statTitle: {
    color: '#888',
    fontSize: '0.9rem',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewCard: {
    background: 'rgba(0,0,0,0.2)',
    padding: '15px',
    borderRadius: '8px'
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  reviewLabel: {
    fontWeight: 'bold'
  },
  reviewMeta: {
    color: '#888',
    fontSize: '0.85rem'
  },
  reviewContent: {
    margin: 0,
    lineHeight: '1.6',
    color: '#ddd'
  },
  keywords: {
    marginTop: '10px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  keyword: {
    background: 'rgba(74, 158, 255, 0.3)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  reportContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.3)',
    padding: '20px',
    borderRadius: '12px'
  },
  sentimentBadge: (rating) => ({
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: rating === 'positive' ? 'rgba(76, 175, 80, 0.3)' : 
                rating === 'negative' ? 'rgba(244, 67, 54, 0.3)' : 
                'rgba(255, 152, 0, 0.3)',
    color: rating === 'positive' ? '#4caf50' : 
           rating === 'negative' ? '#f44336' : 
           '#ff9800'
  }),
  scoreDisplay: {
    textAlign: 'center'
  },
  scoreValue: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#4a9eff'
  },
  scoreLabel: {
    display: 'block',
    color: '#888',
    fontSize: '0.9rem'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '15px'
  },
  metricCard: {
    background: 'rgba(0,0,0,0.2)',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  metricLabel: {
    color: '#888',
    fontSize: '0.85rem',
    marginBottom: '5px'
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  metricTrend: {
    fontSize: '0.85rem',
    marginTop: '5px'
  },
  reportSection: {
    background: 'rgba(0,0,0,0.2)',
    padding: '20px',
    borderRadius: '12px'
  },
  summaryBox: {
    background: 'rgba(74, 158, 255, 0.1)',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #4a9eff'
  },
  summaryText: {
    margin: 0,
    lineHeight: '1.8',
    whiteSpace: 'pre-line'
  },
  keywordsCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '10px'
  },
  cloudKeyword: {
    background: 'rgba(74, 158, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '500'
  },
  keyPoint: {
    background: 'rgba(0,0,0,0.2)',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  keyPointHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  keyPointContent: {
    margin: 0,
    color: '#ddd',
    lineHeight: '1.6'
  },
  riskItem: {
    background: 'rgba(244, 67, 54, 0.1)',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '10px'
  },
  suggestionList: {
    margin: 0,
    paddingLeft: '20px'
  },
  suggestionItem: {
    marginBottom: '8px',
    color: '#ddd',
    lineHeight: '1.6'
  },
  updateTime: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.85rem',
    paddingTop: '10px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888'
  },
  footer: {
    textAlign: 'center',
    padding: '30px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: '#666'
  }
};
