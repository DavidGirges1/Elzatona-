export default function Loading() {
  return (
    <div role="status" aria-label="جاري التحميل">
      <div className="skeleton" />
      <div className="skeleton" />
      <span>جاري تحميل المواد…</span>
    </div>
  );
}
