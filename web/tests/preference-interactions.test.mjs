import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as model from "../src/lib/preferences.ts";

// Exercise the component's real handlers without a browser or added dependencies.
// Browser keyboard/touch semantics are covered separately by test:preferences:a11y.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/components/PreferenceExplorer.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

function harness() {
  let value = { x: 0, y: 0 };
  let open = true;
  let index = 0;
  const hooks = [];
  const captures = new Set();
  const pad = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 224, height: 224 }),
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  const react = {
    useId: () => "preferences-test",
    useRef(initial) {
      const i = index++;
      hooks[i] ??= { current: initial };
      return hooks[i];
    },
    useState(initial) {
      const i = index++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], (next) => { hooks[i] = next; }];
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => name === "react" ? react : name === "@/lib/preferences" ? model : require(name),
  });
  function render() {
    index = 0;
    const tree = exports.PreferenceExplorer({
      value, open, onChange: (next) => { value = { x: next.x, y: next.y }; }, onOpenChange: (next) => { open = next; },
    });
    const nodes = new Map();
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.props?.["data-testid"]) nodes.set(node.props["data-testid"], node);
      if (node.props?.id) nodes.set(`#${node.props.id}`, node);
      const children = node.props?.children;
      for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) visit(child);
    }
    visit(tree);
    nodes.get("pad-preferences").props.ref.current = pad;
    return nodes;
  }
  function pointer(handler, x, y, extras = {}) {
    render().get("pad-preferences").props[handler]({
      currentTarget: pad, pointerId: 1, isPrimary: true, pointerType: "touch",
      button: 0, clientX: x, clientY: y, preventDefault() {}, ...extras,
    });
  }
  return { render, pointer, value: () => value, captures };
}

test("tap and drag synchronize controls, summary, and bounded point", () => {
  const h = harness();
  h.pointer("onPointerDown", 12, 12);
  assert.deepEqual(h.value(), { x: -100, y: 100 });
  assert.ok(h.captures.has(1));
  h.pointer("onPointerMove", 900, 900);
  assert.deepEqual(h.value(), { x: 100, y: -100 });
  const nodes = h.render();
  assert.equal(nodes.get("input-pref-x").props.value, 100);
  assert.equal(nodes.get("input-pref-y").props.value, -100);
  assert.equal(nodes.get("text-preferences-summary").props.children, model.describePreferences(h.value()));
  h.pointer("onPointerUp", 112, 112);
  assert.deepEqual(h.value(), { x: 0, y: 0 });
  assert.equal(h.captures.size, 0);
  h.pointer("onPointerMove", 212, 212);
  assert.deepEqual(h.value(), { x: 0, y: 0 });
});

test("cancel restores the starting selection and lost capture stops movement", () => {
  const h = harness();
  h.render().get("button-pref-preset-2").props.onClick();
  const start = h.value();
  h.pointer("onPointerDown", 212, 12);
  h.pointer("onPointerCancel", 212, 12);
  assert.deepEqual(h.value(), start);
  h.pointer("onPointerMove", 12, 212);
  assert.deepEqual(h.value(), start);
  h.pointer("onPointerDown", 112, 112);
  h.pointer("onLostPointerCapture", 112, 112);
  h.pointer("onPointerMove", 12, 212);
  assert.deepEqual(h.value(), { x: 0, y: 0 });
});

test("secondary pointers and mouse buttons cannot change a selection", () => {
  const h = harness();
  h.pointer("onPointerDown", 12, 12, { isPrimary: false });
  h.pointer("onPointerDown", 12, 12, { pointerType: "mouse", button: 2 });
  assert.deepEqual(h.value(), { x: 0, y: 0 });
  h.pointer("onPointerDown", 212, 12);
  h.pointer("onPointerMove", 12, 212, { pointerId: 2 });
  h.pointer("onPointerCancel", 12, 212, { pointerId: 2 });
  h.pointer("onPointerUp", 12, 212, { pointerId: 2 });
  assert.deepEqual(h.value(), { x: 100, y: 100 });
  h.pointer("onPointerMove", 12, 212);
  assert.deepEqual(h.value(), { x: -100, y: -100 });
});

test("labels, value descriptions, disclosure and live summary expose accessible semantics", () => {
  const h = harness();
  for (const [axis, name, negative, positive] of [
    ["x", "Price (affordability) to Luxury", "Price (affordability)", "Luxury"],
    ["y", "Durability to Performance", "Durability", "Performance"],
  ]) {
    const input = () => h.render().get(`input-pref-${axis}`).props;
    assert.equal(input().type, "range");
    assert.equal(input().min, -100);
    assert.equal(input().max, 100);
    assert.equal(input().step, 1);
    assert.equal(h.render().get(`#${input()["aria-labelledby"]}`).props.children, name);
    for (const id of input()["aria-describedby"].split(" ")) assert.ok(h.render().has(`#${id}`));
    for (const [value, direction] of [[-100, `toward ${negative}`], [0, "balanced"], [100, `toward ${positive}`]]) {
      input().onChange({ target: { value: String(value) } });
      assert.equal(input()["aria-valuetext"], `${value}, ${direction}`);
      assert.equal(h.render().get(`#${input()["aria-labelledby"]}`).props.children, name);
    }
  }
  const nodes = h.render();
  const summary = nodes.get("text-preferences-summary").props;
  assert.equal(summary.role, "status");
  assert.equal(summary["aria-live"], "polite");
  assert.equal(summary["aria-atomic"], "true");
  assert.equal(nodes.get("pad-preferences").props["aria-hidden"], "true");
  assert.equal(nodes.get("pad-preferences").props.tabIndex, undefined);
  const toggle = nodes.get("button-toggle-preferences").props;
  assert.equal(toggle["aria-label"], "Hide preference controls");
  assert.equal(nodes.get(`#${toggle["aria-controls"]}`).props.hidden, false);
  toggle.onClick();
  const collapsed = h.render();
  assert.equal(collapsed.get("button-toggle-preferences").props["aria-label"], "Show preference controls");
  assert.equal(collapsed.get(`#${toggle["aria-controls"]}`).props.hidden, true);
});

test("axis changes, presets, reset, and collapse share the same state", () => {
  const h = harness();
  h.render().get("input-pref-x").props.onChange({ target: { value: "-100" } });
  h.render().get("input-pref-y").props.onChange({ target: { value: "100" } });
  assert.deepEqual(h.value(), { x: -100, y: 100 });
  for (let i = 0; i < model.PREFERENCE_PRESETS.length; i++) {
    h.render().get(`button-pref-preset-${i}`).props.onClick();
    assert.deepEqual(h.value(), model.PREFERENCE_PRESETS[i].point);
    assert.equal(h.render().get(`button-pref-preset-${i}`).props["aria-pressed"], true);
  }
  const before = h.value();
  h.render().get("button-toggle-preferences").props.onClick();
  assert.equal(h.render().get("text-preferences-collapsed").props.children, model.describePreferences(before));
  h.render().get("button-toggle-preferences").props.onClick();
  assert.deepEqual(h.value(), before);
  h.render().get("button-pref-reset").props.onClick();
  assert.deepEqual(h.value(), { x: 0, y: 0 });
});
