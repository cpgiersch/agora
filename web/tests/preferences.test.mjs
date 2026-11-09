import assert from "node:assert/strict";
import test from "node:test";
import {
  BALANCED_PREFERENCES,
  PREFERENCE_PRESETS,
  clampAxis,
  describePreferences,
  pointFromCoordinates,
} from "../src/lib/preferences.ts";

const rect = { left: 20, top: 40, width: 400, height: 200 };

test("the initial selection is the balanced midpoint", () => {
  assert.deepEqual(BALANCED_PREFERENCES, { x: 0, y: 0 });
  assert.match(describePreferences(BALANCED_PREFERENCES), /balanc/i);
  assert.deepEqual(pointFromCoordinates(220, 140, rect), { x: 0, y: 0 });
});

test("axes clamp independently without changing valid values", () => {
  assert.equal(clampAxis(-500), -100);
  assert.equal(clampAxis(500), 100);
  for (const value of [-100, -50, 0, 50, 100]) {
    assert.equal(clampAxis(value), value);
  }
});

test("pointer endpoints map to the correct axis directions", () => {
  assert.deepEqual(pointFromCoordinates(20, 40, rect), { x: -100, y: 100 });
  assert.deepEqual(pointFromCoordinates(420, 40, rect), { x: 100, y: 100 });
  assert.deepEqual(pointFromCoordinates(20, 240, rect), { x: -100, y: -100 });
  assert.deepEqual(pointFromCoordinates(420, 240, rect), { x: 100, y: -100 });
});

test("dragging beyond any boundary stays inside the selection area", () => {
  assert.deepEqual(pointFromCoordinates(-1000, -1000, rect), { x: -100, y: 100 });
  assert.deepEqual(pointFromCoordinates(1000, 1000, rect), { x: 100, y: -100 });
  assert.deepEqual(pointFromCoordinates(220, -1000, rect), { x: 0, y: 100 });
});

test("unmeasurable axes fall back to center and invalid numbers stay bounded", () => {
  assert.deepEqual(pointFromCoordinates(20, 40, { ...rect, width: 0, height: 0 }), { x: 0, y: 0 });
  assert.equal(clampAxis(NaN), 0);
  assert.equal(clampAxis(Infinity), 100);
  assert.equal(clampAxis(-Infinity), -100);
});

test("summary describes both independent axes, not product scores", () => {
  const low = describePreferences({ x: -100, y: -100 });
  const high = describePreferences({ x: 100, y: 100 });
  assert.match(low, /affordab|price/i);
  assert.match(low, /durab/i);
  assert.match(high, /luxur/i);
  assert.match(high, /performance/i);
  assert.notEqual(low, high);
  assert.equal(high, describePreferences({ x: 100, y: 100 }));
  assert.match(describePreferences({ x: 0, y: 100 }), /balanc/i);
  assert.match(describePreferences({ x: 100, y: 0 }), /balanc/i);
});

test("presets are labeled, bounded, distinct illustrative selections", () => {
  assert.ok(PREFERENCE_PRESETS.length >= 3);
  const points = new Set();
  for (const { label, point } of PREFERENCE_PRESETS) {
    assert.ok(label.length > 0);
    assert.equal(clampAxis(point.x), point.x);
    assert.equal(clampAxis(point.y), point.y);
    assert.ok(describePreferences(point).length > 0);
    points.add(JSON.stringify(point));
  }
  assert.equal(points.size, PREFERENCE_PRESETS.length);
});
