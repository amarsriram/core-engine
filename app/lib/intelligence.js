// ═══════════════════════════════════════════════════════
// CORE INTELLIGENCE LAYER
// Converts raw session history into patterns, trends,
// streaks, and predictive insights.
// ═══════════════════════════════════════════════════════

const TIMEZONE = 'Asia/Kolkata';

/**
 * Analyze a sorted array of sessions (newest first)
 * Returns: trend, streak, limiterFrequency, weeklyAvg, progressSummary, prediction
 */
export function analyzeHistory(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      trend: 'Unknown',
      trendDirection: 0,
      streak: 0,
      limiterFrequency: {},
      dominantLimiter: null,
      weeklyScores: [],
      progressSummary: 'No data available yet. Complete your first analysis.',
      prediction: null,
      avgScore: 0,
      totalSessions: 0,
      scoreChange: 0,
    };
  }

  const sorted = [...sessions].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // newest first
  });

  // Filter to unique calendar days (latest session per day)
  const uniqueSessions = [];
  const seenDates = new Set();
  const getSimpleDate = (sec) => {
    const d = new Date(sec * 1000);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  };

  for (const session of sorted) {
    if (!session.createdAt) continue;
    const dateStr = getSimpleDate(session.createdAt.seconds);
    if (!seenDates.has(dateStr)) {
      seenDates.add(dateStr);
      uniqueSessions.push(session);
    }
  }

  const totalSessions = uniqueSessions.length;

  // ── SCORES EXTRACTION ──
  const scores = uniqueSessions.map(s => s.output?.summary?.score ?? 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // ── TREND DETECTION ──
  // Compare recent 3 vs previous 3 (or available)
  const trend = detectTrend(scores);

  // ── SCORE CHANGE (latest vs first) ──
  const scoreChange = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

  // ── STREAK TRACKING ──
  // Streak logic already handles unique days internally, but we can pass uniqueSessions
  const streak = calculateStreak(uniqueSessions);

  // ── LIMITER FREQUENCY ──
  const limiterFrequency = {};
  for (const session of uniqueSessions) {
    const limiter = session.primaryLimiter || session.output?.summary?.limiter;
    if (limiter) {
      limiterFrequency[limiter] = (limiterFrequency[limiter] || 0) + 1;
    }
  }

  // Dominant limiter
  let dominantLimiter = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(limiterFrequency)) {
    if (count > maxCount) {
      maxCount = count;
      dominantLimiter = key;
    }
  }

  // ── WEEKLY SCORES (Mon - Sun) ──
  const weeklyScores = calculateWeeklyScores(uniqueSessions);

  // ── MONTHLY SCORES (1 - End of Month) ──
  const monthlyScores = calculateMonthlyScores(uniqueSessions);

  // ── YEARLY SCORES (W1 - W52) ──
  const yearlyScores = calculateYearlyAverages(uniqueSessions);

  // ── PROGRESS SUMMARY ──
  const progressSummary = generateProgressSummary(trend, avgScore, dominantLimiter, streak, totalSessions, scoreChange);

  // ── PREDICTION ──
  const prediction = generatePrediction(trend, dominantLimiter, avgScore, scores);

  // ── HISTORICAL LIMITER INSIGHT (7-day window) ──
  const limiterInsight = generateLimiterInsight(uniqueSessions);

  return {
    trend: trend.label,
    trendDirection: trend.direction,
    streak,
    limiterFrequency,
    dominantLimiter,
    weeklyScores,
    monthlyScores,
    yearlyScores,
    progressSummary,
    prediction,
    limiterInsight,
    avgScore,
    totalSessions,
    scoreChange,
  };
}

// ═══════════════════════════════════════════════════════
// TREND DETECTION
// ═══════════════════════════════════════════════════════

