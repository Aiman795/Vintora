import { useRef, useState } from "react";

const TRYON_URL = import.meta.env.VITE_TRYON_URL || "http://localhost:8001";

export default function TryOnPage() {
  const [personFile, setPersonFile] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [length, setLength] = useState("");
  const [brand, setBrand] = useState("Khaadi");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);

  const handleFile = (file, type) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "person") {
      setPersonFile(file);
      setPersonPreview(url);
    } else {
      setGarmentFile(file);
      setGarmentPreview(url);
    }
    setResult(null);
    setError("");
  };

  const handleDrop = (event, type) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0], type);
  };

  const handleTryOn = async () => {
    if (!personFile || !garmentFile) {
      setError("Please upload both your full-body photo and the garment image.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("person", personFile);
      formData.append("garment", garmentFile);
      if (chest) formData.append("chest", chest);
      if (waist) formData.append("waist", waist);
      if (length) formData.append("length", length);
      formData.append("brand", brand);

      const res = await fetch(`${TRYON_URL}/tryon`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Try-on service error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      if (data.tryon_error) {
        setError(data.tryon_error);
      }
    } catch (err) {
      setError(err.message || "Unable to generate try-on.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPersonFile(null);
    setGarmentFile(null);
    setPersonPreview(null);
    setGarmentPreview(null);
    setResult(null);
    setError("");
    setChest("");
    setWaist("");
    setLength("");
    setBrand("Khaadi");
  };

  const renderUploadCard = ({ type, title, subtitle, preview, inputRef }) => (
    <section className={`tryon-upload-card ${preview ? "has-preview" : ""}`}>
      <div className="tryon-card-head">
        <div>
          <span className="tryon-eyebrow">{type === "person" ? "Step 01" : "Step 02"}</span>
          <h3>{title}</h3>
        </div>
        {preview ? <span className="spill confirmed">Ready</span> : <span className="spill pending">Needed</span>}
      </div>

      <button
        className="tryon-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, type)}
        type="button"
      >
        {preview ? (
          <img alt={`${title} preview`} src={preview} />
        ) : (
          <div>
            <div className="tryon-drop-icon">{type === "person" ? "YOU" : "DRESS"}</div>
            <p>{subtitle}</p>
            <small>JPG or PNG, clear front view preferred</small>
          </div>
        )}
      </button>

      <input
        accept="image/*"
        onChange={(event) => handleFile(event.target.files?.[0], type)}
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
      />
    </section>
  );

  return (
    <main className="page">
      <section className="tryon-hero">
        <div>
          <span className="section-eyebrow">AI fitting studio</span>
          <h2>Virtual Try-On</h2>
          <p>Upload a full-body photo and a real garment image. Vintora will classify the garment, estimate fit, and generate a try-on preview.</p>
        </div>
        <button className="btn btn-outline" onClick={reset} type="button">
          Reset
        </button>
      </section>

      {error ? <div className="tryon-alert">{error}</div> : null}

      <section className="tryon-studio">
        <div className="tryon-left">
          <div className="tryon-upload-grid">
            {renderUploadCard({
              type: "person",
              title: "Your Photo",
              subtitle: "Upload a standing full-body photo",
              preview: personPreview,
              inputRef: personInputRef,
            })}
            {renderUploadCard({
              type: "garment",
              title: "Garment Image",
              subtitle: "Upload the exact dress or outfit",
              preview: garmentPreview,
              inputRef: garmentInputRef,
            })}
          </div>

          <section className="tryon-measure-card">
            <div className="tryon-card-head">
              <div>
                <span className="tryon-eyebrow">Optional</span>
                <h3>Fit Measurements</h3>
              </div>
            </div>
            <div className="tryon-measure-grid">
              <label>
                Chest (cm)
                <input className="price-input" onChange={(event) => setChest(event.target.value)} placeholder="e.g. 86" type="number" value={chest} />
              </label>
              <label>
                Waist (cm)
                <input className="price-input" onChange={(event) => setWaist(event.target.value)} placeholder="e.g. 72" type="number" value={waist} />
              </label>
              <label>
                Length (cm)
                <input className="price-input" onChange={(event) => setLength(event.target.value)} placeholder="e.g. 110" type="number" value={length} />
              </label>
              <label>
                Brand
                <select className="price-input" onChange={(event) => setBrand(event.target.value)} value={brand}>
                  {["Khaadi", "Sapphire", "Alkaram", "Gul Ahmed", "Sana Safinaz", "Other"].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="tryon-actions">
            <button className="btn btn-primary" disabled={!personFile || !garmentFile || loading} onClick={handleTryOn} type="button">
              {loading ? "Generating..." : "Generate Try-On"}
            </button>
            <p>Processing can take 30 to 90 seconds depending on the external try-on model.</p>
          </div>
        </div>

        <aside className="tryon-result-panel">
          <div className="tryon-card-head">
            <div>
              <span className="tryon-eyebrow">Preview</span>
              <h3>Result</h3>
            </div>
          </div>

          <div className={`tryon-result-frame ${result?.tryon_image ? "ready" : ""}`}>
            {loading ? (
              <div className="tryon-loading">
                <span />
                <p>Creating your try-on preview...</p>
              </div>
            ) : result?.tryon_image ? (
              <img alt="Try-on result" src={`${TRYON_URL}/result?ts=${Date.now()}`} />
            ) : (
              <div className="tryon-placeholder">
                <strong>No result yet</strong>
                <p>Upload both images and start generation.</p>
              </div>
            )}
          </div>

          <div className="tryon-summary-grid">
            <div>
              <span>Category</span>
              <strong>{result?.category || "Pending"}</strong>
            </div>
            <div>
              <span>Recommended Size</span>
              <strong>{result?.fit_score?.recommended_size || "Add measurements"}</strong>
            </div>
          </div>

          {result?.fit_score?.explanation ? (
            <p className="tryon-note">{result.fit_score.explanation}</p>
          ) : (
            <p className="tryon-note">For best results, use a clear front-facing photo and a garment photo with minimal background clutter.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
