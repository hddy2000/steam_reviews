import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [newAppId, setNewAppId] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchGames(); }, []);
  useEffect(() => { 
    if (selectedGame) {
      setReviews(null);
      setReport(null);
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
        setMessage(`Added ${newGameName}`);
        setNewAppId('');
        setNewGameName('');
        fetchGames();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Failed to add game');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteGame = async (appid) => {
    if (!confirm('Delete this game?')) return;
    
    try {
      const res = await fetch(`/api/games?id=${appid}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Deleted');
        fetchGames();
        if (selectedGame?.appid === appid) {
          setSelectedGame(null);
          setReviews(null);
          setReport(null);
        }
      }
    } catch (err) {
      setMessage('Delete failed');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // Refresh reviews from Steam
  const refreshReviews = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setMessage('Fetching Steam reviews...');
    
    try {
      const fetchRes = await fetch(`/api/reviews?appid=${selectedGame.appid}&action=fetch`);
      const fetchData = await fetchRes.json();
      
      if (fetchData.success) {
        await fetchReviews(selectedGame.appid);
        setMessage(`Updated ${fetchData.count} reviews`);
      }
    } catch (err) {
      setMessage('Failed to update reviews');
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  // Refresh AI report with Kimi
  const refreshReport = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setMessage('Calling Kimi AI...');
    
    try {
      const reportRes = await fetch(`/api/report?appid=${selectedGame.appid}&refresh=true`);
      const reportData = await reportRes.json();
      
      if (reportData.success) {
        setReport(reportData.report);
        const aiStatus = reportData.aiCalled ? 'AI Generated' : 'Cached';
        setMessage(`Report updated (${aiStatus})`);
      }
    } catch (err) {
      setMessage('Failed to generate report');
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Steam Review Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header style={styles.header}>
        <h1 style={styles.title}>Steam Review Monitor</h1>
        <p style={styles.subtitle}>AI Analysis | Monitoring {games.length}/5 games</p>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.grid}>
        <div style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>Games</h2>
          
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
                  Delete
                </button>
              </div>
            ))}
          </div>

          {games.length < 5 && (
            <form style={styles.addForm} onSubmit={addGame}>
              <h3 style={styles.formTitle}>+ Add Game</h3>
              <input
                style={styles.input}
                placeholder="AppID (e.g. 1991040)"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Game Name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
              />
              <button style={styles.addBtn} type="submit">Add</button>
            </form>
          )}
        </div>

        <div style={styles.main}>
          {selectedGame ? (
            <>
              <div style={styles.gameHeader}>
                <h2 style={styles.gameTitle}>{selectedGame.name}</h2>
              </div>

              <div style={styles.tabs}>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'reviews' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('reviews')}
                >
                  Reviews
                </button>
                <button
                  style={{ ...styles.tab, ...(activeTab === 'report' ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab('report')}
                >
                  Report
                </button>
              </div>

              {activeTab === 'reviews' && reviews && (
                <>
                  <div style={styles.statsGrid}>
                    <StatCard title="Total" value={reviews.total} />
                    <StatCard title="Positive Rate" value={`${reviews.positiveRate}%`} 
                      color={reviews.positiveRate >= 70 ? '#4caf50' : reviews.positiveRate >= 50 ? '#ff9800' : '#f44336'} />
                    <StatCard title="Positive" value={reviews.positive} color="#4caf50" />
                    <StatCard title="Negative" value={reviews.negative} color="#f44336" />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <button
                      style={styles.refreshBtn}
                      onClick={refreshReviews}
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Refresh Reviews'}
                    </button>
                  </div>

                  <h3 style={styles.sectionTitle}>Latest Reviews</h3>
                  <div style={styles.reviewList}>
                    {reviews.reviews?.slice(0, 20).map((review, idx) => (
                      <div key={review.reviewId || idx} style={{
                        ...styles.reviewCard,
                        borderLeft: `4px solid ${review.recommended ? '#4caf50' : '#f44336'}`
                      }}>
                        <div style={styles.reviewHeader}>
                          <span style={{ ...styles.reviewLabel, color: review.recommended ? '#4caf50' : '#f44336' }}>
                            {review.recommended ? 'Recommended' : 'Not Recommended'}
                          </span>
                          <span style={styles.reviewMeta}>
                            {review.playtime}h | {new Date(review.date).toLocaleDateString()}
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
                  <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                    <button
                      style={{...styles.refreshBtn, background: '#9c27b0'}}
                      onClick={refreshReport}
                      disabled={loading}
                    >
                      {loading ? 'AI Processing...' : 'AI Generate Report'}
                    </button>
                  </div>

                  <div style={styles.reportHeader}>
                    <div style={styles.sentimentBadge(report.overall.rating)}>
                      {report.overall.label}
                    </div>
                    <div style={styles.scoreDisplay}>
                      <span style={styles.scoreValue}>{report.overall.score}</span>
                      <span style={styles.scoreLabel}>Score</span>
                    </div>
                  </div>

                  <div style={styles.metricsGrid}>
                    <MetricCard 
                      label="Positive Rate" 
                      value={`${report.stats.positiveRate}%`}
                      trend={report.overall.change}
                    />
                    <MetricCard 
                      label="Heat" 
                      value={`${report.overall.heat}/100`}
                    />
                    <MetricCard 
                      label="Avg Playtime" 
                      value={`${report.stats.avgPlaytime}h`}
                    />
                    <MetricCard 
                      label="Total Reviews" 
                      value={report.stats.total}
                    />
                  </div>

                  <div style={styles.reportSection}>
                    <h3 style={styles.sectionTitle}>AI Summary</h3>
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryText}>{report.summary}</p>
                    </div>
                  </div>

                  {report.keywords?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>Keywords</h3>
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

                  {report.keyPoints?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>Key Points</h3>
                      {report.keyPoints.map((point, idx) => (
                        <div key={idx} style={{
                          ...styles.keyPoint,
                          borderLeft: `4px solid ${point.type === 'positive' ? '#4caf50' : '#f44336'}`
                        }}>
                          <div style={styles.keyPointHeader}>
                            <span style={{ color: point.type === 'positive' ? '#4caf50' : '#f44336' }}>
                              {point.type === 'positive' ? 'Positive' : 'Negative'}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                              {point.helpful} helpful | {point.playtime}h
                            </span>
                          </div>
                          <p style={styles.keyPointContent}>{point.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.risks?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>Risks</h3>
                      {report.risks.map((risk, idx) => (
                        <div key={idx} style={{
                          ...styles.riskItem,
                          borderLeft: `4px solid ${risk.level === 'high' ? '#f44336' : '#ff9800'}`
                        }}>
                          <strong>{risk.level === 'high' ? '!' : '?'} {risk.message}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.suggestions?.length > 0 && (
                    <div style={styles.reportSection}>
                      <h3 style={styles.sectionTitle}>Suggestions</h3>
                      <ul style={styles.suggestionList}>
                        {report.suggestions.map((suggestion, idx) => (
                          <li key={idx} style={styles.suggestionItem}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={styles.updateTime}>
                    Generated: {new Date(report.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>Select a game from the left or add a new game</div>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <p>Steam Review Monitor | AI Analysis | Free tier: 5 games, keep last 100 reviews</p>
        <p>Made by Baby</p>
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
          {trend > 0 ? '+' : trend < 0 ? '-' : '='} {Math.abs(trend)}%
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
