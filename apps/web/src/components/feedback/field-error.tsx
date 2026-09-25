export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <span id={id} className="field-error" role="alert">
      {messages.join(' ')}
    </span>
  );
}