function detectTrend(scores) {
  if (scores.length < 2) return { label: 'Insufficient Data', direction: 0 };

  const recentCount = Math.min(3, Math.floor(scores.length / 2));
  const recent = scores.slice(0, recentCount);
  const previous = scores.slice(recentCount, recentCount * 2);

  if (previous.length === 0) return { label: 'Insufficient Data', direction: 0 };

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  const diff = recentAvg - prevAvg;

  if (diff > 5) return { label: 'Improving', direction: 1 };
  if (diff < -5) return { label: 'Declining', direction: -1 };
  return { label: 'Stable', direction: 0 };
}

// ═══════════════════════════════════════════════════════
// STREAK CALCULATOR
// ═══════════════════════════════════════════════════════

function calculateStreak(sortedSessions) {
  if (!sortedSessions || sortedSessions.length === 0) return 0;
  
  let streak = 0;
  
  const getDateString = (sec) => {
    const d = new Date(sec * 1000);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  };

  const uniqueDays = [];
  
  for (const session of sortedSessions) {
    if (!session.createdAt) continue;
    const dateStr = getDateString(session.createdAt.seconds);
    
    if (uniqueDays.length === 0 || uniqueDays[uniqueDays.length - 1].dateStr !== dateStr) {
      uniqueDays.push({
        dateStr,
        score: session.output?.summary?.score ?? 0,
        seconds: session.createdAt.seconds
      });
    }
  }

  for (let i = 0; i < uniqueDays.length; i++) {
    const day = uniqueDays[i];
    
    if (day.score >= 60) {
      streak++;
    } else {
      break; 
    }

    if (i < uniqueDays.length - 1) {
      const currentDay = new Date(day.seconds * 1000);
      currentDay.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(uniqueDays[i+1].seconds * 1000);
      nextDay.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(currentDay - nextDay);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        break;
      }
    }
  }

  return streak;
}

// ═══════════════════════════════════════════════════════
// PROGRESS SUMMARY
// ═══════════════════════════════════════════════════════

