import { Fragment, type ReactElement } from "react";

const SUB_RE = /_([A-Za-z0-9])/g;

/**
 * Renders simple inline subscripts in plain content strings:
 *   "v_x" -> v<sub>x</sub>,  "a_y" -> a<sub>y</sub>.
 * Keeps lesson content authorable as plain text while displaying real
 * subscripts (Unicode lacks a subscript "y", so we render markup instead).
 */
export function RichText({ children }: { children: string }): ReactElement {
  const text = children;
  const nodes: ReactElement[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  SUB_RE.lastIndex = 0;
  while ((m = SUB_RE.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    }
    nodes.push(<sub key={key++}>{m[1]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  return <>{nodes}</>;
}
