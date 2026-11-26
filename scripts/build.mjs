import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildOffline} from './offline.mjs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { course } from '../content/course.mjs';
import { walkthroughs } from '../content/walkthroughs.mjs';

const dist = new URL('../dist/', import.meta.url);
function at(path) { return new URL(path, import.meta.url); }

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const template = await readFile(at('../src/index.html'), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const sections = Map.groupBy(course.lessons, lesson => lesson.section);
const outline = [...sections].map(([section, lessons]) =>
  `<section><h3>${escape(section)}</h3><ul>${lessons.map(lesson =>
    `<li><a href="#${escape(lesson.id)}">${escape(lesson.title)}${lesson.sectionCapstone ? ' · Section capstone' : ''}</a></li>`
  ).join('')}</ul></section>`
).join('\n');
const fields = { ...course.overview, title: course.title, firstLesson: course.lessons[0].id };
const html = template.replace(/{{([a-zA-Z]+)}}/g, (_, key) =>
  key === 'outline' ? outline : escape(fields[key])
);
await writeFile(new URL('index.html', dist), html);
for (const name of ['cover.webp', 'favicon.ico', 'apple-touch-icon.png'])
  await cp(at('../assets/' + name), new URL(name, dist));
// The editor replaces these exact source ranges inside the full guest file.
const editSections = {
  'module-api': ['if [ "$mode" = module ]; then', 'elif [ "$mode" = parameters ]; then'],
  parameters: ['elif [ "$mode" = parameters ]; then', 'elif [ "$mode" = init-error ]; then'],
  'init-error': ['elif [ "$mode" = init-error ]; then', 'elif [ "$mode" = platform-rate ]; then'],
  'platform-rate': ['elif [ "$mode" = platform-rate ]; then', 'elif [ "$mode" = platform ]; then'],
  'waits-capstone': ['static void reset_and_wait(int fd)', 'static void control(int fd)'],
  lifecycle: ['    if [ "$mode" = lifecycle ]; then', '    elif [ "$mode" = open-device ]; then'],
  io: ['static const char payload[]', 'static void nonblock(int fd)'],
  nonblock: ['static void nonblock(int fd)', 'static void blocking_read(int fd)'],
  'short-write': ['static void short_write(int fd)', 'int main(int argc'],
  references: ['    elif [ "$mode" = references ]; then', '    else\n        ./probe'],
  blocking: ['static void blocking_read(int fd)', 'static void events(int fd)'],
  interrupt: ['static void on_alarm(int number)', 'static void short_write(int fd)'],
  control: ['static const char payload[]', 'enum { CHUNK'],
  events: ['static void events(int fd)', 'static void reset_and_wait(int fd)'],
  map: ['static void map_snapshot(int fd)', 'static void on_alarm(int number)'],
  platform: ['#define SAMPLE_RATE', 'static int instrument_probe('],
  capstone: ['    if (argc == 2 && !strcmp(argv[1], "capstone"))', '    for (size_t i = 0; argc == 2']
};
const tutorials = {};
for (const lesson of course.lessons) {
  const guide = walkthroughs[lesson.id];
  if (!guide?.edit || guide.steps?.length < 2)
    throw Error('Incomplete walkthrough for ' + lesson.id);
  const editSource = await readFile(at('../' + course.files[guide.editFile ?? lesson.file]), 'utf8');
  if (!editSource.includes(guide.edit)) throw Error('Missing edit target for ' + lesson.id);
  const steps = await Promise.all(guide.steps.map(async ({heading, text, file, anchor, lines: length}) => {
    const name = file ?? lesson.file;
    const source = await readFile(at('../' + course.files[name]), 'utf8');
    const lines = source.split('\n');
    const focus = name === lesson.file ? source.indexOf(lesson.focus) : -1;
    const matches = line => line.trimStart().startsWith(anchor);
    const focusLine = focus >= 0 ? source.slice(0, focus).split('\n').length - 1 : 0;
    const relative = lines.slice(focusLine).findIndex(matches);
    const start = relative >= 0 ? focusLine + relative : lines.findIndex(matches);
    if (start < 0 || length < 1 || length > 8 || !heading || !text)
      throw Error('Invalid excerpt for ' + lesson.id + ': ' + name + ': ' + anchor);
    const excerpt = lines.slice(start, start + length);
    const indent = Math.min(...excerpt.filter(line => line.trim()).map(line => line.match(/^ */)[0].length));
    return { heading, text, file, code: excerpt.map(line => line.slice(indent)).join('\n') };
  }));
  const section = editSections[lesson.id];
  let range;
  if (section) {
    const start = editSource.indexOf(section[0]);
    const end = editSource.indexOf(section[1], start + section[0].length);
    if (start < 0 || end <= start || !editSource.slice(start, end).includes(guide.edit))
      throw Error('Invalid editable section for ' + lesson.id);
    range = { start, end };
  }
  tutorials[lesson.id] = { ...guide, steps, range };
}
await writeFile(new URL('walkthroughs.mjs', dist), 'export const tutorials = ' + JSON.stringify(tutorials) + ';\n');
await cp(at('../src/style.css'), new URL('style.css', dist));
await cp(at('../src/concept-diagrams.css'), new URL('concept-diagrams.css', dist));
await cp(at('../src/concept-diagrams.mjs'), new URL('concept-diagrams.mjs', dist));
await cp(at('../src/lab.mjs'), new URL('lab.mjs', dist));
await cp(at('../content/course.mjs'), new URL('course.mjs', dist));
await cp(at('../content/references.mjs'), new URL('references.mjs', dist));
await cp(at('../content/concepts.mjs'), new URL('concepts.mjs', dist));
await cp(at('../runtime/files/'), new URL('runtime/', dist), { recursive: true });
await cp(at('../examples/'), new URL('examples/', dist), { recursive: true });
await cp(at('../assets/fonts/'), new URL('fonts/', dist), { recursive: true });
// Shared controls are source assets, included in the verified immutable release.
for (const name of ['offline.mjs','header-controls.mjs','header-controls.LICENSE.txt','release-contract.mjs','release-metadata.mjs','media-range.mjs','runtime-recovery.mjs','runtime-recovery.css','app-status.css','experiment-state.mjs','course-shell.mjs','course-shell.css','guest-files.mjs','material-symbols.mjs','material-symbols.css'])
  await cp(at('../src/' + name), new URL(name, dist));
await cp(at('../src/icons/'), new URL('icons/', dist), { recursive: true });
await cp(at('../runtime/README.md'), new URL('NOTICE.md', dist));
await cp(at('../runtime/packages.tsv'), new URL('runtime/packages.tsv', dist));
const dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const commit=process.env.COURSE_COMMIT || (dirty?null:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
const release=await buildOffline(fileURLToPath(dist), {commit,date:commit?execFileSync('git',['show','-s','--format=%cs',commit],{encoding:'utf8'}).trim():null});
console.log(`Built ${course.title}: ${release.files.length} verified files, ${(release.bytes/1e6).toFixed(1)} MB`);