function generateProgressSummary(trend, avgScore, dominantLimiter, streak, totalSessions, scoreChange) {
  if (totalSessions === 1) {
    return 'First session recorded. Continue logging to unlock trend analysis and pattern detection.';
  }

  if (totalSessions < 3) {
    return `${totalSessions} sessions recorded. CORE needs a few more data points to identify reliable patterns.`;
  }

  const parts = [];

  // Trend
  if (trend.direction === 1) {
    parts.push(`Your trajectory is improving — recent sessions show measurable gains.`);
  } else if (trend.direction === -1) {
    parts.push(`Your trajectory is declining — recent sessions show regression from earlier performance.`);
  } else {
    parts.push(`Your performance is holding steady — no significant shifts detected.`);
  }

  // Dominant limiter
  if (dominantLimiter) {
    parts.push(`${dominantLimiter} has been your most frequent bottleneck.`);
  }

  // Streak
  if (streak >= 3) {
    parts.push(`${streak}-session streak of scoring 60+.`);
  }

  // Score change
  if (Math.abs(scoreChange) >= 5) {
    const dir = scoreChange > 0 ? 'up' : 'down';
    parts.push(`Score moved ${dir} ${Math.abs(scoreChange)} points from first to latest session.`);
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════
// PREDICTION ENGINE
// ═══════════════════════════════════════════════════════

function generatePrediction(trend, dominantLimiter, avgScore, scores) {
  if (scores.length < 3) return null;

  const predictions = [];

  if (dominantLimiter === 'Recovery') {
    predictions.push({ text: 'If sleep improves to 7+ hours → expected +5–8 score increase', impact: 'high' });
  }
  if (dominantLimiter === 'Energy') {
    predictions.push({ text: 'If caloric alignment tightens → expected +4–7 score increase', impact: 'high' });
  }
  if (dominantLimiter === 'Training') {
    predictions.push({ text: 'If workout volume reaches 45+ min → expected +5–10 score increase', impact: 'high' });
  }
  if (dominantLimiter === 'Consistency') {
    predictions.push({ text: 'If adherence stabilizes above 80% → expected +6–12 score increase', impact: 'high' });
  }

  if (trend.direction === 1) {
    predictions.push({ text: 'Current upward trajectory projects continued improvement if sustained', impact: 'medium' });
  } else if (trend.direction === -1) {
    predictions.push({ text: 'Without intervention, expect further decline over the next 5–7 days', impact: 'high' });
  }

  return predictions.length > 0 ? predictions : null;
}

// ═══════════════════════════════════════════════════════
// HISTORICAL LIMITER INSIGHT (7-Day Pattern Analysis)
// ═══════════════════════════════════════════════════════

function generateLimiterInsight(uniqueSessions) {
  if (!uniqueSessions || uniqueSessions.length === 0) {
    return {
      heading: 'No pattern detected yet',
      description: 'Run your first analysis to start uncovering what\'s limiting your progress.',
      limiter: null,
      confidence: 'none',
    };
  }

  // Filter to the last 7 calendar days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recent = uniqueSessions.filter(s => {
    if (!s.createdAt) return false;
    return new Date(s.createdAt.seconds * 1000) >= sevenDaysAgo;
  });

  const dataSource = recent.length > 0 ? recent : uniqueSessions.slice(0, 7);
  const isLimitedData = dataSource.length <= 2;

  // Count limiter frequency, tracking most recent per limiter
  const limiterMap = {};
  for (let i = 0; i < dataSource.length; i++) {
    const s = dataSource[i];
    const limiter = s.primaryLimiter || s.output?.summary?.limiter;
    if (!limiter) continue;
    if (!limiterMap[limiter]) {
      limiterMap[limiter] = { count: 0, mostRecentIndex: i };
    }
    limiterMap[limiter].count++;
  }

  if (Object.keys(limiterMap).length === 0) {
    return {
      heading: 'Pattern analysis pending',
      description: 'Complete a full analysis to identify your primary performance bottleneck.',
      limiter: null,
      confidence: 'none',
    };
  }

  // Find dominant limiter — break ties by most recent occurrence
  let dominant = null;
  let maxCount = 0;
  for (const [key, val] of Object.entries(limiterMap)) {
    if (val.count > maxCount || (val.count === maxCount && val.mostRecentIndex < limiterMap[dominant]?.mostRecentIndex)) {
      maxCount = val.count;
      dominant = key;
    }
  }

  // Compute personal averages from session inputs
  const inputs = dataSource.map(s => s.inputs).filter(Boolean);
  const avg = (key, parser = parseFloat) => {
    const vals = inputs.map(i => parser(i?.[key] ?? 0)).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  const avgCals    = avg('calories', parseInt);
  const avgSleep   = avg('sleep');
  const avgWorkout = avg('workout', parseInt);
  const avgConsist = avg('consistency', parseInt);
  const workoutDays = dataSource.filter(s => (s.inputs?.workout ?? 0) > 0).length;

  const confidence = isLimitedData ? 'limited' : maxCount >= 3 ? 'high' : 'moderate';

  // Generate personalized heading + description
  const insights = {
    Energy: {
      heading: 'Energy is limiting your progress',
      description: avgCals
        ? `Your average intake of ${avgCals} kcal/day appears misaligned with your training volume. Adjust by 300–500 kcal/day to restore metabolic equilibrium and unlock sustained output.`
        : 'Your caloric intake isn\'t matching your training volume. Tighten the alignment between intake and expenditure to remove this bottleneck.',
    },
    Recovery: {
      heading: 'Recovery is holding you back',
      description: avgSleep
        ? `You\'re averaging ${avgSleep}h of sleep — below the 7–9h threshold for optimal tissue repair and CNS recovery. Add ${Math.max(0, (7 - avgSleep)).toFixed(1)}h per night to restore adaptation capacity.`
        : 'Sleep duration is consistently insufficient for recovery. Prioritize extending your sleep window to 7–9 hours to support biological adaptation.',
    },
    Training: {
      heading: 'Training stimulus is insufficient',
      description: avgWorkout
        ? `Your average session length of ${avgWorkout} min is below the threshold needed to force systemic adaptation. Target 45–60 min of structured work to generate a meaningful stimulus.`
        : 'Training volume is sub-threshold. Increase structured session duration or frequency to trigger progressive adaptation.',
    },
    Consistency: {
      heading: 'Consistency is your bottleneck',
      description: avgConsist !== null
        ? `Protocol adherence at ${avgConsist}% disrupts the biological feedback loop. You\'ve trained ${workoutDays} of the last ${dataSource.length} days. Reach 5–6 active days per week to unlock compounding gains.`
        : `You\'ve been active ${workoutDays} of the last ${dataSource.length} days. Aim for 5–6 days of consistent execution to unlock compounding physiological gains.`,
    },
  };

  const insight = insights[dominant] ?? {
    heading: `${dominant} is your primary limiter`,
    description: `${dominant} has appeared as your primary bottleneck across ${maxCount} of your last ${dataSource.length} sessions. Focus on correcting this to drive measurable progress.`,
  };

  return {
    heading: insight.heading,
    description: insight.description,
    limiter: dominant,
    confidence,
    sessionCount: dataSource.length,
    dominantCount: maxCount,
  };
}

/**
 * Helper: Get current date in IST
 */
function getISTNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Helper: Convert any date/timestamp to IST Date object (for comparison)
 */
function toISTDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput.seconds * 1000);
  return new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Generate score series for current week (Mon - Sun)
 */
