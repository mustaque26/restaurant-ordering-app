export default function Error401() {
  return (
    <div className="card pad mb">
      <h2>Unauthorized (401)</h2>
      <p className="muted">You are not authorized to view this page. Please login again.</p>
      <a href="/login">Go to login</a>
    </div>
  )
}

