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
      setReviews(null);  // 娓呯┖鏃ф暟鎹?
      setReport(null);   // 娓呯┖鏃ф姤鍛?
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
        setMessage(`鉁?宸叉坊鍔?${newGameName}`);
        setNewAppId('');
        setNewGameName('');
        fetchGames();
      } else {
        setMessage(`鉂?${data.error}`);
      }
    } catch (err) {
      setMessage('鉂?娣诲姞澶辫触');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteGame = async (appid) => {
    if (!confirm('纭畾瑕佸垹闄よ繖涓父鎴忓悧锛?)) return;
    
    try {
      const res = await fetch(`/api/games?id=${appid}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('鉁?宸插垹闄?);
        fetchGames();
        if (selectedGame?.appid === appid) {
          setSelectedGame(null);
          setReviews(null);
          setReport(null);
        }
      }
    } catch (err) {
      setMessage('鉂?鍒犻櫎澶辫触');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // 鍒锋柊璇勮鍒楄〃锛堜粠Steam鎷夊彇鏂拌瘎璁猴級
  const refreshReviews = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setMessage('姝ｅ湪鎶撳彇 Steam 璇勮...');
    
    try {
      const fetchRes = await fetch(`/api/reviews?appid=${selectedGame.appid}&action=fetch`);
      const fetchData = await fetchRes.json();
      
      if (fetchData.success) {
        await fetchReviews(selectedGame.appid);
        setMessage(`鉁?宸叉洿鏂?${fetchData.count} 鏉¤瘎璁篳);
      }
    } catch (err) {
      setMessage('鉂?璇勮鏇存柊澶辫触');
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  // 鍒锋柊鑸嗘儏鎶ュ憡锛堣皟鐢↘imi AI閲嶆柊鐢熸垚锛?
  const refreshReport = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setMessage('姝ｅ湪璋冪敤 Kimi AI 鐢熸垚鑸嗘儏鎶ュ憡...');
    
    try {
      const reportRes = await fetch(`/api/report?appid=${selectedGame.appid}&refresh=true`);
      const reportData = await reportRes.json();
      
      if (reportData.success) {
        setReport(reportData.report);
        const aiStatus = reportData.aiCalled ? '馃 AI鐢熸垚' : '鈿?缂撳瓨';
        setMessage(`鉁?鑸嗘儏鎶ュ憡宸叉洿鏂?(${aiStatus})`);
      }
    } catch (err) {
      setMessage('鉂?鎶ュ憡鐢熸垚澶辫触');
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Steam 璇勮鑸嗘儏鐩戞帶</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header style={styles.header}>
        <h1 style={styles.title}>馃幃 Steam 璇勮鑸嗘儏鐩戞帶</h1>
        <p style={styles.subtitle}>AI 鏅鸿兘鍒嗘瀽 | 鐩戞帶 {games.length}/5 娆炬父鎴?/p>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.grid}>
        {/* 宸︿晶锛氭父鎴忓垪琛?*/}
        <div style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>馃搳 鐩戞帶娓告垙</h2>
          
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
                  鍒犻櫎
                </button>
              </div>
            ))}
          </div>

          {games.length < 5 && (
            <form style={styles.addForm} onSubmit={addGame}>
              <h3 style={styles.formTitle}>+ 娣诲姞娓告垙</h3>
              <input
                style={styles.input}
                placeholder="AppID (濡? 1991040)"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="娓告垙鍚嶇О"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
              />
              <button style={styles.addBtn} type="submit">娣诲姞</button>
            </form>
          )}
        </div>

        {/* 鍙充晶锛氳鎯?*/}
        <div style={styles.main}>
          {selectedGame ? (
            <>
              <div style={styles.gameHeader}>
                <h2 style={styles.gameTitle}>{selectedGame.name}</h2>
              </div>

              {/* Tab 鍒囨崲 */}
              <div style={styles.tabs}>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'reviews' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('reviews')}
                >
                  馃挰 璇勮鍒楄〃
                </button>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'report' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('report')}
                >
                  馃搳 鑸嗘儏鎶ュ憡
                </button>
              </div>

              {activeTab === 'reviews' && reviews && (
                <>
                  {/* 缁熻鍗＄墖 */}
                  <div style={styles.statsGrid}>
                    <StatCard title="鎬昏瘎璁? value={reviews.total} />
                    <StatCard title="濂借瘎鐜? value={`${reviews.positiveRate}%`} 
                      color={reviews.positiveRate >= 70 ? '#4caf50' : reviews.positiveRate >= 50 ? '#ff9800' : '#f44336'} />
                    <StatCard title="濂借瘎" value={reviews.positive} color="#4caf50" />
                    <StatCard title="宸瘎" value={reviews.negative} color="#f44336" />
                  </div>

                  {/* 鍒锋柊璇勮鎸夐挳 */}
                  <div style={{ marginBottom: '15px' }}>
                    <button
                      style={styles.refreshBtn}
                      onClick={refreshReviews}
                      disabled={loading}
                    >
                      {loading ? '鏇存柊涓?..' : '馃攧 鍒锋柊璇勮'}
                    </button>
                  </div>

                  {/* 璇勮鍒楄〃 */}
                  <h3 style={styles.sectionTitle}>鏈€鏂拌瘎璁?/h3>
                  <div style={styles.reviewList}>
                    {reviews.reviews?.slice(0, 20).map((review, idx) => (
                      <div key={review.reviewId || idx} style={{
                        ...styles.reviewCard,
                        borderLeft: `4px solid ${review.recommended ? '#4caf50' : '#f44336'}`
                      }}>
                        <div style={styles.reviewHeader}>
                          <span style={{ ...styles.reviewLabel, color: review.recommended ? '#4caf50' : '#f44336' }}>
                            {review.recommended ? '馃憤 鎺ㄨ崘' : '馃憥 涓嶆帹鑽?}
                          </span>
                          <span style={styles.reviewMeta}>
                            {review.playtime}灏忔椂 | {new Date(review.date).toLocaleDateString()}
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
                  {/* AI鐢熸垚鎶ュ憡鎸夐挳 */}
                  <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                    <button
                      style={{...styles.refreshBtn, background: '#9c27b0'}}
                      onClick={refreshReport}
                      disabled={loading}
                    >
                      {loading ? 'AI鍒嗘瀽涓?..' : '馃 AI鐢熸垚鎶ュ憡'}
                    </button>
                  </div>

                  {/* 鑸嗘儏鎬昏 */}
                  <div style={styles.reportHeader}>
                    <div style={styles.sentimentBadge(report.overall.rating)}>
                      {report.overall.label}
                    </div>
                    <div style={styles.scoreDisplay}>
                      <span style={styles.scoreValue}>{report.overall.score}</span>
                      <span style={styles.scoreLabel}>鑸嗘儏鍒?/span>
                    </div>
                  </div>

                  {/* 鍏抽敭鎸囨爣 */}
                  <div style={styles.metricsGrid}>
                    <MetricCard 
                      label="濂借瘎鐜? 
                      value={`${report.stats.positiveRate}%`}
                      trend={report.overall.change}
                    />
                    <MetricCard 
                      label="鑸嗘儏鐑害" 
                      value={`${report.overall.heat}/100`}
                    />
                    <MetricCard 
                      label="骞冲潎娓告垙鏃堕暱" 
                      value={`${report.stats.avgPlaytime}灏忔椂`}
                    />
                    <MetricCard 
                      label="璇勮鎬绘暟" 
                      value={report.stats.total}
                    />
                  </div>

                  {/* AI 鎬荤粨 */}
                  <div style={styles.reportSection}>
                    <h3 style={styles.sectionTitle}>馃 AI 鏅鸿兘鎬荤粨</h3>
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryText}>{report.summary}</p>
                    </div>
                  </div>

                  {/* 鐑鍏抽敭璇?*/}
                  {report.keywords?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>馃敟 鐑鍏抽敭璇?/h3>
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

                  {/* 鍏抽敭瑙傜偣 */}
                  {report.keyPoints?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>馃挕 鍏抽敭瑙傜偣</h3>
                      {report.keyPoints.map((point, idx) => (
                        <div key={idx} style={{
                          ...styles.keyPoint,
                          borderLeft: `4px solid ${point.type === 'positive' ? '#4caf50' : '#f44336'}`
                        }}>
                          <div style={styles.keyPointHeader}>
                            <span style={{ color: point.type === 'positive' ? '#4caf50' : '#f44336' }}>
                              {point.type === 'positive' ? '馃憤 濂借瘎' : '馃憥 宸瘎'}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                              馃憤 {point.helpful} | {point.playtime}灏忔椂
                            </span>
                          </div>
                          <p style={styles.keyPointContent}>{point.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 椋庨櫓鎻愮ず */}
                  {report.risks?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>鈿狅笍 椋庨櫓鎻愮ず</h3>
                      {report.risks.map((risk, idx) => (
                        <div key={idx} style={{
                          ...styles.riskItem,
                          borderLeft: `4px solid ${risk.level === 'high' ? '#f44336' : '#ff9800'}`
                        }}>
                          <strong>{risk.level === 'high' ? '馃敶' : '馃煚'} {risk.message}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 寤鸿 */}
                  {report.suggestions?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>馃搵 寤鸿</h3>
                      <ul style={styles.suggestionList}>
                        {report.suggestions.map((suggestion, idx) => (
                          <li key={idx} style={styles.suggestionItem}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 鏇存柊鏃堕棿 */}
                  <div style={styles.updateTime}>
                    鎶ュ憡鐢熸垚鏃堕棿: {new Date(report.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>璇蜂粠宸︿晶閫夋嫨涓€娆炬父鎴忥紝鎴栨坊鍔犳柊娓告垙</div>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <p>Steam 璇勮鑸嗘儏鐩戞帶 | AI 鏅鸿兘鍒嗘瀽 | 鍏嶈垂鐗堥檺鍒讹細5 娆炬父鎴忥紝淇濈暀鏈€杩?100 鏉¤瘎璁?/p>
        <p>鐢?Baby 馃惥 寮€鍙?| 鏁版嵁姣忔棩鑷姩鏇存柊</p>
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
          {trend > 0 ? '鈫? : trend < 0 ? '鈫? : '鈫?} {Math.abs(trend)}%
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
