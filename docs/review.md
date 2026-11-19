# Course review

The Sites design guidance and the streaming lab’s UX and learning-design guides informed the workbench. The chapter sequence asks a Linux question, exposes the relevant editable C, shows actual guest output, suggests a small change and asks a separate transfer question. Each lesson links to a primary Linux reference.

The lesson picker, previous and next navigation, and browser drafts were checked on the published single-column workbench. Width checks included 1280, 768, 390 and 320 pixels. `npm run check` validates 15 lessons, source focus locations and the offline inventory. The expanded examples were run in the packaged Alpine guest without an external network.

The course uses a real Alpine x86 guest. The character-device module is an executable program, and the guest's timings depend on the host, browser and emulator. Offline use requires saving the course in that browser profile before disconnecting.

## Learner wording and workbench review

The opening pass checked the overview, all 15 lessons, all guided excerpts, API reference notes, controls and console messages against the course prerequisite of basic C, file descriptors and processes. The live 0be2b4d release already offered guided excerpts, an edit jump, offline API notes and concurrent guest startup. On that release, a successful module run showed the init, exit and removal messages. Moving to Parameters left that console and its completed status below the new question. The page also claimed that drafts were saved if browser storage refused them. The lifecycle task required a separate shell command for its main observation. The delayed-work edit changed a constant without giving learners output that could distinguish the runs.

The revision keeps the original guided excerpts and offline API notes available. Each question now introduces the relevant Linux conditions and asks learners to read named output. **Show where to edit** brings the editable file into focus at the requested line. The starter run and the edited run have identifiable source and output. The earlier successful output can be compared with a new result or consulted after a failure.

| Lessons | Evidence identified in the revised reading |
| --- | --- |
| Load, parameters and initialisation | Compare the module list with the init and exit log lines. Find the sysfs label and the checked rejection of an empty value. |
| Registration, I/O, nonblocking operation and short writes | Read registration and removal in the output. Compare read counts, the round trip and the bytes remaining after a short write. Check how freeing one slot changes a full-queue write. |
| Module reference, blocking and signals | Find the refused removal, successful removal, returned byte and read result after a signal. |
| Control, events and mapping | Compare queue length, reset and the unsupported request. Observe readiness before and after a delayed event. Compare the mapping snapshot with the live state. |
| Platform binding and capstone | Find the driver link, configured attribute and removal. Use separate queue, round-trip, notification and device-path evidence in the final check. |

The page starts the guest, stages the lesson files and runs the check. With the original module inputs it uses the packaged modules. An edit to those inputs triggers a build in the guest. The C probe builds as needed. Run statuses distinguish preparation, program execution, compiler or setup failure and a checked driver outcome. A draft storage failure identifies the available copy and exposes the source download. The per-lesson and per-file draft keys and source encoding are unchanged.

Guest input uses the serial console. The hardware keyboard and mouse adapters are disabled so HTML controls keep their keyboard behavior after startup. The image download still streams three parts concurrently and can be cancelled. A clean build, shell commands and resetting Linux are optional tools. All kernel module and device operations in verification use the packaged guest. There is no measurement of physical device behavior, emulator performance under other hosts or learner understanding.
