import React, { useState } from 'react';
import { api } from './api.js';
import { extractResumeText, analyzeResume, SAMPLE_RESUMES } from './resumeParser.js';

const ROLES_LIST = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'UI/UX Designer',
  'QA Engineer',
  'DevOps Engineer',
  'Product Manager'
];

export default function ResumeScannerModal({ onClose, onCandidateCreated, onNotify }) {
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName]     = useState('');
  const [role, setRole]             = useState('Frontend Developer');
  const [customJD, setCustomJD]     = useState('');
  const [useCustomJD, setUseCustom] = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [report, setReport]         = useState(null);
  const [importing, setImporting]   = useState(false);
  const [copied, setCopied]         = useState(false);

  // File upload handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setScanning(true);
    try {
      const text = await extractResumeText(file);
      setResumeText(text);
      const res = analyzeResume(text, role, useCustomJD ? customJD : '');
      setReport(res);
      if (onNotify) onNotify(`Parsed ${file.name} — ${res.overallScore}% ATS score`);
    } catch (err) {
      if (onNotify) onNotify(`Failed to read ${file.name}: ${err.message}`, 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (resumeText.trim()) {
      const res = analyzeResume(resumeText, newRole, useCustomJD ? customJD : '');
      setReport(res);
    }
  };

  // Run ATS scan
  const runScan = () => {
    if (!resumeText.trim()) {
      if (onNotify) onNotify('Please paste resume text or upload a file first', 'error');
      return;
    }
    setScanning(true);
    setTimeout(() => {
      const res = analyzeResume(resumeText, role, useCustomJD ? customJD : '');
      setReport(res);
      setScanning(false);
      if (onNotify) onNotify(`ATS analysis completed: ${res.overallScore}% score`);
    }, 150);
  };

  // Load sample resume for instant demonstration
  const loadSample = (sampleKey) => {
    const sample = SAMPLE_RESUMES[sampleKey];
    if (!sample) return;
    setResumeText(sample);
    setFileName(`Sample_${sampleKey.toUpperCase()}_Resume.txt`);
    if (sampleKey === 'frontend') setRole('Frontend Developer');
    if (sampleKey === 'backend') setRole('Backend Developer');
    const res = analyzeResume(sample, sampleKey === 'frontend' ? 'Frontend Developer' : 'Backend Developer');
    setReport(res);
    if (onNotify) onNotify(`Loaded sample ${sampleKey} resume`);
  };

  // 1-Click Import into ATS database
  const handleImport = async () => {
    if (!report) return;
    setImporting(true);
    try {
      const skillsStr = (report.allDetectedSkills && report.allDetectedSkills.length > 0)
        ? report.allDetectedSkills.slice(0, 8).join(', ')
        : report.matchedKeywords.join(', ');

      const newCand = {
        name: report.candidateName || 'New Candidate',
        email: report.email || `candidate_${Date.now()}@example.com`,
        phone: report.phone || '',
        role: role,
        skills: skillsStr,
        experience: report.estimatedExp || 2,
        notes: `Imported via ATS Scanner. Score: ${report.overallScore}%. Missing: ${report.missingKeywords.slice(0, 4).join(', ')}`,
        rating: Math.min(5, Math.max(1, Math.round(report.overallScore / 20 * 10) / 10)),
        stage: 'Applied'
      };

      await api.create(newCand);
      if (onCandidateCreated) onCandidateCreated(`${newCand.name} imported to Applied stage`);
      onClose();
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    const txt = `TalentPulse ATS Scan Report
Candidate: ${report.candidateName}
Role: ${role}
Overall Score: ${report.overallScore}% (${report.verdict})
Keyword Match Score: ${report.keywordScore}%
Format Score: ${report.formatScore}%

Matched Keywords: ${report.matchedKeywords.join(', ')}
Missing Keywords: ${report.missingKeywords.join(', ')}

Formatting Checks:
${report.formattingPasses.map(p => `✓ ${p}`).join('\n')}
${report.formattingIssues.map(i => `⚠ ${i}`).join('\n')}`;

    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onNotify) onNotify('Scan report copied to clipboard');
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: 760, maxHeight: '92vh' }} role="dialog" aria-modal="true">
        {/* Header */}
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon" style={{ width: 28, height: 28, background: 'var(--accent)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>ATS Resume Scanner & Verification</h2>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Verify resume formatting, detect contact info, and calculate real keyword match score
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div className="modal-content-scroll" style={{ padding: '16px 20px', gap: 16 }}>
          {/* Controls: Target Role & Sample Loaders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Target role:</label>
              <select className="input" style={{ width: 180, height: 30 }} value={role} onChange={e => handleRoleChange(e.target.value)}>
                {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Load sample:</span>
              <button type="button" className="btn btn-ghost" style={{ height: 26, fontSize: 11, padding: '0 8px' }} onClick={() => loadSample('frontend')}>
                Frontend resume
              </button>
              <button type="button" className="btn btn-ghost" style={{ height: 26, fontSize: 11, padding: '0 8px' }} onClick={() => loadSample('backend')}>
                Backend resume
              </button>
            </div>
          </div>

          {/* Upload Dropzone + Direct Paste Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Upload file box */}
            <label className="ats-dropzone" style={{
              border: '1px dashed var(--border-md)',
              borderRadius: 'var(--radius-sm)',
              padding: 14,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--surface-1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}>
              <input type="file" accept=".pdf,.txt,.md,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                {fileName ? fileName : 'Upload Resume (.pdf, .txt, .md)'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Click to browse or drop file</span>
            </label>

            {/* Custom JD toggle */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              background: 'var(--surface-1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Custom Job Description</span>
                  <input type="checkbox" id="custom-jd-chk" checked={useCustomJD} onChange={e => setUseCustom(e.target.checked)} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Compare directly against custom job requirements instead of default role benchmark.
                </p>
              </div>
              {useCustomJD && (
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Paste Job Description requirements here..."
                  style={{ fontSize: 11, marginTop: 6 }}
                  value={customJD}
                  onChange={e => setCustomJD(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Resume Text Input */}
          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label">Resume text / content</label>
              {resumeText && (
                <button type="button" className="btn btn-ghost" style={{ height: 22, fontSize: 10, padding: '0 6px' }} onClick={() => { setResumeText(''); setFileName(''); setReport(null); }}>
                  Clear
                </button>
              )}
            </div>

            {resumeText && resumeText.length < 160 && (
              <div className="notice" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-2)' }}>
                💡 Tip: If your file is a graphic/scanned PDF, you can also paste your resume text directly into the box below to ensure 100% accurate parsing.
              </div>
            )}

            <textarea
              className="input"
              rows="6"
              placeholder="Paste raw resume text here, or upload a resume file above..."
              value={resumeText}
              onChange={e => {
                const val = e.target.value;
                setResumeText(val);
                if (val.trim()) {
                  const res = analyzeResume(val, role, useCustomJD ? customJD : '');
                  setReport(res);
                }
              }}
              style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runScan}
              disabled={scanning || !resumeText.trim()}
              style={{ flex: 1, height: 34, justifyContent: 'center' }}
            >
              {scanning ? 'Analyzing ATS criteria…' : 'Run ATS Verification & Scan'}
            </button>
          </div>

          {/* SCAN RESULTS REPORT */}
          {report && (
            <div style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              {/* Scorecard Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: `3px solid ${report.verdictColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}>
                    {report.overallScore}%
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {report.candidateName || 'Candidate Profile'}
                      </span>
                      <span className="pill" style={{ fontSize: 10, color: report.verdictColor, border: `1px solid ${report.verdictColor}` }}>
                        {report.verdict}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {report.email || 'No email detected'} {report.phone ? `• ${report.phone}` : ''} {report.estimatedExp ? `• ~${report.estimatedExp} yrs exp` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" style={{ height: 30, fontSize: 11 }} onClick={copyReport}>
                    {copied ? '✓ Copied' : 'Copy report'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ height: 30, fontSize: 11 }}
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? 'Importing…' : '+ Import candidate into ATS'}
                  </button>
                </div>
              </div>

              {/* Breakdown metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Keyword Match Column */}
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)' }}>
                      Keyword Matching ({report.keywordScore}%)
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {report.matchedKeywords.length} of {report.targetKeywords.length} matched
                    </span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Matched keywords:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {report.matchedKeywords.length > 0 ? (
                        report.matchedKeywords.map(k => (
                          <span key={k} className="ats-pill-tag ats-pill-matched" style={{ fontSize: 10 }}>
                            ✓ {k}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No matching keywords found</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Missing keywords for {role}:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {report.missingKeywords.length > 0 ? (
                        report.missingKeywords.map(k => (
                          <span key={k} className="ats-pill-tag ats-pill-missing" style={{ fontSize: 10 }}>
                            + {k}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--green)' }}>All benchmark keywords present!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formatting & Section Check */}
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)' }}>
                      ATS Structure & Sections ({report.formatScore}%)
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {report.formattingPasses.length} passed
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {report.formattingPasses.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>
                        {p}
                      </div>
                    ))}
                    {report.formattingIssues.map((issue, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--amber)' }}>
                        <span style={{ fontSize: 12 }}>⚠</span>
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="modal-footer">
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            TalentPulse Parser • Compliant with standard ATS parsing specifications
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
