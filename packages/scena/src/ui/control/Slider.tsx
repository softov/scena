import { type ChangeEvent, useEffect, useState } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { weightStyle } from '../_utils.js';
import { Checks, type CheckRuleResolved } from './Checks.js';
import { ControlLabel, ControlHint, ControlError } from './_field-parts.js';
import './Slider.css';

// a2ui v0.10: required `value`, `max`. optional `label`, `min` (def 0),
// `steps` (integer number of divisions — snap-to). scena's `step` (float
// increment) is kept as a scena extension — different semantics from `steps`.
// When `steps` is given, it derives an HTML step = (max-min)/steps.
export interface SliderProps {
  value?: number;
  max?: number;
  label?: string;
  min?: number;
  step?: number;        // a2ui v0.10 — discrete divisions
  weight?: number;       // a2ui CatalogComponentCommon
  // scena extensions:
  defaultValue?: number;
  disabled?: boolean;
  showValue?: boolean;
  checks?: CheckRuleResolved[];
  style?: React.CSSProperties;
  // Field chrome — rendered inside the control's own <label>.
  hint?: string;
  error?: string;
  required?: boolean;
  typeTag?: string;
  // Controlled escape hatch for direct-React use. Fires alongside write-back.
  onChange?: (next: number) => void;
}

export function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled,
  showValue = true,
  weight,
  checks,
  style,
  hint,
  error,
  required,
  typeTag,
  onChange: onChangeProp,
}: SliderProps) {
  const writeValue = useWriteBack('value');
  const [internal, setInternal] = useState<number>(value ?? defaultValue ?? min);

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const next = Number(e.currentTarget.value);
    setInternal(next);
    writeValue(next);
    onChangeProp?.(next);
  }

  // function stepFromSegments(min: number, max: number, segments: number): number {
  //   const delta = max - min;

  //   if (!Number.isFinite(delta) || delta <= 0) return 1;
  //   if (!Number.isFinite(segments) || segments <= 0) return 1;

  //   return delta / segments;
  // }

  const rawMin = Number(min);
  const rawMax = Number(max);

  const defmin = Number.isFinite(rawMin) ? rawMin : 0;
  const defmax = Number.isFinite(rawMax) ? Math.max(defmin + 1, rawMax) : defmin + 100;

  const defStep =
    typeof step === 'number' && Number.isFinite(step) && step > 0
      ? step
      : 1;
  const htmlStep = Math.min(defStep, Math.min(defmax - defmin, 1));

  return (
    <label className="oo-field" style={weightStyle(weight)}>
      <ControlLabel
        label={label}
        required={required}
        typeTag={typeTag}
        extra={showValue ? <span className="oo-slider__value">{internal}</span> : null}
      />
      <ControlHint text={hint} />
      <div className="oo-control">
        <input
          className="oo-slider"
          type="range"
          value={internal}
          min={min}
          max={max}
          step={htmlStep}
          disabled={disabled}
          onChange={onChange}
          style={style}
        />
      </div>
      <ControlError text={error} />
      <Checks checks={checks} />
    </label>
  );
}
