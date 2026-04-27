// ⚔️ CORE ENGINE — AI DECISION SYSTEM (STRICT SPEC)

// ═══════════════════════════════════════════════════════
// LANGUAGE VARIANTS (SCORE-LOCKED)
// ═══════════════════════════════════════════════════════

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

function scoreToBucket(score) {
  if (score < 50) return 'weak';
  if (score <= 75) return 'moderate';
  return 'strong';
}

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
  if (c >= 90) return Math.min(100, c);
  if (c >= 75) return c;
  if (c >= 60) return c;
  if (c >= 40) return c;
  return Math.max(10, c);
}

export function runCoreEngine(input) {
  const { weight, height, age, calories, workout, sleep, consistency } = input;

  const bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78;
  const totalBurn = (bmr * 1.2) + (workout * 7);
  const balance = calories - totalBurn;
  const deviation = Math.abs(balance);

  const energyScore      = normalizeEnergy(balance);
  const recoveryScore    = normalizeRecovery(sleep);
  const trainingScore    = normalizeTraining(workout);
  const consistencyScore = normalizeConsistency(consistency);

  let score = Math.round(
    (energyScore      * 0.30) +
    (recoveryScore    * 0.25) +
    (trainingScore    * 0.25) +
    (consistencyScore * 0.20)
  );

  const allScores = [energyScore, recoveryScore, trainingScore, consistencyScore];
  const minComponent = Math.min(...allScores);

  if (minComponent < 50) score = Math.min(score, 75);
  if (minComponent < 30) score = Math.min(score, 60);
  if (deviation > 600) score = Math.max(0, score - 10);
  if (sleep < 5) score = Math.max(0, score - 10);
  if (consistency < 50) score = Math.max(0, score - 10);

  score = Math.max(0, Math.min(100, score));

  let state = "POOR";
  if (score >= 80) state = "OPTIMAL";
  else if (score >= 70) state = "GOOD";
  else if (score >= 60) state = "MAINTENANCE";
  else if (score >= 40) state = "LOW";

  const components = [
    { name: "Energy",      score: energyScore },
    { name: "Recovery",    score: recoveryScore },
    { name: "Training",    score: trainingScore },
    { name: "Consistency", score: consistencyScore }
  ];
  components.sort((a, b) => a.score - b.score);
  const limiter = components[0];

  let confidence = "Low Protocol Confidence";
  if (consistency >= 80) confidence = "High Protocol Confidence";
  else if (consistency >= 60) confidence = "Medium Protocol Confidence";

  const rBucket = scoreToBucket(recoveryScore);
  const tBucket = scoreToBucket(trainingScore);

  const energyState = balance > 150 ? "Surplus" : balance < -150 ? "Deficit" : "Neutral";
  const energyReason = balance > 150 ? "intake exceeds expenditure" : balance < -150 ? "intake below expenditure" : "intake ≈ expenditure";

  const analysis = {
    energy: {
      val: energyState,
      explanation: energyReason
    },
    recovery: {
      val: rBucket === 'strong' ? 'Well aligned' : rBucket === 'moderate' ? 'Stable' : 'Limiting',
      explanation: pick(languageBank.recovery[rBucket]).split('(')[1]?.replace(')', '') || pick(languageBank.recovery[rBucket])
    },
    training: {
      val: tBucket === 'strong' ? 'Effective' : tBucket === 'moderate' ? 'Adequate' : 'Insufficient',
      explanation: pick(languageBank.training[tBucket]).split('(')[1]?.replace(')', '') || pick(languageBank.training[tBucket])
    },
    consistency: {
      val: `${consistency}%`,
      explanation: consistency >= 90 ? "elite adherence" : consistency >= 75 ? "stable execution" : "variable protocol compliance"
    }
  };

  const findings = [];
  let greenCount = 0;

  for (const comp of components) {
    const bucket = scoreToBucket(comp.score);
    let type, text;

    if (comp.name === "Energy") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Severe energy deviation suggests a high risk of metabolic friction, likely blunting progression.`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Moderate energy deviation appears to be manageable, though tighter alignment could improve efficiency.`;
      } else {
        type = greenCount < 2 ? 'good' : 'average';
        if (type === 'good') greenCount++;
        text = `Energy intake is well aligned with expenditure, supporting stable baseline function.`;
      }
    } else if (comp.name === "Recovery") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Insufficient sleep duration likely bottlenecks adaptation, restricting tissue repair.`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Current sleep volume appears adequate for baseline function, but may restrict peak adaptation.`;
      } else {
        type = greenCount < 2 ? 'good' : 'average';
        if (type === 'good') greenCount++;
        text = `Recovery patterns are highly effective, suggesting an optimized state for systemic adaptation.`;
      }
    } else if (comp.name === "Training") {
      if (bucket === 'weak') {
        type = 'poor';
        text = `Sub-threshold mechanical stimulus fails to force adaptation, leading to systemic stagnation.`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Moderate training load sustains current state, but appears insufficient for rapid progression.`;
      } else {
        type = greenCount < 2 ? 'good' : 'average';
        if (type === 'good') greenCount++;
        text = `Mechanical stimulus is strong, driving effective hypertrophy and metabolic progression.`;
      }
    } else { // Consistency
      if (bucket === 'weak') {
        type = 'poor';
        text = `Frequent protocol deviation disrupts the biological feedback loop, rendering inputs ineffective.`;
      } else if (bucket === 'moderate') {
        type = 'average';
        text = `Variable adherence limits compounding gains, suggesting a need for tighter execution.`;
      } else {
        type = greenCount < 2 ? 'good' : 'average';
        if (type === 'good') greenCount++;
        text = `Strict adherence ensures inputs compound effectively, maximizing long-term biological gains.`;
      }
    }
    findings.push({ type, text });
  }

  if (consistency < 60 && limiter.name !== "Consistency") {
    const hasConsistency = findings.some(f => f.text.includes("adherence") || f.text.includes("deviation"));
    if (!hasConsistency) {
      findings.splice(1, 0, { type: 'poor', text: `Frequent protocol deviation disrupts the biological feedback loop, rendering inputs ineffective.` });
    }
  }

  const actions = [];
  if (limiter.name === "Energy") {
    if (balance > 0) actions.push(`Reduce caloric intake to align with daily expenditure and restore metabolic equilibrium.`);
    else actions.push(`Increase caloric intake to prevent catabolism and restore baseline energy availability.`);
  } else if (limiter.name === "Recovery") {
    actions.push(`Expand sleep window to 7–8 hours to restore central nervous system function and tissue repair.`);
  } else if (limiter.name === "Training") {
    actions.push(`Increase structured training intensity or volume to restore biological progression stimulus.`);
  } else if (limiter.name === "Consistency") {
    actions.push(`Strictly adhere to baseline protocol for 7 days to restore predictable biological feedback.`);
  }

  let tagline;
  if (score > 80) {
    tagline = `System stable based on current pattern; minor friction from ${limiter.name.toLowerCase()} limits absolute peak.`;
  } else if (score >= 60) {
    tagline = `System stable but not progressing efficiently; ${limiter.name.toLowerCase()} bottleneck is actively restricting adaptation.`;
  } else {
    tagline = `System underperforming due to critical bottlenecks; ${limiter.name.toLowerCase()} failure is driving systemic decline.`;
  }

  let trend = "Stable Pattern";
  let prediction = "If continued, expect compounding positive adaptation.";
  if (score > 75 && consistency > 80) {
    trend = "Improving Signal";
    prediction = "If continued, expect accelerated physical progression.";
  } else if (score < 50 || consistency < 60) {
    trend = "Declining State";
    prediction = "If continued, expect further systemic degradation and fatigue.";
  } else if (score >= 50 && score <= 75) {
    trend = "Stagnant Pattern";
    prediction = "If continued, expect no meaningful biological change.";
  }

  return {
    summary: {
      score,
      state,
      tagline,
      limiter: limiter.name,
      confidence,
      trend,
      prediction
    },
    analysis,
    findings: findings.slice(0, 3),
    actions
  };
}