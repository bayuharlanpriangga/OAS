"use client";

export interface EmptyTableRowProps {
  colSpan: number;
  text: string;
}

export function EmptyTableRow({ colSpan, text }: EmptyTableRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}
      >
        {text}
      </td>
    </tr>
  );
}
