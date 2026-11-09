"use client";

import { useId, useRef, useState } from "react";
import {
  BALANCED_PREFERENCES,
  PREFERENCE_PRESETS,
  PreferencePoint,
  clampAxis,
  describePreferences,
  pointFromCoordinates,
} from "@/lib/preferences";

type Props = {
  value: PreferencePoint;
  onChange: (p: PreferencePoint) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PreferenceExplorer({ value, onChange, open, onOpenChange }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const startPoint = useRef<PreferencePoint>(value);
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const summary = describePreferences(value);
  const isBalanced = value.x === 0 && value.y === 0;

  function update(e: React.PointerEvent) {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Keep the whole point inside the pad, including at axis endpoints.
    onChange(pointFromCoordinates(e.clientX, e.clientY, { left: r.left + 12, top: r.top + 12, width: r.width - 24, height: r.height - 24 }));
  }

  function end() {
    activePointer.current = null;
    setDragging(false);
  }

  const xFraction = (value.x + 100) / 200;
  const yFraction = (100 - value.y) / 200;
  const left = `calc(${xFraction * 100}% + ${12 - 24 * xFraction}px)`;
  const top = `calc(${yFraction * 100}% + ${12 - 24 * yFraction}px)`;

  return (
    <section className="agora-pref" aria-labelledby={`${id}-title`} data-testid="section-preferences">
      <div className="agora-pref__head">
        <div>
          <h2 id={`${id}-title`} className="agora-pref__title">Explore what matters to you</h2>
          <p id={`${id}-notice`} className="agora-pref__note" data-testid="text-preferences-notice">
            Exploratory only. Your preferences do not change product results yet.
          </p>
        </div>
        <button
          type="button"
          className="agora-select agora-pref__toggle"
          aria-label={open ? "Hide preference controls" : "Show preference controls"}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => onOpenChange(!open)}
          data-testid="button-toggle-preferences"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {!open && (
        <div className="agora-pref__collapsed" data-testid="text-preferences-collapsed">{summary}</div>
      )}
      <div id={`${id}-body`} hidden={!open}>
        <p id={`${id}-instructions`} className="agora-pref__fine" style={{ marginTop: 12 }}>
          Click, tap or drag the point, or use the two axis controls below.
        </p>
        <div className="agora-pref__body">
          <div className="agora-pref__padwrap">
            <span className="agora-pref__axis agora-pref__axis--top" aria-hidden="true">Performance</span>
            <span className="agora-pref__axis agora-pref__axis--bottom" aria-hidden="true">Durability</span>
            <span className="agora-pref__axis agora-pref__axis--left" aria-hidden="true">Price</span>
            <span className="agora-pref__axis agora-pref__axis--right" aria-hidden="true">Luxury</span>
            <div
              ref={padRef}
              className={`agora-pref__pad${dragging ? " is-dragging" : ""}`}
              aria-hidden="true"
              data-testid="pad-preferences"
              onPointerDown={(e) => {
                if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
                if (activePointer.current !== null) return;
                e.preventDefault();
                activePointer.current = e.pointerId;
                startPoint.current = value;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                setDragging(true);
                update(e);
              }}
              onPointerMove={(e) => {
                if (activePointer.current !== e.pointerId) return;
                update(e);
              }}
              onPointerUp={(e) => {
                if (activePointer.current !== e.pointerId) return;
                update(e);
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
                end();
              }}
              onPointerCancel={(e) => {
                if (activePointer.current !== e.pointerId) return;
                onChange(startPoint.current);
                end();
              }}
              onLostPointerCapture={(e) => {
                if (activePointer.current !== e.pointerId) return;
                end();
              }}
            >
              <div className="agora-pref__cross agora-pref__cross--h" />
              <div className="agora-pref__cross agora-pref__cross--v" />
              <div className="agora-pref__dot" style={{ left, top }} data-testid="point-preferences" />
            </div>
          </div>

          <div className="agora-pref__controls">
            <label className="agora-pref__range">
              <span><span id={`${id}-x-label`}>Price (affordability) to Luxury</span>: <strong aria-hidden="true">{value.x}</strong></span>
              <input
                type="range" min={-100} max={100} step={1}
                value={value.x}
                aria-labelledby={`${id}-x-label`}
                aria-describedby={`${id}-instructions ${id}-notice`}
                aria-valuetext={`${value.x}, ${value.x < 0 ? "toward Price (affordability)" : value.x > 0 ? "toward Luxury" : "balanced"}`}
                onChange={(e) => onChange({ x: clampAxis(Number(e.target.value)), y: value.y })}
                data-testid="input-pref-x"
              />
            </label>
            <label className="agora-pref__range">
              <span><span id={`${id}-y-label`}>Durability to Performance</span>: <strong aria-hidden="true">{value.y}</strong></span>
              <input
                type="range" min={-100} max={100} step={1}
                value={value.y}
                aria-labelledby={`${id}-y-label`}
                aria-describedby={`${id}-instructions ${id}-notice`}
                aria-valuetext={`${value.y}, ${value.y < 0 ? "toward Durability" : value.y > 0 ? "toward Performance" : "balanced"}`}
                onChange={(e) => onChange({ x: value.x, y: clampAxis(Number(e.target.value)) })}
                data-testid="input-pref-y"
              />
            </label>
            <p className="agora-pref__summary" role="status" aria-live="polite" aria-atomic="true" data-testid="text-preferences-summary">{summary}</p>
            <div className="agora-pref__presets" role="group" aria-label="Illustrative presets">
              {PREFERENCE_PRESETS.map((p, i) => {
                const on = p.point.x === value.x && p.point.y === value.y;
                return (
                  <button
                    key={p.label}
                    type="button"
                    className={`agora-chip agora-pref__preset${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => onChange({ ...p.point })}
                    data-testid={`button-pref-preset-${i}`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="agora-chip agora-pref__preset"
                onClick={() => onChange({ ...BALANCED_PREFERENCES })}
                disabled={isBalanced}
                data-testid="button-pref-reset"
              >
                Reset to balanced
              </button>
            </div>
            <p className="agora-pref__fine">
              Price here means affordability. These are two independent axes, not four separate weights, and the
              pairings are a way to explore your own priorities. They are not universal opposites and not verified
              product attributes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
