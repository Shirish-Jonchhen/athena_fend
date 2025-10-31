const REPORT_STORAGE_KEY = "voyage_latest_report";

const loaderEl = document.getElementById("reportLoader");
const emptyEl = document.getElementById("reportEmpty");
const summarySection = document.getElementById("summarySection");
const sectionsSection = document.getElementById("sectionsSection");
const recordingsSection = document.getElementById("recordingsSection");
const summaryEl = document.getElementById("reportSummary");
const sectionsEl = document.getElementById("reportSections");
const recordingsEl = document.getElementById("reportRecordings");
const metaEl = document.getElementById("reportMeta");
const backButton = document.getElementById("backButton");
const returnButton = document.getElementById("returnButton");

function formatTitle(text) {
  if (!text) return "";
  return text
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

function formatPercent(value, precision = 0) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(precision)}%`;
}

function formatNumber(value, precision = 1) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  const trimmed = Number(num.toFixed(precision));
  return Number.isInteger(trimmed) ? `${trimmed}` : trimmed.toFixed(precision);
}

function formatSeconds(seconds) {
  const num = Number(seconds);
  if (Number.isNaN(num) || num < 0) return "—";
  const minutes = Math.floor(num / 60);
  const secs = Math.round(num % 60);
  const padded = secs.toString().padStart(2, "0");
  return minutes > 0 ? `${minutes}m ${padded}s` : `${secs}s`;
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function createSummaryMetric(label, value, hint = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "summary-metric";

  const labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "value";
  valueEl.textContent = value;

  wrapper.append(labelEl, valueEl);

  if (hint) {
    const hintEl = document.createElement("div");
    hintEl.className = "hint";
    hintEl.textContent = hint;
    wrapper.appendChild(hintEl);
  }

  return wrapper;
}

function createChip({ title, score, summary, show_percentage }) {
  const chip = document.createElement("div");
  chip.className = "chip";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = formatTitle(title || "Metric");

  const scoreSpan = document.createElement("span");
  scoreSpan.className = "score";

  if (score === null || score === undefined) {
    scoreSpan.textContent = "—";
  } else if (show_percentage) {
    scoreSpan.textContent = `${Number(score).toFixed(0)}%`;
  } else {
    scoreSpan.textContent = formatNumber(score, 1);
  }

  chip.append(titleSpan, scoreSpan);

  if (summary) {
    const summarySpan = document.createElement("span");
    summarySpan.className = "hint";
    summarySpan.textContent = summary;
    chip.appendChild(summarySpan);
  }

  return chip;
}

function buildDetailCard(detail) {
  const card = document.createElement("div");
  card.className = "detail-card";

  const header = document.createElement("div");
  header.className = "detail-header";
  const idx = Number(detail?.conversation_index);
  header.textContent = `Question ${Number.isFinite(idx) ? idx + 1 : "—"}`;
  card.appendChild(header);

  const issues = Array.isArray(detail?.issues) ? detail.issues : [];
  if (issues.length) {
    const list = document.createElement("div");
    list.className = "issues-list";
    for (const item of issues) {
      const div = document.createElement("div");
      div.className = "issue-item";
      div.textContent = typeof item === "string" ? item : JSON.stringify(item);
      list.appendChild(div);
    }
    card.appendChild(list);
  }

  const extras = Array.isArray(detail?.extras) ? detail.extras : [];
  if (extras.length) {
    const list = document.createElement("div");
    list.className = "extras-list";
    for (const extra of extras) {
      const item = document.createElement("div");
      item.className = "extra-item";

      const parts = [];
      if (extra?.title) parts.push(formatTitle(extra.title));
      if (extra?.score !== undefined) {
        const value = extra.show_percentage
          ? `${Number(extra.score).toFixed(0)}%`
          : formatNumber(extra.score, 1);
        if (value !== "—") parts.push(`(${value})`);
      }

      item.innerHTML = `<span class="score">${parts.join(" ")}</span>`;
      if (extra?.summary) {
        const summary = document.createElement("span");
        summary.textContent = ` ${extra.summary}`;
        item.appendChild(summary);
      }
      list.appendChild(item);
    }
    card.appendChild(list);
  }

  const extrasSummary = (detail?.extras_summary || "").toString().trim();
  if (extrasSummary) {
    const summaryEl = document.createElement("div");
    summaryEl.className = "extras-summary";
    summaryEl.textContent = extrasSummary;
    card.appendChild(summaryEl);
  }

  return card;
}

function buildSection({ key, title, score, summary, chips = [], details = [] }) {
  const section = document.createElement("div");
  section.className = "report-section";

  const header = document.createElement("div");
  header.className = "section-header";

  const titleEl = document.createElement("div");
  titleEl.className = "section-title";
  titleEl.textContent = title || formatTitle(key);
  header.appendChild(titleEl);

  if (score !== undefined && score !== null) {
    const badge = document.createElement("div");
    badge.className = "section-score";
    badge.textContent = formatNumber(score, 0);
    header.appendChild(badge);
  }

  section.appendChild(header);

  if (summary) {
    const summaryEl = document.createElement("div");
    summaryEl.className = "section-summary";
    summaryEl.textContent = summary;
    section.appendChild(summaryEl);
  }

  if (chips.length) {
    const chipWrap = document.createElement("div");
    chipWrap.className = "section-chips";
    for (const chipData of chips) {
      chipWrap.appendChild(createChip(chipData));
    }
    section.appendChild(chipWrap);
  }

  if (details.length) {
    const grid = document.createElement("div");
    grid.className = "details-grid";
    for (const detail of details) {
      grid.appendChild(buildDetailCard(detail));
    }
    section.appendChild(grid);
  }

  return section;
}

function renderSummary(report) {
  if (!summaryEl) return false;
  clearElement(summaryEl);

  const overall = report?.overall || {};

  const fragment = document.createDocumentFragment();
  fragment.appendChild(createSummaryMetric("Success Rate", formatPercent(overall?.success_rate ?? null, 0)));
  fragment.appendChild(createSummaryMetric("Average WPM", formatNumber(overall?.average_wpm ?? null, 1)));
  fragment.appendChild(createSummaryMetric("Speaking Time", formatSeconds(overall?.total_speaking_time_s)));
  fragment.appendChild(createSummaryMetric("Data Consistency", formatPercent(overall?.data_consistency ?? null, 0)));

  const calmnessScore = report?.communication_skill?.calmness_score;
  if (calmnessScore !== undefined) {
    fragment.appendChild(createSummaryMetric("Calmness Score", formatPercent(calmnessScore ?? null, 0)));
  }

  summaryEl.appendChild(fragment);
  return true;
}

function flattenCommunicationDetails(details) {
  const flattened = [];
  if (!Array.isArray(details)) return flattened;
  for (const entry of details) {
    const rows = Array.isArray(entry?.data) ? entry.data : [];
    for (const row of rows) {
      flattened.push({
        conversation_index: row?.conversation_index,
        issues: Array.isArray(row?.issues) ? row.issues : [],
        extras: [
          ...(Array.isArray(row?.extras) ? row.extras : []),
          ...(Array.isArray(row?.emotions) ? row.emotions : []),
        ],
        extras_summary: row?.extras_summary,
      });
    }
  }
  return flattened;
}

function normalizeDetails(key, payload) {
  if (!payload) return [];

  if (Array.isArray(payload.details)) {
    if (key === "communication_skill") {
      return flattenCommunicationDetails(payload.details);
    }
    return payload.details;
  }

  if (Array.isArray(payload.details?.details)) {
    return flattenCommunicationDetails(payload.details.details);
  }

  return [];
}

function renderSections(report) {
  if (!sectionsEl) return false;
  clearElement(sectionsEl);

  const sectionConfig = [
    { key: "academic_clarity", payload: report?.academic_clarity },
    { key: "financial_sufficiency", payload: report?.financial_sufficiency },
    { key: "home_ties", payload: report?.home_ties },
    { key: "communication_skill", payload: report?.communication_skill },
  ];

  const fragment = document.createDocumentFragment();
  for (const { key, payload } of sectionConfig) {
    if (!payload) continue;

    const chips = [];
    if (key === "communication_skill" && Array.isArray(payload.cards)) {
      for (const card of payload.cards) {
        chips.push({
          title: card?.title,
          score: card?.score,
          summary: card?.summary,
          show_percentage: false,
        });
      }
    }

    const details = normalizeDetails(key, payload);

    const sectionEl = buildSection({
      key,
      title: formatTitle(key),
      score: payload?.score,
      summary: payload?.score_summary,
      chips,
      details,
    });

    fragment.appendChild(sectionEl);
  }

  if (!fragment.childNodes.length) return false;
  sectionsEl.appendChild(fragment);
  return true;
}

function renderRecordings(report) {
  if (!recordingsEl) return false;
  clearElement(recordingsEl);

  const categories = Array.isArray(report?.user_data) ? report.user_data : [];
  if (!categories.length) return false;

  for (const categoryBlock of categories) {
    const catTitle = formatTitle(categoryBlock?.category || "Interview");
    const entries = Array.isArray(categoryBlock?.data) ? categoryBlock.data : [];

    for (const entry of entries) {
      const card = document.createElement("div");
      card.className = "recording-card";

      const catEl = document.createElement("div");
      catEl.className = "category";
      catEl.textContent = catTitle;
      card.appendChild(catEl);

      const question = (entry?.question_text || "").toString().trim();
      if (question) {
        const qEl = document.createElement("div");
        qEl.className = "question";
        qEl.textContent = question;
        card.appendChild(qEl);
      }

      const answer = (entry?.user_answer_text || "").toString().trim();
      if (answer) {
        const aEl = document.createElement("div");
        aEl.className = "answer";
        aEl.textContent = answer;
        card.appendChild(aEl);
      }

      const url = (entry?.recording_url || "").toString().trim();
      if (url) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.src = url;
        card.appendChild(audio);
      }

      recordingsEl.appendChild(card);
    }
  }

  return true;
}

function showLoader(show) {
  if (!loaderEl) return;
  loaderEl.classList.toggle("is-hidden", !show);
}

function showEmptyState() {
  showLoader(false);
  if (emptyEl) emptyEl.classList.remove("is-hidden");
  if (summarySection) summarySection.classList.add("is-hidden");
  if (sectionsSection) sectionsSection.classList.add("is-hidden");
  if (recordingsSection) recordingsSection.classList.add("is-hidden");
  if (metaEl) metaEl.textContent = "No report data available.";
}

function loadReport() {
  try {
    const raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.report) return null;
    return {
      report: parsed.report,
      generatedAt: parsed.generatedAt,
    };
  } catch {
    return null;
  }
}

function renderReportPage(report, generatedAt) {
  showLoader(false);
  if (emptyEl) emptyEl.classList.add("is-hidden");

  if (metaEl) {
    const date = generatedAt ? new Date(generatedAt) : null;
    const formatted = date && !Number.isNaN(date.valueOf())
      ? date.toLocaleString()
      : "Just now";
    metaEl.textContent = `Generated ${formatted}.`;
  }

  const hasSummary = renderSummary(report);
  if (summarySection) summarySection.classList.toggle("is-hidden", !hasSummary);

  const hasSections = renderSections(report);
  if (sectionsSection) sectionsSection.classList.toggle("is-hidden", !hasSections);

  const hasRecordings = renderRecordings(report);
  if (recordingsSection) recordingsSection.classList.toggle("is-hidden", !hasRecordings);
}

function goHome() {
  window.location.href = "./index.html";
}

if (backButton) backButton.addEventListener("click", goHome);
if (returnButton) returnButton.addEventListener("click", goHome);

document.addEventListener("DOMContentLoaded", () => {
  const payload = loadReport();
  if (!payload) {
    showEmptyState();
    return;
  }

  renderReportPage(payload.report, payload.generatedAt);
});