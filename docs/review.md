# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The chapter sequence asks a Linux question, exposes the relevant editable C, shows actual guest output, suggests a small change and asks a separate transfer question. Each lesson links to a primary Linux reference.

The lesson picker, previous and next navigation, and browser drafts were checked on the published single-column workbench. Width checks included 1280, 768, 390 and 320 pixels. `npm run check` validates 18 lessons, source focus locations and the offline inventory. All 16 lesson programs ran successfully in the packaged Alpine guest with external networking disabled.

The course uses a real Alpine x86 guest. The character-device module is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.

## Learner wording and workbench review

The opening pass checked the overview, all lessons, guided excerpts, API reference notes, controls and console messages against the stated prerequisite of basic C, file descriptors and processes. The live 0be2b4d release already offered guided excerpts, an edit jump, offline API notes and concurrent guest startup. On that release, running the module and moving to Parameters left the previous console and its completed status below the new question. The page also claimed that drafts were saved if browser storage refused them. The lifecycle task required a shell command for its main observation, and the delayed-work edit gave no distinct evidence in the output. The 565a7d0 release added a smaller device-opening example and a section editor. The missing-path edit there ended the program before the normal module removal check.

The revision keeps the guided excerpts, offline API notes and focused editor available across the now 16 lessons. Each question introduces the relevant Linux conditions and asks learners to read named output. **Show where to edit** brings the editable section or file into focus at the requested line. The current run identifies its source and the earlier successful output can be compared with a new result or consulted after a failure.

| Lessons | Evidence identified in the revised reading |
| --- | --- |
| Load, parameters and initialisation | Compare the module list with the init and exit log lines. Find the sysfs label and the checked rejection of an empty value. |
| Registration, opening, I/O, nonblocking operation and short writes | Read registration and removal in the output. Compare a valid descriptor with the checked ENOENT result. Compare read counts, the round trip and the bytes remaining after a short write. Check how freeing one slot changes a full-queue write. |
| Module reference, blocking and signals | Find the refused removal, successful removal, returned byte and read result after a signal. |
| Control, events and mapping | Compare queue length, reset and the unsupported request. Observe readiness before and after a delayed event. Compare the mapping snapshot with the live state. |
| Platform binding and capstone | Find the driver link, configured attribute and removal. Use separate queue, round-trip, notification and device-path evidence in the final check. |

The page starts the guest, stages all lesson files and runs the check. With the original module inputs it uses the packaged modules. An edit to those inputs triggers a build in the guest. The C probe builds as needed. Run statuses distinguish preparation, program execution, compiler or setup failure and a checked driver outcome. A draft storage failure identifies the available copy and exposes a download of the full edited source. The existing per-lesson and per-file keys keep earlier drafts available, including changes outside a focused section.

Guest input uses the serial console. The hardware keyboard and mouse adapters are disabled so HTML controls keep their keyboard behavior after startup. The image download still streams three parts concurrently and can be cancelled. A clean build, shell commands and resetting Linux are optional tools. All kernel module and device operations in verification use the packaged guest. There is no measurement of physical device behavior, emulator performance under other hosts or learner understanding.

The 4 section capstones completed in the packaged Alpine guest with networking disabled. Build checks verify that each capstone closes its section and links only to earlier lessons in that section. All 18 concept diagrams were checked at desktop and narrow mobile widths.

## Shared header icon controls

UX and learning-design review: compact Material 3 theme/offline actions replace header text controls; 48px targets, action labels, tooltips and focus outlines preserve discoverability and keyboard access. Existing native theme handlers, offline verification, saved work, runner controls and subject-specific links remain authoritative. The saved badge requires a verified current offline copy; an update dot identifies an offered update. Go keeps a status icon because it offers no complete offline copy. No lesson sequence, teaching claims or prerequisites change. Review phone/tablet/desktop, both themes, keyboard, storage denial and the real save/update state transitions. Functional evidence is recorded with the change; it does not establish learning effectiveness.


## Visible header labels (2026-11-26)

UX and learning-design review: retain the Material symbols and add visible
**Offline** and **Theme** labels so touch users can identify the actions without
a tooltip. The Code runner name and state, subject-specific tools, native theme
preferences and verified offline/update badges remain. Controls fit their text,
use at least 48px touch targets, and wrap on narrow screens rather than hiding
labels. No execution, lesson instructions, progress or saved-work contract changes.
The shared [course design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md#theme-and-offline-icons)
records this rule. Validation covers the built header at 320, 390, 820 and 1440px
in both themes, keyboard focus, modal opening/Escape, persistence and project-local
asset requests. Functional checks do not establish learning effectiveness.
