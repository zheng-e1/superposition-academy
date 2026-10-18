/** 按需加载演示模块：进入视口前不下载、不执行。 */

type DemoModule = {
  mount: (host: HTMLElement, props?: Record<string, unknown>) => {
    replay?: () => void;
    destroy?: () => void;
  };
};

const loaders: Record<string, () => Promise<DemoModule>> = {
  polarizer: () => import('./polarizer'),
  amplitude: () => import('./amplitude'),
  interference: () => import('./interference'),
  bloch: () => import('./bloch'),
  circuit: () => import('./circuit'),
  grover: () => import('./grover'),
  bell: () => import('./bell'),
  bb84: () => import('./bb84'),
  bitflip: () => import('./bitflip'),
  noise: () => import('./noise'),
  hardware: () => import('./hardware'),
};

const mounted = new WeakSet<HTMLElement>();

async function mountDemo(figure: HTMLElement) {
  if (mounted.has(figure)) return;
  mounted.add(figure);
  const kind = figure.dataset.demo || '';
  const body = figure.querySelector<HTMLElement>('.demo-body');
  if (!body) return;

  const loader = loaders[kind];
  if (!loader) {
    body.innerHTML = `<p class="muted tiny">演示「${kind}」尚未实现。</p>`;
    return;
  }

  let props: Record<string, unknown> = {};
  try {
    props = figure.dataset.props ? JSON.parse(figure.dataset.props) : {};
  } catch {
    props = {};
  }

  try {
    const mod = await loader();
    const api = mod.mount(body, props);
    const replay = figure.querySelector<HTMLButtonElement>('[data-replay]');
    if (replay && api.replay) {
      replay.addEventListener('click', () => api.replay?.());
    } else if (replay) {
      replay.hidden = true;
    }
  } catch (err) {
    console.error('[demo]', kind, err);
    body.innerHTML = `<p class="muted tiny">演示加载失败：${(err as Error).message}</p>`;
  }
}

const figures = Array.from(document.querySelectorAll<HTMLElement>('[data-demo]'));
if (figures.length) {
  if (!('IntersectionObserver' in window)) {
    figures.forEach((f) => void mountDemo(f));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          void mountDemo(e.target as HTMLElement);
        }
      },
      { rootMargin: '320px 0px' },
    );
    figures.forEach((f) => io.observe(f));
  }
}
