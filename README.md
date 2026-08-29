# 🌊 prompt-ocean

**Type a sea. Watch it exist.**

An open-source AI-driven 3D ocean. Describe the water in plain words — *"a raging midnight storm"*, *"glassy tropical dawn"* — and an AI turns your words into physical wave parameters that a Gerstner-wave shader renders in real time. Every prompt **morphs** the ocean instead of snapping it.

https://github.com/rohitguta2432/prompt-ocean/raw/main/demo/prompt-ocean-demo.mp4

## Quickstart

```bash
git clone https://github.com/rohitguta2432/prompt-ocean
cd prompt-ocean
npm install
npm run dev
```

Open http://localhost:3000 and type a sea. **No API key needed** — it works out of the box.

## How it works

```
"stormy golden sunset"
        │
        ▼
POST /api/interpret ──► local LLM (Ollama) ──► JSON params ──┐
        │                     (if running)                   │
        └────────► rules engine (regex → params, always) ────┤
                                                             ▼
                                              { amplitude: 2.2, choppiness: 0.9,
                                                sunElevation: 4, foam: 0.9, … }
                                                             │
                                                             ▼
                                  Gerstner wave vertex shader (7 waves, GPU)
```

### The ocean (`components/Ocean.tsx`)

- **7 summed Gerstner (trochoidal) waves** in a vertex shader. Unlike sine waves, Gerstner waves displace vertices *horizontally* toward crests, which is what gives storm seas their sharp, heaving shape.
- **Deep-water dispersion relation** `c = √(g/k)` — long waves physically travel faster than short ones.
- Analytic-free normals via finite differences, fresnel + Blinn specular + crest foam + subsurface glow in the fragment shader.
- Sky, sun and stars react to the prompt too (atmosphere driven per-frame, no React re-renders).

### The AI (`app/api/interpret/route.ts`)

The LLM never writes code — it only emits ~12 **clamped numbers** (`lib/interpret.mjs` validates everything), so a hallucinating model can't break the render.

- **With [Ollama](https://ollama.com)** running locally: your words are interpreted by a real LLM. Configure with `OLLAMA_MODEL` (default `llama3.2`), `OLLAMA_URL`, `OLLAMA_TIMEOUT_MS`.
- **Without it**: a zero-dependency rules engine composes the same parameters — "stormy sunset" gets storm physics *and* sunset light.

## The parameter contract

Anything that emits this JSON can drive the ocean — swap in any model or service:

| key | range | meaning |
|---|---|---|
| `amplitude` | 0.02–3 | wave height (m) |
| `choppiness` | 0–1 | flat sine → sharp trochoid |
| `waveLength` | 8–120 | dominant wavelength (m) |
| `speed` | 0.2–3 | time multiplier |
| `windDir` | 0–360 | wave travel direction |
| `foam` | 0–1 | whitecap intensity |
| `sunElevation` | −15–88 | negative = night (stars come out) |
| `deepColor` / `surfaceColor` / `sunColor` | hex | palette |
| `turbidity` | 1–12 | sky haze |

## Tests

```bash
npm test   # node --test, no framework
```

## Stack

Next.js 15 · React Three Fiber 9 · three.js · TypeScript · optional Ollama

## Contributing

PRs welcome — good first issues: new mood rules in `lib/interpret.mjs`, buoyant objects (boats!), rain particles for storms, WebGPU/FFT upgrade path.

## License

MIT © Rohit Raj — [rohitraj.tech](https://rohitraj.tech)

---

### 🤝 Work with me

I'm an **AI Consultant · Forward Deployed Engineer** — I embed with teams and ship AI to production: agents, MCP integrations, and LLM features, with evals proving they work.

**→ [rohitraj.tech/en/hire](https://rohitraj.tech/en/hire)**
