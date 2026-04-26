// ⚔️ CORE ENGINE — AI DECISION SYSTEM (STRICT SPEC)

// ═══════════════════════════════════════════════════════
// LANGUAGE VARIANTS (SCORE-LOCKED)
// ═══════════════════════════════════════════════════════

// RULE 6: Language MUST match score bucket
// <50  → weak / insufficient / limiting / bottleneck
// 50-75 → moderate / adequate / could improve
// >75  → strong / effective / well aligned
// RULE 7: BANNED WORDS → perfect, fully, maximum, optimal (unless >85)

const languageBank = {
  energy: {
    weak: [
      "Weak (severe imbalance detected)",
      "Insufficient (energy deviation exceeding limits)",
      "Limiting (intake far from expenditure)"
    ],
    moderate: [
      "Moderate (could improve alignment)",
      "Adequate (manageable deviation)",
      "Moderate (approaching balance)"
    ],
    strong: [
      "Effective (intake well aligned with expenditure)",
      "Strong (energy balance well maintained)",
      "Well aligned (stable energy flow)"
    ]
  },
  recovery: {
    weak: [
      "Weak (sleep duration insufficient)",
      "Insufficient (recovery bottlenecking adaptation)",
      "Limiting (system accumulating fatigue)"
    ],
    moderate: [
      "Moderate (adequate but could improve)",
      "Adequate (supports current load)",
      "Moderate (baseline repair maintained)"
    ],
    strong: [
      "Effective (recovery well aligned with demand)",
      "Strong (supporting consistent adaptation)",
      "Well aligned (circadian rhythm stable)"
    ]
  },
  training: {
    weak: [
      "Weak (insufficient for adaptation)",
      "Insufficient (failing to trigger stimulus)",
      "Limiting (sub-threshold mechanical load)"
    ],
    moderate: [
      "Moderate (limited stimulus)",
      "Adequate (maintains baseline function)",
      "Moderate (sustaining but not progressing)"
    ],
    strong: [
      "Effective (sufficient stimulus detected)",
      "Strong (forcing systemic adaptation)",
      "Well aligned (progressive overload active)"
    ]
  }
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Map score to language bucket (STRICT — RULE 6)
function scoreToBucket(score) {
  if (score < 50) return 'weak';
  if (score <= 75) return 'moderate';
  return 'strong';
}

// ═══════════════════════════════════════════════════════
// 1. HARD NORMALIZATION (STRICT TABLES)
// ═══════════════════════════════════════════════════════

function normalizeEnergy(balance) {
  const dev = Math.abs(balance);
  if (dev <= 150)  return 95;
  if (dev <= 300)  return 82;
  if (dev <= 600)  return 65;
  if (dev <= 1000) return 42;
  return 20;
}

function normalizeRecovery(sleep) {
  if (sleep >= 8)  return 95;
  if (sleep >= 7)  return 85;
  if (sleep >= 6)  return 70;
  if (sleep >= 5)  return 50;
  if (sleep >= 4)  return 30;
  return 10;
}

function normalizeTraining(workout) {
  if (workout >= 60) return 95;
  if (workout >= 45) return 82;
  if (workout >= 20) return 62;
  if (workout > 0)   return 35;
  return 10;
}

function normalizeConsistency(c) {
  // Direct pass-through with floor
  if (c >= 90) return Math.min(100, c);
  if (c >= 75) return c;
  if (c >= 60) return c;
  if (c >= 40) return c;
  return Math.max(10, c);
}

// ═══════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════

export function runCoreEngine(input) {
  const { weight, height, age, calories, workout, sleep, consistency } = input;

  // Derived
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78;
  const totalBurn = (bmr * 1.2) + (workout * 7);
  const balance = calories - totalBurn;
  const deviation = Math.abs(balance);

  // ── 1. COMPONENT SCORING (STRICT NORMALIZATION) ──
  const energyScore      = normalizeEnergy(balance);
  const recoveryScore    = normalizeRecovery(sleep);
  const trainingScore    = normalizeTraining(workout);
  const consistencyScore = normalizeConsistency(consistency);

  // ── 2. WEIGHTED SCORE ──
  let score = Math.round(
    (energyScore      * 0.30) +
    (recoveryScore    * 0.25) +
    (trainingScore    * 0.25) +
    (consistencyScore * 0.20)
  );

  // ── 3. HARD CONSTRAINTS (CRITICAL) ──
  const allScores = [energyScore, recoveryScore, trainingScore, consistencyScore];
  const minComponent = Math.min(...allScores);

  // RULE 1: Failure cap
  if (minComponent < 50) score = Math.min(score, 75);

  // RULE 2: Critical failure
  if (minComponent < 30) score = Math.min(score, 60);

  // RULE 3: Extreme penalties
  if (deviation > 600) score = Math.max(0, score - 10);
  if (sleep < 5) score = Math.max(0, score - 10);

  // RULE 9: Consistency hard impact
  if (consistency < 50) score = Math.max(0, score - 10);

  score = Math.max(0, Math.min(100, score));

  // ── 4. STATE MAPPING (LOCKED) ──
  let state = "POOR";
  if (score >= 80) state = "OPTIMAL";
  else if (score >= 70) state = "GOOD";
  else if (score >= 60) state = "MAINTENANCE";
  else if (score >= 40) state = "LOW";

  // ── 5. PRIMARY LIMITER (EXACT — MIN component) ──
  const components = [
    { name: "Energy",      score: energyScore },
    { name: "Recovery",    score: recoveryScore },
    { name: "Training",    score: trainingScore },
    { name: "Consistency", score: consistencyScore }
  ];
  components.sort((a, b) => a.score - b.score);
  const limiter = components[0];

  // ── 11. CONFIDENCE SYSTEM ──
  let confidence = "Low (inconsistent inputs)";
  if (consistency >= 80) confidence = "High (consistent inputs)";
  else if (consistency >= 60) confidence = "Medium (variable inputs)";

  // ── 6 & 12. SYSTEM ANALYSIS (SCORE-LOCKED LANGUAGE) ──
  const eBucket = scoreToBucket(energyScore);
  const rBucket = scoreToBucket(recoveryScore);
  const tBucket = scoreToBucket(trainingScore);

  const energyState = balance > 150 ? "Surplus" : balance < -150 ? "Deficit" : "Neutral";
  const energyReason = balance > 150 ? "intake exceeds expenditure" : balance < -150 ? "intake below expenditure" : "intake ≈ expenditure";

  const analysis = {
    energy:      `${energyState} (${energyReason})`,
    recovery:    pick(languageBank.recovery[rBucket]),
    training:    pick(languageBank.training[tBucket]),
    consistency: `${consistency}%`
  };

  // ── 8. FINDINGS ENGINE (ORDERED: weakest → strongest) ──
  const findings = [];

  // Walk sorted components (ascending) and generate cause→effect findings
  for (const comp of components) {
    const bucket = scoreToBucket(comp.score);
    let type, text;

    if (comp.name === "Energy") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Energy imbalance is severe (${balance > 0 ? '+' : ''}${Math.round(balance)} kcal), disrupting metabolic stability`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Energy balance is moderate (${balance > 0 ? '+' : ''}${Math.round(balance)} kcal), could improve alignment with expenditure`;
      } else {
        type = 'good';
        text = 'Energy balance is stable, supporting baseline metabolic function';
      }
    } else if (comp.name === "Recovery") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Recovery is insufficient (${sleep}h sleep), limiting adaptation capacity`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Recovery is adequate (${sleep}h sleep), but could restrict peak performance`;
      } else {
        type = 'good';
        text = `Recovery is effective (${sleep}h sleep), supporting consistent adaptation`;
      }
    } else if (comp.name === "Training") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Training stimulus is insufficient (${workout} min), failing to trigger adaptation`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Training stimulus is moderate (${workout} min), restricting progression speed`;
      } else {
        type = 'good';
        text = `Training stimulus is effective (${workout} min), driving systemic adaptation`;
      }
    } else { // Consistency
      if (bucket === 'weak') {
        type = 'poor';
        text = `Consistency is a bottleneck (${consistency}%), disrupting the biological feedback loop`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Consistency is moderate (${consistency}%), limiting compounding adaptation`;
      } else {
        type = 'good';
        text = `Consistency is strong (${consistency}%), ensuring compounding biological gains`;
      }
    }

    findings.push({ type, text });
  }

  // RULE 9: Force consistency into findings if <60 and not already limiter
  if (consistency < 60 && limiter.name !== "Consistency") {
    const hasConsistency = findings.some(f => f.text.includes("Consistency"));
    if (!hasConsistency) {
      findings.splice(1, 0, { type: 'poor', text: `Consistency is a bottleneck (${consistency}%), disrupting the biological feedback loop` });
    }
  }

  // ── 10. ACTION ENGINE (DIRECT LIMITER → ACTION) ──
  const actions = [];

  if (limiter.name === "Energy") {
    if (balance > 0) {
      actions.push(`Reduce intake by ${Math.min(300, Math.max(150, Math.round(deviation / 3)))} kcal to align with expenditure`);
    } else {
      actions.push(`Increase intake by ${Math.min(300, Math.max(150, Math.round(deviation / 3)))} kcal to stabilize energy availability`);
    }
  } else if (limiter.name === "Recovery") {
    actions.push('Increase sleep to 7–8 hours with a consistent pre-sleep routine');
  } else if (limiter.name === "Training") {
    actions.push('Increase training intensity or volume to force deeper adaptation');
  } else if (limiter.name === "Consistency") {
    actions.push('Improve adherence to daily routine before adjusting other variables');
  }

  // ── 13. CENTER PANEL TAGLINE (SCORE-LOCKED) ──
  let tagline;
  if (score > 80) {
    tagline = "System operating near optimal balance across inputs";
  } else if (score >= 60) {
    tagline = "System stable but not progressing efficiently";
  } else {
    tagline = "System underperforming due to critical bottlenecks";
  }

  // ── 14. RETURN FINAL OUTPUT ──
  return {
    summary: {
      score,
      state,
      tagline,
      limiter: limiter.name,
      confidence
    },
    analysis,
    findings,
    actions
  };
}