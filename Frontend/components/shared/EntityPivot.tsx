"use client";

type EntityType = "ip" | "user" | "hash";

type Props = {
  type: EntityType;
  value: string;
};

export default function EntityPivot({ type, value }: Props) {
  // Non-interactive entity chip. There is no pivot/search-by-URL feature wired
  // up, so rendering a clickable <button> advertised a click target that did
  // nothing. Render a plain <span> without interactive affordances.
  return (
    <span
      data-entity-type={type}
      title={value}
      className="font-mono text-xs text-blue-300 bg-blue-900/20 px-2 py-1 rounded-sm"
    >
      {value}
    </span>
  );
}