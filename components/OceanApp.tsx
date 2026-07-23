'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Ocean, { type OceanParams } from './Ocean';
// @ts-ignore - plain-JS module shared with node --test
import { DEFAULT_PARAMS, PRESETS } from '@/lib/interpret.mjs';

export default function OceanApp() {
  const [target, setTarget] = useState<OceanParams>(DEFAULT_PARAMS);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  async function interpret(text: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (data.params) {
        setTarget(data.params);
        setSource(data.source);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage">
      <Canvas camera={{ position: [0, 7, 30], fov: 55, near: 0.1, far: 5000 }} dpr={[1, 2]}>
        <Ocean target={target} />
        <OrbitControls enablePan={false} minDistance={8} maxDistance={120} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>

      <header className="hud top">
        <h1>🌊 prompt-ocean</h1>
        <p>type a sea. watch it exist.</p>
        <a href="https://github.com/rohitguta2432/prompt-ocean" target="_blank" rel="noreferrer">GitHub ↗</a>
      </header>

      <div className="hud bottom">
        <div className="chips">
          {Object.entries(PRESETS as Record<string, Partial<OceanParams>>).map(([name, patch]) => (
            <button key={name} onClick={() => { setTarget({ ...DEFAULT_PARAMS, ...patch }); setSource('preset'); setPrompt(name); }}>
              {name}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) interpret(prompt.trim()); }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="describe the sea… e.g. “a raging midnight storm” or “glassy tropical dawn”"
            maxLength={500}
            autoFocus
          />
          <button type="submit" disabled={busy}>{busy ? '…' : 'make waves'}</button>
        </form>
        {source && <span className="source">interpreted by {source === 'ollama' ? 'local LLM (ollama)' : source}</span>}
      </div>
    </div>
  );
}
