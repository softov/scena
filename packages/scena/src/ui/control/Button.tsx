import type { CSSProperties } from 'react';
import type { SizeName } from '../../styles/index.js';
import { appearance, resolveVariableFontSize, resolveVariableSize } from '../../styles/index.js';
import { weightStyle } from '../_utils.js';
import './Button.css';

// a2ui v0.10: required `child` (ComponentId for label) + `action` (Action).
// variants 'default'/'primary'/'borderless'. scena's `label`+`onClick` model
// is an extension (Group D — full spec model deferred). `weight` added.
export interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  weight?: number;
  title?: string;
  // scena extensions:
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'default' | 'borderless';
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  style?: CSSProperties;
  size?: SizeName;
  children?: React.ReactNode;
  rounded?: SizeName;
}

export function Button({
  type = 'button',
  title,
  label,
  variant = 'default',
  disabled,
  onClick,
  weight,
  size = 'sm',
  style,
  children,
  rounded = 'sm',
}: ButtonProps) {
  const inlineStyle: CSSProperties = {
    ['--button-padding-y' as string]: `var(${resolveVariableSize(size)})`,
    ['--button-padding-x' as string]: `var(${resolveVariableSize(size)})`,
    ['--button-font-size' as string]: `var(${resolveVariableFontSize(size)})`,
    ['--button-border-radius' as string]: `var(${resolveVariableSize(rounded ?? size)})`,
    ...weightStyle(weight),
    ...style
  };

  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={() => {
        void onClick?.();
      }}
      data-variant={variant}
      className={appearance('oo-btn', { variant })}
      style={inlineStyle}
      title={title}
    >
      {label ?? children ?? 'Button'}
    </button>
  );
}
