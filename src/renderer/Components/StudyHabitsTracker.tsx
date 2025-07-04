import React, { useState, useEffect } from 'react';
import CloseButton from './CloseButton';
import { config } from '../config';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import './StudyHabitsTracker.css';

interface TimeSeriesPoint { start: number; duration: number; ratio: number; }
interface AnalysisData {
  totalDuration: number;
  attentiveDuration: number;
  attentionRatio: number;
  distractionCount: number;
  avgDistractionDuration: number;
  timeSeries: TimeSeriesPoint[];
  startCycleSlump: boolean;
  endCycleFatigue: boolean;
  summary: string;
}
interface StudyHabitsTrackerProps {
  onClose?: () => void;
  data?: AnalysisData;
}

const StudyHabitsTracker: React.FC<StudyHabitsTrackerProps> = ({ onClose, data }) => {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(data || null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!data) {
      setLoading(true);
      const api = (window as any).electronAPI;
      // Prefer IPC analyzeSession to bypass CORS and use local session data
      if (api?.analyzeSession) {
        console.log('[StudyHabitsTracker] using IPC analyzeSession');
        api.analyzeSession()
          .then((json: AnalysisData) => {
            console.log('[StudyHabitsTracker] analysis data (IPC):', json);
            setAnalysis(json);
            setLoading(false);
          })
          .catch((error: any) => {
            console.error('[StudyHabitsTracker] analyzeSession error:', error);
            setLoading(false);
          });
      } else {
        console.log(`[StudyHabitsTracker] POSTing analysis payload to ${config.analyzeEndpoint}`);
        const payload = {
          id: "2025-07-03_2007",
          startTime: 1751573261359,
          config: { duration: 5, breakInterval: 10, cycles: 2, goal: "Focus Session", tags: ["focus"] },
          logs: [
            { timestamp: 1751573269241, status: "attentive", confidence: 0.95 },
            { timestamp: 1751573271892, status: "attentive", confidence: 0.95 },
            { timestamp: 1751573276663, status: "not_attentive", confidence: 0.1 }
          ],
          endTime: 1751573278392
        };
        fetch(config.analyzeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(async res => {
            console.log(`[StudyHabitsTracker] response status:`, res.status, res.statusText);
            if (!res.ok) {
              const text = await res.text();
              console.error(`[StudyHabitsTracker] response body on error:`, text);
              throw new Error(`HTTP error ${res.status}`);
            }
            return res.json();
          })
          .then(json => {
            console.log('[StudyHabitsTracker] analysis data:', json);
            setAnalysis(json);
            setLoading(false);
          })
          .catch(error => {
            console.error('[StudyHabitsTracker] fetch error:', error);
            setLoading(false);
          });
      }
    }
  }, []);

  if (loading) return <div className="study-habits-container">Loading...</div>;
  if (!analysis) return <div className="study-habits-container">No data available.</div>;

  const {
    totalDuration, attentiveDuration,
    distractionCount, avgDistractionDuration, timeSeries, summary
  } = analysis;
  const distractedDuration = totalDuration - attentiveDuration;
  const pieData = [
    { name: 'Attentive', value: attentiveDuration },
    { name: 'Distracted', value: distractedDuration }
  ];
  const COLORS = ['#665DCD', '#5FA4E6']; // main homepage colors

  return (
    <div className="study-habits-container">
      {onClose && <CloseButton onClose={onClose} position="top-right" />}
      <h2>Study Habits Tracker</h2>
      <p className="summary">{summary}</p>
      <div className="stats">
        <div className="distraction-btn">
          <span>Distractions: {distractionCount}</span>

        </div>


        <div className="distraction-btn">
          <span>Avg Distraction: {(avgDistractionDuration/1000).toFixed(1)} s</span>
        </div>
      </div>
      <div className="charts">
        <div className="chart">
          <h3>Attention Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                // label={(entry: { percent: number; name: string }) => `${entry.name} ${(entry.percent*100).toFixed(0)}%`}

                cx="50%"
                cy="50%"
                fill="#8884d8"
                label={false}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${(value/60000).toFixed(1)} min`}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', border: 'none', color: '#333' }}
                itemStyle={{ color: '#333' }}
                labelStyle={{ color: '#666' }}
              />
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="chart">
            <h3>Attention Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeSeries.map(d => ({ ...d, time: new Date(d.start).toLocaleTimeString() }))}>
                <XAxis dataKey="time" tick={{ fill: '#666666FF', fontSize: 12 }} axisLine={{ stroke: '#8884d8' }} tickLine={false} />
                <YAxis domain={[0,1]} tickFormatter={(f: number) => `${(f*100).toFixed(0)}%`} tick={{ fill: '#666666FF', fontSize: 12 }} axisLine={{ stroke: '#8884d8' }} tickLine={false} />
                <CartesianGrid stroke="#8884d8" strokeOpacity={0.4} strokeDasharray="3 3" />
                <Tooltip
                  formatter={(v: number) => `${(v*100).toFixed(0)}%`}
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', border: 'none', color: '#8884d8' }}
                  itemStyle={{ color: '#333' }}
                  labelStyle={{ color: '#8884d8' }}
                />
                <Line type="monotone" dataKey="ratio" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
};

export default StudyHabitsTracker;
