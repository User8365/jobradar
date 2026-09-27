export function CopyButton({ value }: { value: string }) {
  return <button onClick={() => navigator.clipboard.writeText(value)}>Copier</button>;
}
