import { el } from './kit';

/** 五条技术路线对比：点表头排序，数据是公开报道的量级。 */

interface Row {
  name: string;
  qubits: string;
  qubitsN: number;
  one: number;
  two: number;
  t2: string;
  temp: string;
  pro: string;
  con: string;
}

const ROWS: Row[] = [
  {
    name: '超导（transmon）',
    qubits: '50 – 1000+',
    qubitsN: 1000,
    one: 99.9,
    two: 99.4,
    t2: '~100 µs',
    temp: '~10 mK',
    pro: '门快、工艺成熟、易集成',
    con: '需稀释制冷机，布线密度限制规模',
  },
  {
    name: '离子阱',
    qubits: '20 – 60',
    qubitsN: 60,
    one: 99.99,
    two: 99.7,
    t2: '~1 s',
    temp: '室温真空腔',
    pro: '保真度最高、全连通',
    con: '门速度慢，规模化困难',
  },
  {
    name: '中性原子',
    qubits: '100 – 1000+',
    qubitsN: 800,
    one: 99.9,
    two: 99.5,
    t2: '~1 – 10 s',
    temp: 'µK 量级',
    pro: '大规模阵列、可重构布线',
    con: '门速度与原子丢失率待改进',
  },
  {
    name: '光子',
    qubits: '数十 – 数百',
    qubitsN: 200,
    one: 99.9,
    two: 99.0,
    t2: '—',
    temp: '室温',
    pro: '室温运行、易传输、适合联网',
    con: '双比特门是概率性的，损耗大',
  },
  {
    name: '拓扑',
    qubits: '个位数（实验）',
    qubitsN: 5,
    one: 99.0,
    two: 95.0,
    t2: '—',
    temp: 'mK 量级',
    pro: '理论上对局部噪声免疫',
    con: '仍在早期，尚未证明可规模化',
  },
];

const COLUMNS: { key: keyof Row | 'index'; label: string; numeric?: boolean }[] = [
  { key: 'name', label: '技术路线' },
  { key: 'qubits', label: '比特量级' },
  { key: 'two', label: '双门保真', numeric: true },
  { key: 't2', label: '相干时间' },
  { key: 'temp', label: '温度' },
  { key: 'pro', label: '优势' },
  { key: 'con', label: '短板' },
];

export function mount(host: HTMLElement) {
  const wrap = el('div', { class: 'hw-wrap' });
  const table = el('table', { class: 'hw-table' });
  const thead = el('thead');
  const headRow = el('tr');
  const tbody = el('tbody');
  table.append(thead, tbody);
  thead.append(headRow);
  wrap.append(table);

  let sortKey: keyof Row = 'two';
  let desc = true;

  const renderHead = () => {
    headRow.innerHTML = '';
    for (const col of COLUMNS) {
      const th = el('th');
      const btn = el('button', { class: 'hw-sort' });
      btn.type = 'button';
      btn.append(
        document.createTextNode(col.label),
        el('span', {
          class: 'hw-arrow',
          text: sortKey === col.key ? (desc ? ' ↓' : ' ↑') : '',
        }),
      );
      btn.addEventListener('click', () => {
        if (sortKey === col.key) desc = !desc;
        else {
          sortKey = col.key as keyof Row;
          desc = true;
        }
        render();
      });
      th.append(btn);
      headRow.append(th);
    }
  };

  const render = () => {
    renderHead();
    const rows = [...ROWS].sort((a, b) => {
      const av = sortKey === 'qubits' ? a.qubitsN : a[sortKey];
      const bv = sortKey === 'qubits' ? b.qubitsN : b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
      return desc
        ? String(bv).localeCompare(String(av), 'zh-CN')
        : String(av).localeCompare(String(bv), 'zh-CN');
    });
    tbody.innerHTML = '';
    for (const r of rows) {
      const tr = el('tr');
      tr.append(
        el('td', { class: 'hw-name', text: r.name }),
        el('td', { class: 'mono', text: r.qubits }),
        el('td', { class: 'mono', text: `${r.two.toFixed(1)}%` }),
        el('td', { class: 'mono', text: r.t2 }),
        el('td', { class: 'mono', text: r.temp }),
        el('td', { text: r.pro }),
        el('td', { text: r.con }),
      );
      tbody.append(tr);
    }
  };

  host.append(wrap);
  host.append(
    el('p', {
      class: 'hw-note muted tiny',
      text: '数值为公开资料的量级估计，随年份与具体设备变化；「双门保真」一列可直接点击排序。',
    }),
  );
  render();

  return {
    replay: () => {
      sortKey = 'two';
      desc = true;
      render();
    },
  };
}
