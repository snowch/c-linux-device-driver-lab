import { course } from './course.mjs';
import { tutorials } from './walkthroughs.mjs';
import { references } from './references.mjs';

const $ = id => document.getElementById(id);
const source = $('source');
const file = $('file');
const terminal = $('terminal');
const shellOutput = $('shell-output');
const command = $('command');
const status = $('runtime-status');
const runButton = $('run');
const buildButton = $('build-source');
const encoder = new TextEncoder();
let decoder = new TextDecoder();
const serialByte = new Uint8Array(1);
const defaults = new Map();
const edits = new Map();
const draftMessages = new Map();
const latestRuns = new Map();
const earlierRuns = new Map();
const files = Object.keys(course.files);
const key = 'linux-lab:' + course.slug + ':';
let lesson, activeFile, selection = 0, sourceError = '';
let vm, guestReady = false, resetting = false;
let activeRun, runNumber = 0, line = '', shellText = '';

function read(keyName) {
  try { return localStorage.getItem(key + keyName); } catch { return null; }
}
function save(keyName, value) {
  try { localStorage.setItem(key + keyName, value); return true; } catch { return false; }
}
function remove(keyName) {
  try { localStorage.removeItem(key + keyName); return true; } catch { return false; }
}
function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
}
theme(read('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => {
  const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  theme(value);
  save('theme', value);
};

const starterFiles = Promise.all(Object.entries(course.files).map(async ([name, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw Error('Could not load ' + name + '. Reload this page to try again.');
  defaults.set(name, await response.text());
})).then(() => true).catch(error => {
  sourceError = error.message;
  return false;
});

for (const name of files) file.add(new Option(name, name));

function draftKey(name = activeFile, item = lesson) { return item.id + '/' + name; }
function valueOf(name, item = lesson) {
  const draft = draftKey(name, item);
  return edits.get(draft) ?? read(draft) ?? defaults.get(name);
}
function showDraftStatus() {
  const message = source.disabled ? undefined : draftMessages.get(draftKey());
  const notice = $('draft-status');
  if (notice.textContent !== (message?.text ?? '')) notice.textContent = message?.text ?? '';
  notice.hidden = !message;
  $('draft-backup').hidden = message?.saved !== false;
  $('draft-notice').hidden = source.disabled || !files.some(name => valueOf(name) !== defaults.get(name));
  $('restore').hidden = source.disabled || (source.value === defaults.get(activeFile) && message?.saved !== false);
}
function positionSource(needle) {
  const scope = activeFile === lesson.file ? Math.max(0, source.value.indexOf(lesson.focus)) : 0;
  const afterFocus = source.value.indexOf(needle, scope);
  const start = afterFocus >= 0 ? afterFocus : source.value.indexOf(needle);
  if (start < 0) return;
  source.setSelectionRange(start, start);
  const row = source.value.slice(0, start).split('\n').length;
  const lineHeight = parseFloat(getComputedStyle(source).lineHeight);
  source.scrollTop = Math.max(0, (row - 3) * lineHeight);
  source.scrollLeft = 0;
}
function showSource(name) {
  activeFile = name;
  file.value = name;
  source.setAttribute('aria-label', 'Editable source · ' + name);
  source.value = valueOf(name) ?? '';
  source.scrollTop = 0;
  source.scrollLeft = 0;
  if (name === lesson.file) positionSource(lesson.focus);
}
$('edit-step').onclick = () => {
  $('program').open = true;
  const tutorial = tutorials[lesson.id];
  const targetFile = tutorial.editFile ?? lesson.file;
  if (activeFile !== targetFile) {
    showSource(targetFile);
    showDraftStatus();
  }
  const edit = tutorial.edit;
  source.focus();
  positionSource(source.value.includes(edit) ? edit : lesson.focus);
};
$('program').addEventListener('toggle', () => {
  if ($('program').open && document.activeElement !== source && activeFile === lesson.file)
    positionSource(lesson.focus);
});
source.oninput = () => {
  const draft = draftKey();
  edits.set(draft, source.value);
  const saved = save(draft, source.value);
  draftMessages.set(draft, {
    saved,
    text: saved ? 'Draft saved in this browser.' :
      'The browser could not save this edit. You can keep working in this tab and download the source before leaving.'
  });
  showDraftStatus();
  showRun();
};
file.onchange = () => {
  showSource(file.value);
  showDraftStatus();
};
$('restore').onclick = () => {
  if (!confirm(`Restore the starter for ${activeFile} in this lesson? Other files will keep their edits.`)) return;
  const draft = draftKey();
  const saved = remove(draft);
  if (saved) edits.delete(draft);
  else edits.set(draft, defaults.get(activeFile));
  draftMessages.set(draft, {
    saved,
    text: saved ? 'Starter source restored.' :
      'Starter source restored in this tab. The browser could not remove the saved draft, which may return when you reopen the lesson.'
  });
  showSource(activeFile);
  showDraftStatus();
  showRun();
  source.focus({ preventScroll: true });
};
$('download-source').onclick = () => {
  const url = URL.createObjectURL(new Blob([source.value], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.download = activeFile;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const picker = $('lesson-picker');
let group;
for (const item of course.lessons) {
  if (group?.label !== item.section) {
    group = document.createElement('optgroup');
    group.label = item.section;
    picker.append(group);
  }
  group.append(new Option(item.title, item.id));
}
picker.onchange = () => { location.hash = picker.value; };

function showReferences(id) {
  $('lesson-references').open = false;
  $('reference-list').replaceChildren(...references[id].map(({ title, url, note }) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = note;
    item.append(link, detail);
    return item;
  }));
}

async function showLesson(index) {
  lesson = course.lessons[index];
  const thisSelection = ++selection;
  const tutorial = tutorials[lesson.id];
  $('program').open = false;
  $('draft-notice').hidden = true;
  $('walkthrough').replaceChildren(...tutorial.steps.map(step => {
    const item = document.createElement('li');
    const title = document.createElement('h3');
    const description = document.createElement('p');
    const sample = document.createElement('pre');
    sample.tabIndex = 0;
    const code = document.createElement('code');
    title.textContent = step.heading;
    description.textContent = step.text;
    code.textContent = step.code;
    sample.append(code);
    const file = document.createElement('figcaption');
    const excerpt = document.createElement('figure');
    file.textContent = step.file;
    excerpt.append(file, sample);
    item.append(title, description, excerpt);
    return item;
  }));
  document.title = lesson.title + ' · ' + course.title;
  for (const [id, field] of Object.entries({
    'lesson-title':'title', section:'section', intro:'intro', question:'question', evidence:'evidence',
    instructions:'instructions', task:'task', hint:'hint', explanation:'explanation',
    transfer:'transfer'
  })) $(id).textContent = lesson[field] ?? course[field] ?? '';
  showReferences(lesson.id);
  picker.value = lesson.id;
  $('next-lesson').replaceChildren();
  for (const [other, label] of [[course.lessons[index - 1], 'Previous'], [course.lessons[index + 1], 'Next']]) {
    if (!other) continue;
    const link = document.createElement('a');
    link.href = '#' + other.id;
    link.textContent = label + ' · ' + other.title;
    $('next-lesson').append(link);
  }
  source.disabled = true;
  file.disabled = true;
  $('edit-step').disabled = true;
  source.value = '';
  file.value = lesson.file;
  openComparison();
  showDraftStatus();
  showRun();
  const sourceReady = await starterFiles;
  if (selection !== thisSelection) return;
  if (sourceReady) {
    showSource(lesson.file);
    source.disabled = false;
    file.disabled = false;
    $('edit-step').disabled = false;
    showDraftStatus();
  }
  showRun();
}
function showRoute(moveFocus = false) {
  const index = course.lessons.findIndex(item => '#' + item.id === location.hash);
  const inLesson = index >= 0;
  const pickerFocused = document.activeElement === picker;
  $('overview').hidden = inLesson;
  $('overview-icon').hidden = inLesson;
  $('overview-link').hidden = !inLesson;
  $('lesson-navigation').hidden = !inLesson;
  $('workbench').hidden = !inLesson;
  if (inLesson) void showLesson(index);
  else {
    lesson = undefined;
    selection++;
    document.title = course.title;
  }
  if (moveFocus) {
    if (!inLesson || !pickerFocused)
      $(inLesson ? 'lesson-title' : 'overview-title').focus({preventScroll: true});
    $('main').scrollIntoView();
  }
}
document.querySelector('.skip-link').onclick = event => {
  event.preventDefault();
  $('main').focus();
};
addEventListener('hashchange', () => {
  if (location.hash !== '#main') showRoute(true);
});
showRoute();

let repaint = 0;
function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function paint() {
  if (!repaint) repaint = requestAnimationFrame(() => {
    repaint = 0;
    showOutput();
  });
}
function output(element, text) {
  const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
  setText(element, text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''));
  if (nearBottom) element.scrollTop = element.scrollHeight;
}
function showOutput() {
  if (!lesson) return;
  const run = latestRuns.get(lesson.id);
  const liveLine = run && run === activeRun && run.capture ? line : '';
  output(terminal, run ? (run.text + liveLine || 'Waiting for Linux output…') :
    'Select Run in Linux to see output from this lesson.');
  output(shellOutput, shellText + (!activeRun ? line : '') || 'Linux is off.');
}
function openComparison() {
  const current = latestRuns.get(lesson.id);
  const earlier = earlierRuns.get(lesson.id);
  $('earlier-run').open = Boolean(earlier && current !== activeRun &&
    files.some(name => earlier.sources.get(name) !== current.sources.get(name)));
}
function sourceKind(run) {
  return files.some(name => run.sources.get(name) !== defaults.get(name)) ? 'edited source' : 'starter source';
}
function showRun() {
  if (!lesson) return;
  const run = latestRuns.get(lesson.id);
  const earlier = earlierRuns.get(lesson.id);
  const sourceLabel = $('result-source');
  sourceLabel.hidden = !run;
  if (run) {
    const stale = files.some(name => run.sources.get(name) !== valueOf(name));
    setText(sourceLabel, `Run ${run.number} ${run.capture ? 'used' : 'selected'} ${sourceKind(run)}.` +
      (stale ? ' A source file has changed. Select Run in Linux to use the current files.' : ''));
  }
  $('earlier-run').hidden = !earlier;
  if (earlier) {
    setText($('earlier-run').querySelector('summary'), `Previous completed run ${earlier.number} · ${sourceKind(earlier)}`);
    setText($('earlier-output'), earlier.text);
  }
  const busy = Boolean(activeRun || resetting);
  const message = resetting ? 'Resetting Linux…' : activeRun && activeRun !== run ?
    `A run is active in ${activeRun.lesson.title}.` : run?.message ?? (guestReady ? 'Linux is ready' : 'Linux is off');
  setText(status, sourceError || message);
  for (const button of [runButton, buildButton]) {
    button.disabled = source.disabled;
    if (busy) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
  }
  const stopButton = $('stop');
  const canStop = activeRun && activeRun === run && (run.bootController || run.submitted);
  if (!canStop && document.activeElement === stopButton)
    runButton.focus({ preventScroll: true });
  stopButton.hidden = !canStop;
  stopButton.disabled = Boolean(run?.bootController?.signal.aborted);
  if (canStop) setText(stopButton, run.bootController ? 'Cancel Linux startup' : 'Interrupt run');
  const shellReady = guestReady && !busy;
  command.disabled = !shellReady;
  $('shell').querySelector('button').disabled = !shellReady;
  $('shell-stop').disabled = !shellReady;
  $('restart').disabled = !guestReady || resetting || Boolean(activeRun && !activeRun.submitted);
  showOutput();
}
function runMessage(run, message) {
  run.message = message;
  showRun();
}
function complete(run, message, completed = false) {
  run.completed = completed;
  activeRun = undefined;
  line = '';
  if (lesson === run.lesson) openComparison();
  runMessage(run, message);
}
function receive(byte) {
  const run = activeRun;
  if (byte === 10) {
    const completed = line;
    line = '';
    if (run && completed === run.startMarker) {
      run.capture = true;
    } else if (run && completed === run.programMarker) {
      run.program = true;
      runMessage(run, 'Running the lesson check');
    } else if (run && completed.startsWith(run.resultMarker) && /^\d+$/.test(completed.slice(run.resultMarker.length))) {
      const exit = completed.slice(run.resultMarker.length);
      if (exit === '0') complete(run, 'Run completed', true);
      else if (run.interrupt && (exit === '130' || exit === '143')) complete(run, 'Run interrupted');
      else if (run.program) complete(run, 'Program exited with status ' + exit);
      else if (run.staged) complete(run, 'Build or setup failed with status ' + exit);
      else complete(run, 'Run exited with status ' + exit);
    } else if (run?.capture) {
      run.text = (run.text + completed + '\n').slice(-32000);
    } else if (!run) {
      shellText = (shellText + completed + '\n').slice(-16000);
    }
  } else if (byte === 8) {
    line = line.slice(0, -1);
  } else if (byte !== 13 && (byte >= 32 || byte === 9 || byte === 27)) {
    serialByte[0] = byte;
    line = (line + decoder.decode(serialByte, { stream: true })).slice(-5000);
    if (run?.interrupt && line === '~ # ') complete(run, 'Run interrupted');
  }
  paint();
}

async function initrd(run, signal) {
  const response = await fetch('./runtime/parts.json', { signal });
  if (!response.ok) throw Error('Could not open the Linux guest manifest');
  const { parts, bytes } = await response.json();
  const image = new Uint8Array(bytes);
  // The image builder writes fixed 16 MiB parts, with a shorter final part.
  // Stream into the final buffer so overlapping requests do not duplicate the image.
  const partSize = 16 * 1024 * 1024;
  if (parts.length !== Math.ceil(bytes / partSize)) throw Error('Invalid Linux guest manifest');
  let loaded = 0, progress = -1;
  async function loadPart(name, index) {
    const start = index * partSize;
    const end = Math.min(start + partSize, bytes);
    let offset = start;
    const part = await fetch('./runtime/' + name, { signal });
    if (!part.ok) throw Error('Could not load Linux guest file ' + name);
    function append(chunk) {
      if (offset + chunk.length > end) throw Error('Invalid Linux guest file ' + name);
      image.set(chunk, offset);
      offset += chunk.length;
      loaded += chunk.length;
      const percent = Math.floor(100 * loaded / bytes);
      if (percent !== progress) {
        progress = percent;
        runMessage(run, 'Loading Linux image · ' + progress + '%');
      }
    }
    if (part.body?.getReader) {
      const reader = part.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          append(value);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      append(new Uint8Array(await part.arrayBuffer()));
    }
    if (offset !== end) throw Error('Incomplete Linux guest file ' + name);
  }
  const batchSize = 3;
  for (let index = 0; index < parts.length; index += batchSize) {
    await Promise.all(parts.slice(index, index + batchSize).map((name, offset) =>
      loadPart(name, index + offset)));
  }
  return image.buffer;
}

async function bootLinux(run, signal) {
  shellText = '';
  line = '';
  decoder = new TextDecoder();
  const [{ V86 }, image] = await Promise.all([import('./runtime/libv86.mjs'), initrd(run, signal)]);
  signal.throwIfAborted();
  runMessage(run, 'Booting Linux');
  vm = new V86({
    wasm_path: './runtime/v86.wasm',
    bios: { url: './runtime/seabios.bin' },
    vga_bios: { url: './runtime/vgabios.bin' },
    bzimage: { url: './runtime/vmlinuz-virt' },
    initrd: { buffer: image },
    cmdline: 'console=ttyS0,115200 rdinit=/init rootfstype=ramfs nokaslr panic=1 quiet',
    disable_keyboard: true, disable_mouse: true,
    memory_size: 768 * 1024 * 1024, filesystem: {}, autostart: true
  });
  await new Promise((resolve, reject) => {
    let recent = '';
    const timeout = setTimeout(() => finish(new Error('Linux did not reach its shell. Try running again.')), 300000);
    const cancel = () => finish(signal.reason);
    function finish(error) {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      vm.remove_listener('serial0-output-byte', listener);
      if (error) reject(error); else resolve();
    }
    function listener(byte) {
      recent = (recent + String.fromCharCode(byte)).slice(-200);
      if (recent.includes('LAB_EXCHANGE_FAILED')) finish(Error('Linux could not mount the editor file share.'));
      else if (recent.includes('LAB_READY') && recent.includes('~ # ')) finish();
    }
    signal.addEventListener('abort', cancel, { once: true });
    vm.add_listener('serial0-output-byte', receive);
    vm.add_listener('serial0-output-byte', listener);
  });
  guestReady = true;
}

async function runExercise(forceBuild) {
  if (!lesson || source.disabled || activeRun || resetting) return;
  const current = lesson;
  const number = ++runNumber;
  const marker = '__LAB_RUN_' + number;
  const run = { lesson: current, number, sources: new Map(files.map(name => [name, valueOf(name, current)])), text: '',
    startMarker: marker + '_START__', programMarker: marker + '_PROGRAM__', resultMarker: marker + '_EXIT__' };
  run.staged = run.sources.get('run-driver.sh').includes('LAB_PROGRAM_MARKER');
  const earlier = latestRuns.get(current.id);
  if (earlier?.completed) earlierRuns.set(current.id, earlier);
  $('earlier-run').open = false;
  latestRuns.set(current.id, run);
  activeRun = run;
  if (!guestReady) run.bootController = new AbortController();
  terminal.scrollTop = 0;
  runMessage(run, guestReady ? 'Preparing source' : 'Loading Linux');
  try {
    if (run.bootController) {
      const signal = run.bootController.signal;
      await bootLinux(run, signal);
      signal.throwIfAborted();
      run.bootController = undefined;
      runMessage(run, 'Preparing source');
    }
    const prefix = 'run-' + number + '-';
    for (const [name, value] of run.sources)
      await vm.create_file(prefix + name, encoder.encode(value));
    const modules = course.starterModules;
    const useStarter = !forceBuild && modules.inputs.every(name => run.sources.get(name) === defaults.get(name));
    const starterPaths = [];
    if (useStarter) {
      for (const name of modules.files) {
        const response = await fetch('./runtime/starter/' + name);
        if (!response.ok) throw Error('Could not load the starter module ' + name);
        await vm.create_file(prefix + name, new Uint8Array(await response.arrayBuffer()));
        starterPaths.push('/exchange/' + prefix + name);
      }
    }
    const input = '/tmp/lesson-input/';
    const temporary = files.map(name => '/exchange/' + prefix + name);
    const scriptName = '/exchange/' + prefix + 'exercise.sh';
    const setup = [
      'set -e',
      `trap 'rm -f ${[...temporary, ...starterPaths, scriptName].join(' ')}' EXIT`,
      'trap "exit 130" INT TERM',
      `printf '\n${run.startMarker}\n'`,
      'mkdir -p ' + input,
      ...files.map((name, index) =>
        `cmp -s ${temporary[index]} ${input}${name} || cp ${temporary[index]} ${input}${name}`)
    ];
    const stamp = '/tmp/device-lab/.module-inputs';
    const moduleSetup = useStarter ? [
      'rm -f ' + stamp,
      ...modules.files.map((name, index) => `cp ${starterPaths[index]} /tmp/device-lab/${name}`),
      `(cd /tmp/device-lab && sha256sum ${modules.inputs.join(' ')} > .module-inputs)`,
      "echo 'Using the packaged starter modules.'"
    ] : forceBuild ? [
      'rm -f ' + stamp + ' /tmp/device-lab/*.ko /tmp/device-lab/*.o /tmp/device-lab/.module-common.o'
    ] : [];
    const script = [...setup, course.prepare, ...moduleSetup,
      `LAB_PROGRAM_MARKER=${run.programMarker} ${current.command}`].join('\n') + '\n';
    await vm.create_file(prefix + 'exercise.sh', encoder.encode(script));
    run.submitted = true;
    runMessage(run, 'Preparing the modules and lesson files');
    vm.serial0_send(`sh ${scriptName}; printf '\\n${run.resultMarker}%s\\n' "$?"\n`);
  } catch (error) {
    const cancelled = run.bootController?.signal.aborted;
    run.bootController?.abort();
    run.bootController = undefined;
    if (vm) await vm.destroy().catch(() => {});
    vm = undefined;
    guestReady = false;
    run.text = cancelled ? 'Select Run in Linux to start again.' : error.message;
    complete(run, cancelled ? 'Linux startup cancelled' : 'Could not start the run');
  }
}
runButton.onclick = () => void runExercise(false);
buildButton.onclick = () => void runExercise(true);

$('stop').onclick = () => {
  if (activeRun?.bootController) {
    activeRun.bootController.abort();
    runMessage(activeRun, 'Stopping Linux startup…');
    return;
  }
  if (!vm || !activeRun?.submitted) return;
  activeRun.interrupt = true;
  runMessage(activeRun, 'Interrupt sent to Linux');
  vm.serial0_send('\x03');
};
$('shell-stop').onclick = () => vm?.serial0_send('\x03');
$('restart').onclick = async () => {
  if (!guestReady || resetting || !confirm('Reset Linux? This clears temporary guest files and keeps editor changes.')) return;
  resetting = true;
  if (activeRun) complete(activeRun, 'Run ended when Linux was reset');
  const old = vm;
  vm = undefined;
  guestReady = false;
  showRun();
  try {
    await old.destroy();
    shellText = 'Linux has been reset. Select Run in Linux to start it again.\n';
  } catch (error) {
    shellText = 'Could not finish resetting Linux: ' + error.message;
  } finally {
    line = '';
    resetting = false;
    showRun();
  }
};
$('shell').onsubmit = event => {
  event.preventDefault();
  if (!guestReady || activeRun || resetting || !command.value.trim()) return;
  vm.serial0_send(command.value + '\n');
  command.value = '';
};

const offline = $('offline');
const offlineStatus = $('offline-status');
function showOffline(message) {
  offlineStatus.textContent = message;
  offlineStatus.hidden = !message;
}
function ask(worker, type, handle) {
  const channel = new MessageChannel();
  channel.port1.onmessage = event => {
    handle(event.data);
    if (event.data.done) channel.port1.close();
  };
  worker.postMessage(type, [channel.port2]);
}
offline.disabled = true;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./offline.js').then(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    ask(worker, 'status', result => {
      offline.disabled = result.saved;
      if (result.saved) {
        offline.textContent = 'Available offline';
        showOffline('This course and its Linux guest are saved on this device.');
      }
    });
    offline.onclick = async () => {
      offline.disabled = true;
      showOffline('Preparing the offline download…');
      try { await navigator.storage?.persist?.(); } catch { /* browser chooses */ }
      ask(worker, 'download', result => {
        showOffline(result.message);
        if (!result.done) return;
        offline.disabled = result.saved;
        if (result.saved) offline.textContent = 'Available offline';
      });
    };
  }).catch(() => showOffline('Offline downloads are unavailable in this browser.'));
} else {
  showOffline('Offline downloads require a browser with service workers.');
}
