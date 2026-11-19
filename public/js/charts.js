// Barra simples (série única) para receita dos últimos 7 dias.
function renderBarChart(container, series) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  container.innerHTML = '';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';
  series.forEach((point) => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const heightPct = Math.max(2, Math.round((point.revenue / max) * 100));
    const label = new Date(point.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' });
    col.innerHTML = `
      <span class="bar-value">${point.revenue > 0 ? formatBRL(point.revenue).replace('R$', '').trim() : ''}</span>
      <div class="bar" style="height:${heightPct}%" title="${formatDate(point.date)}: ${formatBRL(point.revenue)} (${point.cars} carro(s))"></div>
      <span class="bar-label">${label.replace('.', '')}</span>
    `;
    chart.appendChild(col);
  });
  container.appendChild(chart);
}

const CATEGORY_COLORS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6'];

function renderBreakdown(container, rows, labelKey, valueKey, labelMap) {
  container.innerHTML = '';
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="empty-msg">Sem dados neste período.</p>';
    return;
  }
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  rows.forEach((row, i) => {
    const color = `var(${CATEGORY_COLORS[i % CATEGORY_COLORS.length]})`;
    const pct = Math.max(2, Math.round((row[valueKey] / max) * 100));
    const label = (labelMap && labelMap[row[labelKey]]) || row[labelKey];
    const div = document.createElement('div');
    div.className = 'breakdown-row';
    div.innerHTML = `
      <span class="bd-label">${label}</span>
      <span class="bd-track"><span class="bd-fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="bd-value">${formatBRL(row[valueKey])}</span>
    `;
    container.appendChild(div);
  });
}
