import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretWithRules, clampParams, DEFAULT_PARAMS } from './interpret.mjs';

test('storm raises amplitude and foam', () => {
  const { params } = interpretWithRules('a raging midnight storm');
  assert.ok(params.amplitude > 1.5);
  assert.ok(params.foam > 0.7);
  assert.ok(params.sunElevation < 0, 'midnight puts the sun below the horizon');
});

test('compound prompt composes: stormy sunset keeps storm physics + sunset light', () => {
  const { params } = interpretWithRules('stormy golden sunset');
  assert.ok(params.amplitude > 1.5);
  assert.equal(params.sunColor, '#ff9d3c');
});

test('unknown prompt falls back to defaults', () => {
  const { params, matched } = interpretWithRules('xyzzy plugh');
  assert.deepEqual(params, clampParams(DEFAULT_PARAMS));
  assert.equal(matched.length, 0);
});

test('clampParams rejects garbage and clamps ranges', () => {
  const p = clampParams({ amplitude: 999, foam: -5, deepColor: 'javascript:alert(1)', speed: 'fast' });
  assert.equal(p.amplitude, 3);
  assert.equal(p.foam, 0);
  assert.equal(p.deepColor, DEFAULT_PARAMS.deepColor);
  assert.equal(p.speed, DEFAULT_PARAMS.speed);
});
