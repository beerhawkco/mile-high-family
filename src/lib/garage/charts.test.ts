import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gaugeDegrees, gaugeNeedle, sparkPath, sparkPoints } from './charts.ts';

describe('garage charts', () => {
  it('maps sentiment onto a 180-degree gauge', () => {
    assert.equal(gaugeDegrees(-100), 0);
    assert.equal(gaugeDegrees(0), 90);
    assert.equal(gaugeDegrees(100), 180);
    assert.equal(gaugeDegrees(null), 90);
  });

  it('points the needle along the arc', () => {
    const tip = gaugeNeedle(60, 70, 40, 90);
    assert.ok(Math.abs(tip.x - 60) < 0.01);
    assert.ok(Math.abs(tip.y - 30) < 0.01);
  });

  it('builds a sparkline path from asking history', () => {
    const points = sparkPoints([10, 20, 15], 100, 40, 0);
    assert.equal(points.length, 3);
    assert.equal(points[0].x, 0);
    assert.equal(points[2].x, 100);
    assert.match(sparkPath([10, 20]), /^M/);
  });
});
