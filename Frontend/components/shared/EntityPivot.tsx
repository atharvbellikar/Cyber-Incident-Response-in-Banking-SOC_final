"use client";

type EntityType = "ip" | "user" | "hash";

type Props = {
  type: EntityType;
  value: string;
};

export default function EntityPivot({ type, value }: Props) {
  return (
    <button
      type="button"
      data-entity-type={type}
      title={`Pivot by ${type}: ${value}`}
      className="font-mono text-xs text-blue-300 bg-blue-900/20 px-2 py-1 rounded-sm cursor-pointer transition-colors hover:bg-blue-800/40 hover:text-blue-100"
    >
      {value}
    </button>
  );
}