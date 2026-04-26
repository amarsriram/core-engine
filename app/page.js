"use client";

import { useState, useEffect } from 'react';
import { runCoreEngine } from './lib/coreEngine';

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

  useEffect(() => {
    if (step === 3 && result) {
      let current = 0;
      const target = result.summary.score;
      const increment = target / (1000 / 16);
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setDisplayScore(target);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.floor(current));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [step, result]);

  const validate = () => {
    let newErrors = {};
    if (step === 1) {
      if (inputs.weight && (inputs.weight < 30 || inputs.weight > 200)) newErrors.weight = "Invalid weight (30–200 kg)";
      if (inputs.height && (inputs.height < 120 || inputs.height > 220)) newErrors.height = "Invalid height (120–220 cm)";
      if (inputs.age && (inputs.age < 10 || inputs.age > 80)) newErrors.age = "Invalid age (10–80)";
    } else if (step === 2) {
      if (inputs.calories && (inputs.calories < 800 || inputs.calories > 5000)) newErrors.calories = "Invalid calories (800–5000)";
      if (inputs.workout && (inputs.workout < 0 || inputs.workout > 180)) newErrors.workout = "Invalid workout (0–180 min)";
      if (inputs.sleep && (inputs.sleep < 0 || inputs.sleep > 12)) newErrors.sleep = "Invalid sleep (0–12 hrs)";
      if (inputs.consistency && (inputs.consistency < 0 || inputs.consistency > 100)) newErrors.consistency = "Invalid consistency (0–100%)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateInput = (key, val) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    validate();
  }, [inputs, step]);

  const isStep1Valid = inputs.weight && inputs.height && inputs.age && !errors.weight && !errors.height && !errors.age;
  const isStep2Valid = inputs.calories && inputs.workout && inputs.sleep && inputs.consistency && 
                       !errors.calories && !errors.workout && !errors.sleep && !errors.consistency;

  const handleAnalyze = async () => {
    setProcessingState(1);
    setStep('loading'); // Dedicated state to hide forms
    setProcessingMessage('LOGGING BIOLOGICAL SIGNALS...');
    setTimeout(() => setProcessingMessage('MAPPING METABOLIC LOAD...'), 800);
    setTimeout(() => setProcessingMessage('ASSEMBLING ENGINE DIAGNOSIS...'), 1600);
    setTimeout(() => {
      const res = runCoreEngine(inputs);
      setResult(res);
      setStep(3);
      setProcessingState(0);
    }, 2400);
  };

  const reset = () => {
    setStep(0);
    setInputs({ weight: '', height: '', age: '', calories: '', workout: '', sleep: '', consistency: '' });
    setResult(null);
  };

  return (
    <main className="container">
      <div className="bg-system">
        <div className="energy-glow"></div>
      </div>
      <div className="bg-overlay"></div>
      
      {/* LANDING SCREEN (STEP 0) */}
      {step === 0 && (
        <div className="reveal" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="header-logo large">CORE</div>
          <h2 className="tagline">Translate your body into insight</h2>
          <p className="explanation">
            CORE analyzes your daily biological signals and reveals what is actually happening inside your body.
          </p>

          <div className="engine-flow">
            <div className="flow-box">
              <h3>Inputs</h3>
              <p>Log your biological signals—weight, calories, sleep, and training. The engine begins its observation.</p>
              <div className="visual-inputs">
                <Counter />
                <div style={{ fontSize: '0.6rem', opacity: 0.3, color: '#fff' }}>LOGGING...</div>
              </div>
            </div>

            <div className="flow-box">
              <h3>Analysis</h3>
              <p>CORE processes signals across energy and recovery vectors, mapping your stress-to-rest ratio.</p>
              <div className="visual-analysis">
                <div className="flowing-line"></div>
                <div className="flowing-line"></div>
                <div className="flowing-line"></div>
              </div>
            </div>

            <div className="flow-box">
              <h3>Outcome</h3>
              <p>Reveals a clear score, biological state, and the hidden bottlenecks holding you back.</p>
              <div className="visual-outcome">
                <div className="outcome-score">8.4</div>
                <div style={{ fontSize: '0.5rem', opacity: 0.3, marginTop: '4px', color: '#fff' }}>READY</div>
              </div>
            </div>
          </div>

          <button className="btn-liquid" onClick={() => setStep(1)}>
            <div className="liquid"></div>
            <span>Start Analysing</span>
          </button>
        </div>
      )}

      {/* STEP 1: PROFILE */}
      {step === 1 && (
        <div className="reveal form-container">
          <div className="header-logo compact">CORE</div>
          <h1 style={{ fontSize: '1.2rem', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>Biological Baseline</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="field-group">
              <label className="field-label">Weight (kg)</label>
              <input type="number" className={`input-field ${errors.weight ? 'invalid' : ''}`} placeholder="30–200" value={inputs.weight} onChange={(e) => updateInput('weight', e.target.value)} />
              <div className="error-msg">{errors.weight}</div>
            </div>
            <div className="field-group">
              <label className="field-label">Height (cm)</label>
              <input type="number" className={`input-field ${errors.height ? 'invalid' : ''}`} placeholder="120–220" value={inputs.height} onChange={(e) => updateInput('height', e.target.value)} />
              <div className="error-msg">{errors.height}</div>
            </div>
            <div className="field-group">
              <label className="field-label">Age</label>
              <input type="number" className={`input-field ${errors.age ? 'invalid' : ''}`} placeholder="10–80" value={inputs.age} onChange={(e) => updateInput('age', e.target.value)} />
              <div className="error-msg">{errors.age}</div>
            </div>
          </div>

          <button className="btn-base" disabled={!isStep1Valid} onClick={() => setStep(2)}>Continue →</button>
          <button className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
        </div>
      )}

      {/* STEP 2: DAILY SIGNALS */}
      {step === 2 && (
        <div className="reveal form-container">
          <div className="header-logo compact">CORE</div>
          <h1 style={{ fontSize: '1.2rem', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>Daily Signals</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="field-group">
              <label className="field-label">Calories</label>
              <input type="number" className={`input-field ${errors.calories ? 'invalid' : ''}`} placeholder="800–5000" value={inputs.calories} onChange={(e) => updateInput('calories', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Workout (min)</label>
              <input type="number" className={`input-field ${errors.workout ? 'invalid' : ''}`} placeholder="0–180" value={inputs.workout} onChange={(e) => updateInput('workout', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Sleep (hrs)</label>
              <input type="number" className={`input-field ${errors.sleep ? 'invalid' : ''}`} placeholder="0–12" value={inputs.sleep} onChange={(e) => updateInput('sleep', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Consistency (%)</label>
              <input type="number" className={`input-field ${errors.consistency ? 'invalid' : ''}`} placeholder="0–100" value={inputs.consistency} onChange={(e) => updateInput('consistency', e.target.value)} />
            </div>
          </div>
          <div className="error-msg" style={{ gridColumn: 'span 2' }}>{errors.calories || errors.workout || errors.sleep || errors.consistency}</div>

          <button className="btn-base" disabled={!isStep2Valid} onClick={handleAnalyze}>Analyze Signals →</button>
          <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
        </div>
      )}

      {/* PROCESSING STATE */}
      {processingState === 1 && (
        <div className="reveal processing-container">
          <div className="header-logo compact">CORE</div>
          <p className="processing-text">{processingMessage}</p>
          <div className="processing-bar">
            <div className="processing-progress"></div>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS (3-PANEL SYSTEM) */}
      {step === 3 && result && (
        <div className="reveal output-layout">
          
          {/* LEFT PANEL: WHERE YOU STAND */}
          <div className="panel-left">
            <h3 className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Where You Stand</h3>
            
            <div className={`scale-box ${result.summary.score >= 80 ? 'active excellent' : ''}`}>
              <span className="scale-label" style={{ color: result.summary.score >= 80 ? 'var(--success)' : '' }}>Optimal</span>
              <span className="scale-range">80–100</span>
            </div>
            <div className={`scale-box ${(result.summary.score >= 70 && result.summary.score < 80) ? 'active good' : ''}`}>
              <span className="scale-label" style={{ color: (result.summary.score >= 70 && result.summary.score < 80) ? 'var(--success)' : '' }}>Good</span>
              <span className="scale-range">70–80</span>
            </div>
            <div className={`scale-box ${(result.summary.score >= 60 && result.summary.score < 70) ? 'active moderate' : ''}`}>
              <span className="scale-label" style={{ color: (result.summary.score >= 60 && result.summary.score < 70) ? '#FBBF24' : '' }}>Maintenance</span>
              <span className="scale-range">60–70</span>
            </div>
            <div className={`scale-box ${(result.summary.score >= 40 && result.summary.score < 60) ? 'active low' : ''}`}>
              <span className="scale-label" style={{ color: (result.summary.score >= 40 && result.summary.score < 60) ? 'var(--accent)' : '' }}>Low</span>
              <span className="scale-range">40–60</span>
            </div>
            <div className={`scale-box ${result.summary.score < 40 ? 'active poor' : ''}`}>
              <span className="scale-label" style={{ color: result.summary.score < 40 ? 'var(--error)' : '' }}>Poor</span>
              <span className="scale-range">0–40</span>
            </div>
            
            <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={reset}>← Reset Engine</button>
          </div>

          {/* CENTER PANEL: CORE STATE (HERO) */}
          <div className="panel-center">
            <div className="header-logo compact" style={{ marginBottom: 0 }}>CORE</div>
            
            <div className="donut-container" style={{ '--offset': 440 - (440 * result.summary.score) / 100 }}>
              <svg className="donut-svg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <circle className="donut-bg" cx="80" cy="80" r="70" />
                <circle className="donut-fill" cx="80" cy="80" r="70" />
              </svg>
              <div className="hero-score" style={{ position: 'absolute' }}>{displayScore}</div>
            </div>

            <div>
              <div className="hero-state">{result.summary.state}</div>
              <p className="hero-tagline">{result.summary.tagline}</p>
            </div>

            <div className="hero-trend" style={{ marginTop: '10px' }}>Primary Limiter: {result.summary.limiter}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confidence: {result.summary.confidence}</div>
          </div>

          {/* RIGHT PANEL: PROFESSIONAL ANALYSIS */}
          <div className="panel-right">
            
            <div className="analysis-section" style={{ animationDelay: '0.1s' }}>
              <div className="section-title">System Analysis</div>
              <div className="sys-metric"><span className="sys-label">Energy</span><span className="sys-val" style={{ textTransform: 'none' }}>{result.analysis.energy}</span></div>
              <div className="sys-metric"><span className="sys-label">Recovery</span><span className="sys-val" style={{ textTransform: 'none' }}>{result.analysis.recovery}</span></div>
              <div className="sys-metric"><span className="sys-label">Training</span><span className="sys-val" style={{ textTransform: 'none' }}>{result.analysis.training}</span></div>
              <div className="sys-metric"><span className="sys-label">Consistency</span><span className="sys-val" style={{ textTransform: 'none' }}>{result.analysis.consistency}</span></div>
            </div>

            <div className="analysis-section" style={{ animationDelay: '0.2s' }}>
              <div className="section-title">Findings</div>
              {result.findings.map((finding, idx) => (
                <div key={idx} className="finding-item">
                  <div className={`indicator ${finding.type}`}></div>
                  <div className="finding-text">{finding.text}</div>
                </div>
              ))}
            </div>

            <div className="analysis-section" style={{ animationDelay: '0.3s', marginTop: 'auto' }}>
              <div className="section-title">Action</div>
              {result.actions.map((action, idx) => (
                <div key={idx} className="action-item">{action}</div>
              ))}
            </div>

          </div>
        </div>
      )}
    </main>
  );
}

function Counter() {
  const [count, setCount] = useState(24.5);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => (parseFloat(prev) + (Math.random() * 0.2 - 0.1)).toFixed(1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  return <div className="outcome-score" style={{ opacity: 1, animation: 'none' }}>{count}</div>;
}