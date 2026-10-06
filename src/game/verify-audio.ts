/**
 * 音频资源回归测试：注册 / 播放 / 循环 / 降级 / 与合成音效共存。
 * 运行：npx tsx src/game/verify-audio.ts
 *
 * 无 AudioContext 环境（Node）下用 mock 注入，验证资源管理逻辑。
 */
import { AudioManager } from './audio';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

/** 最小 AudioContext mock */
function makeMockCtx() {
  const started: any[] = [];
  const stopped: any[] = [];
  const ctx: any = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: () => Promise.resolve(),
    createOscillator: () => ({
      type: 'sine',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    }),
    createGain: () => ({
      gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    }),
    createBufferSource: () => {
      const src: any = {
        buffer: null,
        loop: false,
        connect() {},
        start() { started.push(src); },
        stop() { stopped.push(src); },
      };
      return src;
    },
    decodeAudioData: async () => ({ duration: 1, length: 44100 }),
  };
  return { ctx, started, stopped };
}

/** 构造一个 AudioManager 并注入 mock AudioContext */
function withMock(): { mgr: AudioManager; started: any[]; stopped: any[] } {
  const { ctx, started, stopped } = makeMockCtx();
  const mgr = new AudioManager();
  // 注入 mock：让 ensureCtx 返回我们的假 ctx
  (mgr as any).ctx = ctx;
  return { mgr, started, stopped };
}

/** 假 AudioBuffer */
const fakeBuffer = { duration: 1, length: 44100 } as any;

async function main(): Promise<void> {
// ---- 1. 无 AudioContext 时静默降级 ----
console.log('1) 降级（无 AudioContext）');
{
  const mgr = new AudioManager();
  // 强制 ensureCtx 返回 null
  (mgr as any).enabled = false;
  check('play 不抛错', (() => { mgr.play('jump'); return true; })());
  check('playResource 返回 false', mgr.playResource('bgm') === false);
  check('load 返回 false', (await mgr.load('bgm', '/x.mp3')) === false);
}

// ---- 2. 注册与查询 ----
console.log('2) 注册与查询');
{
  const { mgr } = withMock();
  check('初始无资源', mgr.loadedIds().length === 0);
  check('has 未注册返回 false', !mgr.has('bgm'));

  mgr.registerBuffer('bgm', fakeBuffer);
  check('注册后可查询', mgr.has('bgm'));
  check('loadedIds 含 bgm', mgr.loadedIds().includes('bgm'));

  mgr.registerBuffer('hit', fakeBuffer);
  check('可注册多个', mgr.loadedIds().length === 2);
}

// ---- 3. 按 id 播放 ----
console.log('3) 按 id 播放');
{
  const { mgr, started } = withMock();
  mgr.registerBuffer('bgm', fakeBuffer);

  check('播放已注册资源成功', mgr.playResource('bgm') === true);
  check('触发了 createBufferSource.start', started.length === 1);

  check('播放未注册资源失败', mgr.playResource('nope') === false);
  check('失败不新增播放', started.length === 1);

  // 音量参数
  check('带音量播放成功', mgr.playResource('bgm', 0.5) === true);
  check('音量参数生效（新增播放）', started.length === 2);
}

// ---- 4. 循环音源 ----
console.log('4) 循环音源');
{
  const { mgr, started, stopped } = withMock();
  mgr.registerBuffer('bgm', fakeBuffer);

  check('循环播放成功', mgr.playResource('bgm', 1, true) === true);
  check('循环音源已记录', started[0].loop === true);

  check('停止循环成功', mgr.stopLoop('bgm') === true);
  check('停止触发了 stop', stopped.length === 1);
  check('停止后记录清除', mgr.stopLoop('bgm') === false);

  // stopAllLoops
  mgr.playResource('bgm', 1, true);
  mgr.registerBuffer('amb', fakeBuffer);
  mgr.playResource('amb', 1, true);
  mgr.stopAllLoops();
  check('stopAllLoops 停止全部', mgr.stopLoop('bgm') === false && mgr.stopLoop('amb') === false);

  // 非循环不记录
  mgr.playResource('bgm', 1, false);
  check('非循环音源不记录（stopLoop 返回 false）', mgr.stopLoop('bgm') === false);
}

// ---- 5. 加载（mock fetch + decode）----
console.log('5) 加载');
{
  const { mgr } = withMock();
  // Node 无 fetch：注入最小桩
  const origFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  try {
    const ok = await mgr.load('sfx', '/sfx.mp3');
    check('加载成功返回 true', ok === true);
    check('加载后可查询', mgr.has('sfx'));
    check('加载后可播放', mgr.playResource('sfx') === true);

    // 失败路径：404
    (globalThis as any).fetch = async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
    check('404 时返回 false', (await mgr.load('bad', '/bad.mp3')) === false);
    check('404 不注册资源', !mgr.has('bad'));

    // 失败路径：fetch 抛错
    (globalThis as any).fetch = async () => { throw new Error('network'); };
    check('网络错误时返回 false（不抛错）', (await mgr.load('bad2', '/bad2.mp3')) === false);
  } finally {
    (globalThis as any).fetch = origFetch;
  }
}

// ---- 6. 清空资源 ----
console.log('6) 清空资源');
{
  const { mgr, stopped } = withMock();
  mgr.registerBuffer('bgm', fakeBuffer);
  mgr.playResource('bgm', 1, true);
  mgr.clearResources();
  check('清空后无资源', mgr.loadedIds().length === 0);
  check('清空时停止循环', stopped.length === 1);
  check('清空后播放失败', mgr.playResource('bgm') === false);
}

// ---- 7. 合成音效与资源音效共存 ----
console.log('7) 合成音效共存');
{
  const { mgr } = withMock();
  // 合成音效（程序生成，不依赖资源）
  check('合成音效可播放（不抛错）', (() => { mgr.play('jump'); return true; })());
  check('合成音效不影响资源表', mgr.loadedIds().length === 0);

  mgr.registerBuffer('bgm', fakeBuffer);
  mgr.play('hit');
  check('资源音效与合成音效可共存', mgr.has('bgm') && mgr.playResource('bgm'));
}

// ---- 8. 开关与音量不影响资源接口 ----
console.log('8) 开关');
{
  const { mgr } = withMock();
  mgr.registerBuffer('bgm', fakeBuffer);
  mgr.setEnabled(false);
  check('isEnabled 反映状态', mgr.isEnabled() === false);
  mgr.setEnabled(true);
  check('重新启用后可播放', mgr.isEnabled() && mgr.playResource('bgm'));
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
}

main();
