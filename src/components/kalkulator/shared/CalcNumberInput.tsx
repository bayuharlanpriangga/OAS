"use client";

import { useState, type CSSProperties } from "react";

export interface CalcNumberInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
  showCurrencyHint?: boolean;
}

export function CalcNumberInput({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  showCurrencyHint = true,
}: CalcNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const numericVal = parseFloat(value);
  const showHint =
    showCurrencyHint && !focused && !Number.isNaN(numericVal) && numericVal >= 1000;

  return (
    <>
      <input
        type="number"
        id={id}
        data-formatted="1"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        style={style}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showHint && (
        <div
          className="num-display"
          style={{
            fontSize: "10px",
            color: "var(--accent2)",
            fontFamily: "var(--mono)",
            marginTop: "2px",
          }}
        >
          = Rp {numericVal.toLocaleString("id-ID")}
        </div>
      )}
    </>
  );
}
