"use client";

import { useState, useEffect, useCallback } from 'react';
import { runCoreEngine } from './lib/coreEngine';
import { analyzeHistory, formatSessionDate } from './lib/intelligence';
import { auth, db, googleProvider, signInWithPopup, signOut, collection, addDoc, serverTimestamp, setDoc, doc, query, orderBy, limit, getDocs, where, Timestamp } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState({
    weight: '', height: '', age: '',
    calories: '', workout: '', sleep: '', consistency: ''
  });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [processingState, setProcessingState] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [displayScore, setDisplayScore] = useState(0);
  const [user, setUser] = useState(null);

  // History & Dashboard state
  const [sessions, setSessions] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [graphRange, setGraphRange] = useState('week'); // 'week', 'month', 'year'
  const [authError, setAuthError] = useState(null);

  const fetchSessions = useCallback(async (uid) => {
    if (!uid) return;
    setLoadingSessions(true);
    try {
      const q = query(collection(db, "users", uid, "sessions"), orderBy("createdAt", "desc"), limit(365));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(data);
      setIntelligence(analyzeHistory(data));
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
    setLoadingSessions(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            name: currentUser.displayName,
            email: currentUser.email,
            photo: currentUser.photoURL,
            phone: currentUser.phoneNumber || null,
          }, { merge: true });
        } catch (error) {
          console.error("Error saving user profile:", error);
        }
        // Pre-load sessions for the home graph
        fetchSessions(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [fetchSessions]);

  const handleLogin = async () => {
    setAuthError(null);
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e) { 
      console.error(e);
      const msg = e.code === 'auth/popup-closed-by-user' 
        ? "Sign-in popup was closed before completion." 
        : (e.message || "Sign-in failed. Please check your connection.");
      setAuthError(msg);
    }
  };
  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (step === 3 && result) setDisplayScore(result.summary.score);
  }, [step, result]);

  const updateInput = (key, val) => setInputs(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    let newErrors = {};
    if (step === 1) {
      if (inputs.weight && (inputs.weight < 30 || inputs.weight > 200)) newErrors.weight = "Invalid weight (30–200 kg)";
      if (inputs.height && (inputs.height < 120 || inputs.height > 220)) newErrors.height = "Invalid height (120–220 cm)";
      if (inputs.age && (inputs.age < 10 || inputs.age > 80)) newErrors.age = "Invalid age (10–80)";
      if (inputs.calories && (inputs.calories < 800 || inputs.calories > 5000)) newErrors.calories = "Invalid calories (800–5000)";
      if (inputs.workout && (inputs.workout < 0 || inputs.workout > 180)) newErrors.workout = "Invalid workout (0–180 min)";
      if (inputs.sleep && (inputs.sleep < 0 || inputs.sleep > 12)) newErrors.sleep = "Invalid sleep (0–12 hrs)";
      if (inputs.consistency && (inputs.consistency < 0 || inputs.consistency > 100)) newErrors.consistency = "Invalid consistency (0–100%)";
    }
    setErrors(newErrors);
  };

  useEffect(() => { validate(); }, [inputs, step]);

  const isFormValid = inputs.weight && inputs.height && inputs.age && inputs.calories && inputs.workout && inputs.sleep && inputs.consistency && Object.keys(errors).length === 0;

  const handleAnalyze = async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        setAuthError(null);
        const authResult = await signInWithPopup(auth, googleProvider);
        currentUser = authResult.user;
      } catch (error) {
        console.error("Authentication required:", error);
        const msg = error.code === 'auth/popup-closed-by-user'
          ? "Identity verification cancelled."
          : (error.message || "Failed to verify identity.");
        setAuthError(msg);
        return;
      }
    }
    setProcessingState(1);
    setStep('loading');
    setProcessingMessage('Analyzing signals...');
    setTimeout(async () => {
      const res = runCoreEngine(inputs);
      setResult(res);
      if (currentUser) {
        try {
          // One analysis per day check (Replace Mode) - IST Standardized
          const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const startOfToday = new Date(nowIST);
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date(nowIST);
          endOfToday.setHours(23, 59, 59, 999);

          const q = query(
            collection(db, "users", currentUser.uid, "sessions"),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            where("createdAt", "<=", Timestamp.fromDate(endOfToday)),
            limit(1)
          );
          const existingSnap = await getDocs(q);

          const sessionData = {
            inputs: {
              weight: parseFloat(inputs.weight) || 0,
              height: parseFloat(inputs.height) || 0,
              age: parseInt(inputs.age) || 0,
              calories: parseInt(inputs.calories) || 0,
              workout: parseInt(inputs.workout) || 0,
              sleep: parseFloat(inputs.sleep) || 0,
              consistency: parseInt(inputs.consistency) || 0
            },
            output: res,
            confidence: res.summary.confidence,
            primaryLimiter: res.summary.limiter,
            createdAt: serverTimestamp()
          };

          if (!existingSnap.empty) {
            // Replace existing session for today
            const existingId = existingSnap.docs[0].id;
            await setDoc(doc(db, "users", currentUser.uid, "sessions", existingId), sessionData);
          } else {
            // Create new session
            await addDoc(collection(db, "users", currentUser.uid, "sessions"), sessionData);
          }
        } catch (error) {
          console.error("Error saving session:", error);
        }
      }
      setStep(3);
      setProcessingState(0);
    }, 1200);
  };

  const reset = () => {
    setStep(0);
    setInputs({ weight: '', height: '', age: '', calories: '', workout: '', sleep: '', consistency: '' });
    setResult(null);
  };

  const goHistory = () => {
    if (user) fetchSessions(user.uid);
    setStep('history');
  };

  const goDashboard = () => {
    if (user) fetchSessions(user.uid);
    setStep('dashboard');
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <main className="container">
      <div className="bg-system"><div className="energy-glow"></div></div>
      <div className="bg-overlay"></div>
      
      {/* Auth Error Banner */}
      {authError && (
        <div className="auth-error-banner" onClick={() => setAuthError(null)}>
          <div className="aeb-content">
            <span className="aeb-icon">!</span>
            <p>{authError}</p>
          </div>
          <button className="aeb-close">×</button>
        </div>
      )}

      {/* ── LANDING (STEP 0) ── */}
      {step === 0 && !user && (
        <div className="reveal" style={{ width: '100%' }}>
          <section className="hero-section">
            <div className="header-logo large">CORE</div>
            <h2 className="tagline">Know what's limiting you</h2>
          </section>

          <section className="value-prop-section">
            <div className="flow-box">
              <h3>INPUT</h3>
              <p>Log your biological signals—weight, calories, sleep, and training.</p>
            </div>
            <div className="flow-box">
              <h3>ANALYSIS</h3>
              <p>CORE processes signals across energy and recovery vectors.</p>
            </div>
            <div className="flow-box">
              <h3>OUTCOME</h3>
              <p>Reveals the hidden bottlenecks holding you back.</p>
            </div>
          </section>

          <section className="cta-section">
            <button className="btn-cta" onClick={() => setStep(1)}>
              <div className="liquid"></div>
              <span>Find My Limiter</span>
            </button>
          </section>
        </div>
      )}

      {/* ── LOGGED-IN HOME ── */}
      {step === 0 && user && (
        <div className="reveal logged-in-home">
          {/* Brand */}
          <div className="lih-brand">
            <div className="header-logo large lih-logo">CORE</div>
            <p className="tagline lih-tagline">Know what's limiting you</p>
            <p className="lih-welcome">Welcome, <span>{user.displayName?.split(' ')[0] || 'Athlete'}</span></p>
          </div>

          {/* Graph Toggles & 7-Day Trend Graph */}
          <div className="lih-graph-container">
            <div className="lih-graph-toggles">
              {['week', 'month', 'year'].map(r => (
                <button 
                  key={r} 
                  className={`lih-toggle ${graphRange === r ? 'active' : ''}`}
                  onClick={() => setGraphRange(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="lih-graph-wrap">
              {intelligence ? (
                <DashboardTrendGraph 
                  key={graphRange}
                  data={
                    graphRange === 'week' ? intelligence.weeklyScores :
                    graphRange === 'month' ? intelligence.monthlyScores :
                    intelligence.yearlyScores
                  } 
                  range={graphRange}
                />
              ) : (
                <div className="lih-graph-empty">
                  <span>Complete your first analysis to see your trend</span>
                </div>
              )}
            </div>
          </div>

          {/* Historical Limiter Insight */}
          <div className="lih-insight">
            {intelligence?.limiterInsight ? (
              <>
                <div className="lih-insight-heading">
                  {intelligence.limiterInsight.heading}
                </div>
                <p className="lih-insight-desc">
                  {intelligence.limiterInsight.description}
                </p>
                {intelligence.limiterInsight.confidence === 'limited' && (
                  <span className="lih-insight-badge">Based on limited data</span>
                )}
              </>
            ) : (
              <>
                <div className="lih-insight-heading lih-insight-empty">
                  No pattern detected yet
                </div>
                <p className="lih-insight-desc">
                  Run your first analysis to start uncovering what&#39;s limiting your progress.
                </p>
              </>
            )}
          </div>

          {/* CTA */}
          <div className="lih-cta-wrap">
            <button className="btn-cta lih-cta" onClick={() => setStep(1)}>
              <div className="liquid"></div>
              <span>Run Analysis</span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="lih-footer">
            <button className="lih-link" onClick={goHistory}>History</button>
            <span className="lih-sep">/</span>
            <button className="lih-link" onClick={handleLogout}>Terminate Session</button>
          </div>
        </div>
      )}

      {/* ── INPUT (STEP 1) ── */}
      {step === 1 && (
        <div className="reveal form-container" style={{ maxWidth: '600px' }}>
          <div className="header-logo compact">CORE</div>
          <h1 className="form-title">Biological Signals</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {[
              { key: 'weight', label: 'Weight (kg)', ph: '0.0' },
              { key: 'height', label: 'Height (cm)', ph: '0.0' },
              { key: 'age', label: 'Age', ph: '0' },
              { key: 'calories', label: 'Daily Calories', ph: '0' },
              { key: 'workout', label: 'Workout (min)', ph: '0' },
              { key: 'sleep', label: 'Sleep (hrs)', ph: '0' },
            ].map(f => (
              <div className="field-group reveal" key={f.key}>
                <label className="field-label">{f.label}</label>
                <input type="number" className={`input-field ${errors[f.key] ? 'invalid' : ''}`} placeholder={f.ph} value={inputs[f.key]} onChange={(e) => updateInput(f.key, e.target.value)} />
                {errors[f.key] && <div className="error-msg">{errors[f.key]}</div>}
              </div>
            ))}
            <div className="field-group" style={{ gridColumn: 'span 2' }}>
              <label className="field-label">Consistency (%)</label>
              <input type="number" className={`input-field ${errors.consistency ? 'invalid' : ''}`} placeholder="0" value={inputs.consistency} onChange={(e) => updateInput('consistency', e.target.value)} />
              {errors.consistency && <div className="error-msg">{errors.consistency}</div>}
            </div>
          </div>
          <button className="btn-base" style={{ marginTop: '10px' }} disabled={!isFormValid} onClick={handleAnalyze}>EXECUTE DIAGNOSIS</button>
          <button className="btn-secondary" onClick={() => setStep(0)}>← Return</button>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {processingState === 1 && (
        <div className="reveal processing-container">
          <div className="header-logo compact">CORE</div>
          <p className="processing-text">{processingMessage}</p>
          <div className="processing-bar"><div className="processing-progress"></div></div>
        </div>
      )}

      {/* ── RESULTS (STEP 3) ── */}
      {step === 3 && result && (
        <div className="reveal output-layout">
          <div className="panel-left">
            <h3 className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Where You Stand</h3>
            {[
              { label: 'Optimal', range: '80–100', active: result.summary.score >= 80, cls: 'excellent', color: 'var(--success)' },
              { label: 'Good', range: '70–80', active: result.summary.score >= 70 && result.summary.score < 80, cls: 'good', color: 'var(--success)' },
              { label: 'Maintenance', range: '60–70', active: result.summary.score >= 60 && result.summary.score < 70, cls: 'moderate', color: '#FBBF24' },
              { label: 'Low', range: '40–60', active: result.summary.score >= 40 && result.summary.score < 60, cls: 'low', color: 'var(--accent)' },
              { label: 'Poor', range: '0–40', active: result.summary.score < 40, cls: 'poor', color: 'var(--error)' },
            ].map(s => (
              <div key={s.label} className={`scale-box ${s.active ? `active ${s.cls}` : ''}`}>
                <span className="scale-label" style={{ color: s.active ? s.color : '' }}>{s.label}</span>
                <span className="scale-range">{s.range}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexDirection: 'column' }}>
              {user && <button className="btn-nav" onClick={goHistory}>View History</button>}
              {user && <button className="btn-nav" onClick={goDashboard}>Dashboard</button>}
              <button className="btn-secondary" onClick={reset}>← Recalibrate Engine</button>
            </div>
          </div>

          <div className="panel-center" style={{ animation: 'fadeUp 0.6s ease forwards', opacity: 0 }}>
            <div className="header-logo compact" style={{ marginBottom: 0 }}>CORE</div>
            <div className="donut-container" style={{ '--offset': 440 - (440 * result.summary.score) / 100 }}>
              <svg className="donut-svg" viewBox="0 0 160 160">
                <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10B981" /><stop offset="50%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#EF4444" /></linearGradient></defs>
                <circle className="donut-bg" cx="80" cy="80" r="70" />
                <circle className="donut-fill" cx="80" cy="80" r="70" />
              </svg>
              <div className="hero-score" style={{ position: 'absolute' }}>{displayScore}</div>
            </div>
            <div><div className="hero-state">{result.summary.state}</div><p className="hero-tagline">{result.summary.tagline}</p></div>
            <div className="hero-trend" style={{ marginTop: '10px' }}>Primary Limiter: {result.summary.limiter}</div>
            <div className="confidence-label">Confidence: {result.summary.confidence}</div>
            <div className="prediction-label">{result.summary.prediction}</div>
          </div>

          <div className="panel-right">
            <div className="analysis-section" style={{ animationDelay: '0.3s' }}>
              <div className="section-title">System Analysis</div>
              {['energy', 'recovery', 'training', 'consistency'].map(k => (
                <div className="sys-metric" key={k}><span className="sys-label">{k.charAt(0).toUpperCase() + k.slice(1)}</span><span className="sys-val" style={{ textTransform: 'none' }}>{result.analysis[k]}</span></div>
              ))}
            </div>
            <div className="analysis-section" style={{ animationDelay: '0.5s' }}>
              <div className="section-title">Findings</div>
              {result.findings.map((f, i) => (
                <div key={i} className="finding-item" style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: `${0.5 + i * 0.1}s`, opacity: 0 }}>
                  <div className={`indicator ${f.type}`}></div><div className="finding-text">{f.text}</div>
                </div>
              ))}
            </div>
            <div className="analysis-section" style={{ animationDelay: '0.8s', marginTop: 'auto' }}>
              <div className="section-title">Action</div>
              {result.actions.map((a, i) => (<div key={i} className="action-item">{a}</div>))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY (V2.3) ── */}
      {step === 'history' && (
        <div className="reveal history-screen">
          <div className="header-logo compact" style={{ marginTop: '20px' }}>CORE</div>
          <h2 className="screen-subtitle">Session History</h2>

          {!user ? (
            <div className="empty-state">
              <p>Sign in to view your history</p>
              <button className="btn-base" style={{ maxWidth: '300px' }} onClick={handleLogin}>Sign In with Google</button>
            </div>
          ) : loadingSessions ? (
            <div className="empty-state"><p className="processing-text">Loading sessions...</p></div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <p>No sessions yet. Complete your first analysis to start building history.</p>
              <button className="btn-base" style={{ maxWidth: '300px' }} onClick={() => setStep(1)}>Start Analysis</button>
            </div>
          ) : (
            <>
              {/* Trend Badge */}
              {intelligence && (
                <div className="trend-badge-row">
                  <div className={`trend-badge ${intelligence.trendDirection === 1 ? 'up' : intelligence.trendDirection === -1 ? 'down' : 'flat'}`}>
                    <span className="trend-arrow">{intelligence.trendDirection === 1 ? '↑' : intelligence.trendDirection === -1 ? '↓' : '→'}</span>
                    {intelligence.trend}
                  </div>
                  <div className="stat-pill">{intelligence.totalSessions} sessions</div>
                  <div className="stat-pill">Avg: {intelligence.avgScore}</div>
                  {intelligence.streak > 0 && <div className="stat-pill streak">🔥 {intelligence.streak} streak</div>}
                </div>
              )}

              {/* Score Timeline (SVG) */}
              {intelligence && intelligence.weeklyScores.length >= 2 && (
                <div className="timeline-card">
                  <div className="section-title" style={{ border: 'none' }}>Score Timeline</div>
                  <ScoreChart data={intelligence.weeklyScores} />
                </div>
              )}

              {/* Session List */}
              <div className="session-list">
                {sessions.map((s, i) => (
                  <div key={s.id} className="session-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="session-score" style={{ color: scoreColor(s.output?.summary?.score) }}>{s.output?.summary?.score ?? '—'}</div>
                    <div className="session-info">
                      <div className="session-state">{s.output?.summary?.state ?? 'Unknown'}</div>
                      <div className="session-limiter">Limiter: {s.primaryLimiter || '—'}</div>
                    </div>
                    <div className="session-date">{formatSessionDate(s.createdAt)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="bottom-nav">
            <button className="btn-secondary" onClick={() => setStep(0)}>← Return</button>
            {user && <button className="btn-nav" onClick={goDashboard}>Dashboard →</button>}
          </div>
        </div>
      )}

      {/* ── DASHBOARD (V2.4) ── */}
      {step === 'dashboard' && (
        <div className="reveal dashboard-screen">
          <div className="header-logo compact" style={{ marginTop: '20px' }}>CORE</div>
          <h2 className="screen-subtitle">Dashboard</h2>

          {!user ? (
            <div className="empty-state">
              <p>Sign in to view your dashboard</p>
              <button className="btn-base" style={{ maxWidth: '300px' }} onClick={handleLogin}>Sign In with Google</button>
            </div>
          ) : loadingSessions ? (
            <div className="empty-state"><p className="processing-text">Loading data...</p></div>
          ) : !intelligence || sessions.length === 0 ? (
            <div className="empty-state">
              <p>No data yet. Complete sessions to unlock your dashboard.</p>
              <button className="btn-base" style={{ maxWidth: '300px' }} onClick={() => setStep(1)}>Start Analysis</button>
            </div>
          ) : (
            <div className="dash-grid">
              {/* 7-Day Graph */}
              <div className="dash-card wide">
                <div className="section-title" style={{ border: 'none' }}>7-Session Performance</div>
                <ScoreChart data={intelligence.weeklyScores} tall />
              </div>

              {/* Stat Cards */}
              <div className="dash-card">
                <div className="dash-stat-label">Average Score</div>
                <div className="dash-stat-value" style={{ color: scoreColor(intelligence.avgScore) }}>{intelligence.avgScore}</div>
              </div>
              <div className="dash-card">
                <div className="dash-stat-label">Streak</div>
                <div className="dash-stat-value">{intelligence.streak > 0 ? `🔥 ${intelligence.streak}` : '—'}</div>
              </div>
              <div className="dash-card">
                <div className="dash-stat-label">Trend</div>
                <div className={`dash-stat-value trend-val ${intelligence.trendDirection === 1 ? 'up' : intelligence.trendDirection === -1 ? 'down' : ''}`}>
                  {intelligence.trend}
                </div>
              </div>
              <div className="dash-card">
                <div className="dash-stat-label">Total Sessions</div>
                <div className="dash-stat-value">{intelligence.totalSessions}</div>
              </div>

              {/* Limiter Frequency */}
              <div className="dash-card wide">
                <div className="section-title" style={{ border: 'none' }}>Limiter Frequency</div>
                <div className="limiter-bars">
                  {Object.entries(intelligence.limiterFrequency).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                    const pct = Math.round((count / intelligence.totalSessions) * 100);
                    return (
                      <div key={name} className="limiter-bar-row">
                        <span className="limiter-name">{name}</span>
                        <div className="limiter-track"><div className="limiter-fill" style={{ width: `${pct}%` }}></div></div>
                        <span className="limiter-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="dash-card wide">
                <div className="section-title" style={{ border: 'none' }}>Progress Summary</div>
                <p className="dash-summary">{intelligence.progressSummary}</p>
              </div>

              {/* Predictions */}
              {intelligence.prediction && (
                <div className="dash-card wide">
                  <div className="section-title" style={{ border: 'none' }}>Predictions</div>
                  {intelligence.prediction.map((p, i) => (
                    <div key={i} className="prediction-item">
                      <span className="prediction-icon">⚡</span>
                      <span>{p.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="bottom-nav">
            <button className="btn-secondary" onClick={() => setStep(0)}>← Return</button>
            {user && <button className="btn-nav" onClick={goHistory}>History →</button>}
          </div>
        </div>
      )}

      {/* VERSION FOOTER */}
      <div className="version-footer">
        CORE v3.31
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════



function ScoreChart({ data, tall }) {
  if (!data || data.length < 2) return null;
  const W = 400, H = tall ? 160 : 100, PAD = 30;
  const scores = data.map(d => d.score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;

  const points = scores.map((s, i) => ({
    x: PAD + (i / (scores.length - 1)) * (W - PAD * 2),
    y: PAD + ((max - s) / range) * (H - PAD * 2),
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${H - PAD} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="score-chart">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(245,158,11,0.3)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0)" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[25, 50, 75].map(v => {
        const y = PAD + ((max - v) / range) * (H - PAD * 2);
        return <line key={v} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />;
      })}
      {/* Area */}
      <path d={areaPath} fill="url(#chartGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="var(--font-main)">{scores[i]}</text>
        </g>
      ))}
    </svg>
  );
}
// ── DASHBOARD TREND GRAPH (Gap-Aware Home View) ──────────────────────────
function DashboardTrendGraph({ data, range }) {
  if (!data || data.length === 0) return null;

  const W = 500, H = 220, PAD_X = 36, PAD_Y = 28;
  const scores = data.map(d => d.score);
  
  // For Y-axis scaling, find valid range or default
  const validScores = scores.filter(s => s !== null);
  const maxS = validScores.length ? Math.max(...validScores, 85) : 85;
  const minS = validScores.length ? Math.min(...validScores, 40) : 40;
  const scoreRange = maxS - minS || 1;

  const toX = i => PAD_X + (i / (data.length - 1 || 1)) * (W - PAD_X * 2);
  const toY = s => PAD_Y + ((maxS - (s ?? 50)) / scoreRange) * (H - PAD_Y * 2);

  // Helper for smooth Bezier curves
  const getBezierPath = (pts) => {
    if (!pts || pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx} ${curr.y} ${mx} ${next.y} ${next.x} ${next.y}`;
    }
    return d;
  };

  // 1. All Points (for dashed line - handles nulls with linear interpolation)
  const allPoints = scores.map((s, i) => {
    if (s !== null) return { x: toX(i), y: toY(s), val: s };
    
    // Find prev and next valid
    let prev = null, next = null;
    for (let j = i - 1; j >= 0; j--) if (scores[j] !== null) { prev = { val: scores[j], idx: j }; break; }
    for (let j = i + 1; j < scores.length; j++) if (scores[j] !== null) { next = { val: scores[j], idx: j }; break; }
    
    let interp = 50;
    if (prev && next) {
      interp = prev.val + (next.val - prev.val) * ((i - prev.idx) / (next.idx - prev.idx));
    } else if (prev) interp = prev.val;
    else if (next) interp = next.val;
    
    return { x: toX(i), y: toY(interp), val: null };
  });

  const dashedPath = getBezierPath(allPoints);

  // 2. Solid Segments (only for successive actual data)
  const solidSegments = [];
  let currentSegment = [];
  scores.forEach((s, i) => {
    if (s !== null) {
      currentSegment.push({ x: toX(i), y: toY(s) });
    } else {
      if (currentSegment.length >= 2) solidSegments.push([...currentSegment]);
      currentSegment = [];
    }
  });
  if (currentSegment.length >= 2) solidSegments.push(currentSegment);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`dash-trend-svg range-${range}`}
    >
      <defs>
        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Y-axis labels */}
      {[minS, Math.round((minS + maxS) / 2), maxS].map(v => (
        <text key={v} x={PAD_X - 6} y={toY(v) + 4} textAnchor="end"
          fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="var(--font-main)">
          {v}
        </text>
      ))}

      {/* Dashed Orange Bridge Line (Connecting gaps) */}
      <path d={dashedPath} fill="none" stroke="rgba(245, 158, 11, 0.2)" 
        strokeWidth="1.2" strokeDasharray="4 4" className="graph-fade-in" />

      {/* Solid Orange Data Lines (Successive entries) */}
      {solidSegments.map((seg, i) => (
        <path key={i} d={getBezierPath(seg)} 
          fill="none" stroke="#F59E0B" strokeWidth={range === 'week' ? "2.5" : "1.8"} 
          strokeLinejoin="round" strokeLinecap="round" filter="url(#lineGlow)" className="graph-fade-in" />
      ))}

      {/* Points */}
      {data.map((d, i) => {
        const x = toX(i);
        const y = toY(d.score);
        const isNull = d.score === null;
        const radius = range === 'week' ? 5 : 3;
        const label = range === 'week' ? 
          new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d.date) :
          range === 'month' ? `Day ${d.date.getDate()}` : `Week ${52 - i}`;

        return (
          <g key={i} className="graph-fade-in">
            <title>{label} • {isNull ? 'No analysis' : `Score: ${d.score}`}</title>
            {isNull ? (
              <circle cx={x} cy={y} r={radius - 1} fill="#0D0D0D" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            ) : (
              <circle cx={x} cy={y} r={radius} fill="#F59E0B" />
            )}
          </g>
        );
      })}

      {/* X-axis Labels */}
      {data.map((d, i) => {
        let label = null;
        if (range === 'week') {
          label = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d.date);
        } else if (range === 'month') {
          if (i % 5 === 0 || i === data.length - 1) label = d.date.getDate();
        } else if (range === 'year') {
          if (i % 8 === 0 || i === data.length - 1) label = `W${i + 1}`;
        }
        if (!label) return null;
        return (
          <text key={i} x={toX(i)} y={H - 4} textAnchor="middle"
            fill={scores[i] !== null ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'}
            fontSize="10" fontFamily="var(--font-main)" fontWeight="600">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function scoreColor(score) {
  if (!score && score !== 0) return '#fff';
  if (score >= 80) return '#10B981';
  if (score >= 70) return '#22C55E';
  if (score >= 60) return '#FBBF24';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}