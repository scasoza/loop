import React, { useMemo } from 'react';
import { Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ComposedChart, ResponsiveContainer, ReferenceLine } from 'recharts';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

const goals = [
  {
    id: 'goal-growth',
    title: 'Increase weekly active collaborators',
    outcome: 'Grow engagement 20% QoQ',
  },
];

const experiments = [
  {
    id: 'exp-onboarding',
    goalId: 'goal-growth',
    hypothesis: 'Guided onboarding boosts first-week activity',
    intervention: 'Show contextual prompts during project setup',
    startDate: '2024-05-01',
    status: 'running',
  },
  {
    id: 'exp-notifications',
    goalId: 'goal-growth',
    hypothesis: 'Notification digests re-engage dormant users',
    intervention: 'Weekly digest email with experiment outcomes',
    startDate: '2024-06-10',
    status: 'planned',
  },
];

const observations = [
  {
    id: 'obs-1',
    experimentId: 'exp-onboarding',
    timestamp: '2024-05-05',
    value: 42,
    confidence: 0.82,
    evidence: 'Higher activation after prompts',
    direction: 'positive',
  },
  {
    id: 'obs-2',
    experimentId: 'exp-onboarding',
    timestamp: '2024-05-12',
    value: 47,
    confidence: 0.76,
    evidence: 'Sustained usage through week two',
    direction: 'positive',
  },
  {
    id: 'obs-3',
    experimentId: 'exp-onboarding',
    timestamp: '2024-05-19',
    value: 45,
    confidence: 0.64,
    evidence: 'Drop after prompt fatigue',
    direction: 'negative',
  },
  {
    id: 'obs-4',
    experimentId: 'exp-notifications',
    timestamp: '2024-06-15',
    value: 15,
    confidence: 0.4,
    evidence: 'Early recipients opened digests',
    direction: 'positive',
  },
];

const interventionEvents = [
  {
    id: 'int-onboarding',
    experimentId: 'exp-onboarding',
    timestamp: '2024-05-01',
    intensity: 1,
  },
  {
    id: 'int-notifications',
    experimentId: 'exp-notifications',
    timestamp: '2024-06-10',
    intensity: 0.6,
  },
];

const statusColors = {
  running: '#2563eb',
  planned: '#9333ea',
  paused: '#f59e0b',
  completed: '#16a34a',
};

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function aggregateConfidence(experimentId) {
  const related = observations.filter((obs) => obs.experimentId === experimentId);
  if (!related.length) return { average: 0, direction: 'neutral' };

  const positive = related.filter((obs) => obs.direction === 'positive').length;
  const negative = related.filter((obs) => obs.direction === 'negative').length;
  const direction = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
  const average =
    related.reduce((sum, obs) => sum + obs.confidence * (obs.direction === 'negative' ? -1 : 1), 0) /
    related.length;

  return { average, direction };
}

function buildTimelineData() {
  const allDates = Array.from(
    new Set([...observations.map((o) => o.timestamp), ...interventionEvents.map((i) => i.timestamp)])
  ).sort();

  return allDates.map((date) => {
    const obs = observations.filter((o) => o.timestamp === date);
    const ints = interventionEvents.filter((i) => i.timestamp === date);
    return {
      date,
      observationValue: obs.length ? obs.reduce((sum, o) => sum + o.value, 0) / obs.length : null,
      interventionIntensity: ints.length ? ints.reduce((sum, i) => sum + i.intensity, 0) : 0,
    };
  });
}