function calculateWeeklyScores(uniqueSessions) {
  const now = getISTNow();
  const day = now.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMon);
  start.setHours(0,0,0,0);

  const scores = [];
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = fmt.format(d);

    const session = uniqueSessions.find(s => {
      if (!s.createdAt) return false;
      return fmt.format(new Date(s.createdAt.seconds * 1000)) === dateStr;
    });

    scores.push({
      score: session ? (session.output?.summary?.score ?? 0) : null,
      date: new Date(d)
    });
  }
  return scores;
}

/**
 * Generate score series for current month (1st - End)
 */
function calculateMonthlyScores(uniqueSessions) {
  const now = getISTNow();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = end.getDate();

  const scores = [];
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = fmt.format(d);

    const session = uniqueSessions.find(s => {
      if (!s.createdAt) return false;
      return fmt.format(new Date(s.createdAt.seconds * 1000)) === dateStr;
    });

    scores.push({
      score: session ? (session.output?.summary?.score ?? 0) : null,
      date: new Date(d)
    });
  }
  return scores;
}

/**
 * Group sessions into 52 weekly averages for Year view (Jan - Dec)
 */
function calculateYearlyAverages(uniqueSessions) {
  if (!uniqueSessions || uniqueSessions.length === 0) return [];
  
  const nowIST = getISTNow();
  const yearStart = new Date(nowIST.getFullYear(), 0, 1, 0, 0, 0, 0);
  const weeks = [];

  for (let i = 0; i < 52; i++) {
    const start = new Date(yearStart);
    start.setDate(yearStart.getDate() + (i * 7));
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const sessionsInWeek = uniqueSessions.filter(s => {
      const d = toISTDate(s.createdAt);
      return d >= start && d <= end;
    });

    if (sessionsInWeek.length > 0) {
      const avg = Math.round(sessionsInWeek.reduce((a, b) => a + (b.output?.summary?.score ?? 0), 0) / sessionsInWeek.length);
      weeks.push({ score: avg, date: new Date(start) });
    } else {
      weeks.push({ score: null, date: new Date(start) });
    }
  }

  return weeks; // January is index 0 (Left), December is index 51 (Right)
}

/**
 * Format a Firestore timestamp to readable date string (IST)
 */
export function formatSessionDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp.seconds * 1000);
  
  // Get current time in IST
  const now = new Date();
  
  // Helper to get day start in IST
  const getDayStart = (d) => {
    const s = d.toLocaleString('en-US', { timeZone: TIMEZONE });
    const day = new Date(s);
    day.setHours(0, 0, 0, 0);
    return day;
  };

  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return hours === 0 ? 'Just now' : `${hours}h ago`;
  }

  const sessionDay = getDayStart(date);
  const today = getDayStart(now);
  const diffDays = Math.round((today - sessionDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', { 
    timeZone: TIMEZONE,
    month: 'short', 
    day: 'numeric' 
  });
}
