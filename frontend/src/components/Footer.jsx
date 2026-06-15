export default function Footer() {
  return (
    <footer>
      <div>
        <div className="ft-logo">
          Vint<span>ora</span>
        </div>
        <p style={{ marginTop: "6px" }}>Pakistan&apos;s curated fashion rental & resale platform</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "10px" }}>
          <a href="/help">FAQ</a>
          <a href="/policies">Policies</a>
          <a href="/blog">Blog</a>
          <a href="/success-stories">Success Stories</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
      <p>&copy; 2026 Vintora · All rights reserved · Designed for Pakistani fashion lovers</p>
    </footer>
  );
}