function buildGraph() {
  const nodes = [];
  const edges = [];

  goals.forEach((goal, index) => {
    nodes.push({
      id: goal.id,
      data: { label: goal.title },
      position: { x: 50, y: index * 200 + 40 },
      style: { background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8 },
    });
  });

  experiments.forEach((exp, index) => {
    const confidence = aggregateConfidence(exp.id);
    nodes.push({
      id: exp.id,
      data: {
        label: `${exp.hypothesis}\nIntervention: ${exp.intervention}`,
        status: exp.status,
        confidence,
      },
      position: { x: 380, y: index * 200 + 40 },
      style: { background: '#0ea5e9', color: '#0b1727', padding: 12, borderRadius: 8 },
    });
    edges.push({ id: `${exp.id}-goal`, source: exp.goalId, target: exp.id, animated: true });

    observations
      .filter((obs) => obs.experimentId === exp.id)
      .forEach((obs, obsIndex) => {
        const evidenceId = `evidence-${obs.id}`;
        nodes.push({
          id: evidenceId,
          data: {
            label: `${obs.evidence}\nConfidence: ${(obs.confidence * 100).toFixed(0)}%`,
          },
          position: { x: 740, y: index * 200 + obsIndex * 90 },
          style: { background: '#f8fafc', color: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' },
        });
        edges.push({ id: `${exp.id}-${evidenceId}`, source: exp.id, target: evidenceId });
      });
  });

  return { nodes, edges };
}

function StatusBadge({ status }) {
  return (
    <span className="badge" style={{ backgroundColor: statusColors[status] || '#334155' }}>
      {status}
    </span>
  );
}

function ConfidenceChip({ confidence }) {
  const level = Math.abs(confidence.average);
  const directionColor = confidence.direction === 'positive' ? '#16a34a' : confidence.direction === 'negative' ? '#ef4444' : '#64748b';
  const intensity = Math.min(1, Math.max(0.1, level));
  const background = `${directionColor}${Math.round(intensity * 255)
    .toString(16)
    .padStart(2, '0')}`;

  return (
    <div className="confidence-chip" style={{ borderColor: directionColor, backgroundColor: background }}>
      <div className="confidence-meter" style={{ width: `${(level * 100).toFixed(0)}%` }} />
      <span>{`${(level * 100).toFixed(0)}% ${confidence.direction}`}</span>
    </div>
  );
}

export default function App() {
  const timelineData = useMemo(() => buildTimelineData(), []);
  const graph = useMemo(() => buildGraph(), []);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Experiment ops</p>
          <h1>Observations, interventions, and evidence at a glance</h1>
          <p className="lede">
            Visualize how interventions shift observations over time, map hypotheses to evidence, and gauge confidence in the outcomes
            that matter.
          </p>
        </div>
        <div className="stats">
          {experiments.map((exp) => {
            const confidence = aggregateConfidence(exp.id);
            return (
              <div key={exp.id} className="stat-card">
                <div className="stat-title">{exp.hypothesis}</div>
                <StatusBadge status={exp.status} />
                <p className="stat-subtitle">Intervention: {exp.intervention}</p>
                <ConfidenceChip confidence={confidence} />
              </div>
            );
          })}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Time series</p>
            <h2>Observations vs. interventions</h2>
            <p className="hint">Line shows observation intensity; bars capture intervention strength for each cohort week.</p>
          </div>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={timelineData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis yAxisId="left" label={{ value: 'Observation', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Intervention', angle: 90, position: 'insideRight' }} />
              <Tooltip labelFormatter={formatDate} formatter={(value) => (value !== null ? value : '–')} />
              <Legend />
              <Bar yAxisId="right" dataKey="interventionIntensity" name="Intervention" fill="#a855f7" barSize={28} radius={[6, 6, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="observationValue" name="Observation" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5 }} />
              {interventionEvents.map((event) => (
                <ReferenceLine key={event.id} x={event.timestamp} stroke="#a855f7" strokeDasharray="4 4" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Mindmap</p>
            <h2>Goals → hypotheses → evidence → outcomes</h2>
            <p className="hint">Nodes stay in sync with the experiments and observations listed above.</p>
          </div>
        </div>
        <div className="graph">
          <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView fitViewOptions={{ padding: 0.2 }} nodesDraggable={false} zoomOnScroll={false} zoomOnPinch={false}>
            <Background gap={12} color="#e2e8f0" />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </div>
      </section>
    </div>
  );
}
