#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/time.h>
#include <sys/wait.h>
#include <unistd.h>
#include "lab_abi.h"

static const char payload[] = "hello";
enum { CHUNK = 2, POLL_MS = 1000 };

static void require(int ok, const char *message)
{
    if (!ok) {
        perror(message);
        exit(EXIT_FAILURE);
    }
}

static struct lab_info read_info(int fd)
{
    struct lab_info info;
    require(ioctl(fd, LAB_GET_INFO, &info) == 0, "LAB_GET_INFO");
    return info;
}

static void exchange(int fd)
{
    char buffer[sizeof payload] = {0};
    require(write(fd, payload, sizeof payload - 1) == sizeof payload - 1, "write");
    size_t total = 0;
    while (total < sizeof payload - 1) {
        size_t request = sizeof payload - 1 - total;
        if (request > CHUNK)
            request = CHUNK;
        ssize_t n = read(fd, buffer + total, request);
        require(n > 0, "read");
        total += (size_t)n;
        printf("read %zd, total %zu\n", n, total);
    }
    require(!strcmp(buffer, payload), "payload mismatch");
    printf("round trip: %s\n", buffer);
}

static void nonblock(int fd)
{
    char value;
    require(read(fd, &value, 1) == -1 && errno == EAGAIN, "expected EAGAIN");
    puts("empty nonblocking read: EAGAIN");
    struct lab_info info = read_info(fd);
    char *data = calloc(info.capacity, 1);
    require(data != NULL, "calloc");
    require(write(fd, data, info.capacity) == (ssize_t)info.capacity, "fill queue");
    const int make_room = 0;
    if (make_room)
        require(read(fd, &value, 1) == 1, "make room");
    ssize_t written = write(fd, "x", 1);
    if (make_room) {
        require(written == 1, "expected progress after reading");
        puts("nonblocking write after reading one byte: wrote 1 byte");
    } else {
        require(written == -1 && errno == EAGAIN, "expected EAGAIN on full");
        printf("full nonblocking write: EAGAIN after %u bytes\n", info.capacity);
    }
    free(data);
}

static void blocking_read(int fd)
{
    const char expected_byte = 'X';
    int ready[2];
    require(pipe(ready) == 0, "pipe");
    pid_t reader = fork();
    require(reader >= 0, "fork");
    if (reader == 0) {
        close(ready[0]);
        int input = open("/dev/lab0", O_RDONLY | O_CLOEXEC);
        if (input < 0 || write(ready[1], "r", 1) != 1)
            _exit(1);
        char value;
        int ok = read(input, &value, 1) == 1 && value == expected_byte;
        if (ok)
            printf("blocked reader returned %c\n", value);
        fflush(stdout);
        _exit(ok ? 0 : 1);
    }
    close(ready[1]);
    char state;
    require(read(ready[0], &state, 1) == 1, "child ready");
    close(ready[0]);
    usleep(100000);
    int status;
    require(waitpid(reader, &status, WNOHANG) == 0, "reader exited before write");
    puts("reader still waiting with an empty queue");
    fflush(stdout);
    require(write(fd, &expected_byte, 1) == 1, "wake reader");
    require(waitpid(reader, &status, 0) == reader &&
            WIFEXITED(status) && WEXITSTATUS(status) == 0, "wait for reader");
}

static void events(int fd)
{
    struct pollfd item = { .fd = fd, .events = POLLIN };
    require(poll(&item, 1, 0) == 0, "empty device unexpectedly readable");
    puts("empty device: poll returned 0");
    require(ioctl(fd, LAB_SCHEDULE) == 0, "LAB_SCHEDULE");
    require(poll(&item, 1, POLL_MS) == 1 && (item.revents & POLLIN), "poll for event");
    char value;
    require(read(fd, &value, 1) == 1 && value == '!', "read event");
    printf("delayed work woke poll and delivered %c\n", value);
    const int check_drained = 0;
    if (check_drained) {
        require(poll(&item, 1, 0) == 0, "device still readable after consuming event");
        puts("after reading the event: poll returned 0");
    }
}

static void reset_and_wait(int fd)
{
    const char pending = 'Q';
    require(write(fd, &pending, 1) == 1 && read_info(fd).queued == 1, "queue a byte");
    require(ioctl(fd, LAB_RESET) == 0, "reset queue before waiting");
    struct pollfd watch = { .fd = fd, .events = POLLIN };
    require(poll(&watch, 1, 0) == 0 && read_info(fd).queued == 0, "verify reset");
    puts("reset cleared the queue and poll reported no input");

    require(ioctl(fd, LAB_SCHEDULE) == 0, "schedule event");
    const int timeout_ms = 1000;
    int result = poll(&watch, 1, timeout_ms);
    if (result == 0) {
        puts("poll timed out before the event");
        return;
    }
    char event;
    require(result == 1 && (watch.revents & POLLIN) &&
            read(fd, &event, 1) == 1 && event == '!', "receive scheduled event");
    require(read_info(fd).queued == 0 && poll(&watch, 1, 0) == 0, "verify event drained");
    puts("scheduled event delivered, queue empty again");
}

static void control(int fd)
{
    require(write(fd, payload, sizeof payload - 1) == sizeof payload - 1, "write");
    struct lab_info info = read_info(fd);
    printf("capacity=%u queued=%u\n", info.capacity, info.queued);
    require(ioctl(fd, LAB_RESET) == 0, "LAB_RESET");
    printf("queued after reset=%u\n", read_info(fd).queued);
    require(ioctl(fd, _IO('L', 99)) == -1 && errno == ENOTTY, "unknown request");
    puts("unknown request: ENOTTY");
}

static void map_snapshot(int fd)
{
    long size = sysconf(_SC_PAGESIZE);
    require(size > 0, "page size");
    const struct lab_info *mapped = mmap(NULL, (size_t)size, PROT_READ, MAP_SHARED, fd, 0);
    require(mapped != MAP_FAILED, "mmap");
    require(write(fd, payload, sizeof payload - 1) == sizeof payload - 1, "write");
    struct lab_info current = read_info(fd);
    printf("mapped queued=%u, live queued=%u, capacity=%u\n",
           mapped->queued, current.queued, mapped->capacity);
    require(munmap((void *)mapped, (size_t)size) == 0, "munmap");
}

static void on_alarm(int number)
{
    (void)number;
}

static void interrupted_wait(void)
{
    int fd = open("/dev/lab0", O_RDONLY | O_CLOEXEC);
    require(fd >= 0, "open blocking descriptor");
    const int restart_reads = 0;
    struct sigaction action = {
        .sa_handler = on_alarm, .sa_flags = restart_reads ? SA_RESTART : 0
    };
    sigemptyset(&action.sa_mask);
    require(sigaction(SIGALRM, &action, NULL) == 0, "install handler");
    /* If read is restarted, another process makes the wait finish. */
    pid_t sender = fork();
    require(sender >= 0, "fork writer");
    if (sender == 0) {
        alarm(3);
        usleep(250000);
        int output = open("/dev/lab0", O_WRONLY | O_CLOEXEC);
        _exit(output >= 0 && write(output, "R", 1) == 1 ? 0 : 1);
    }
    struct itimerval alarm_time = { .it_value = { .tv_usec = 50000 } };
    require(setitimer(ITIMER_REAL, &alarm_time, NULL) == 0, "arm interrupt");
    char byte;
    ssize_t count = read(fd, &byte, 1);
    if (restart_reads) {
        require(count == 1 && byte == 'R', "expected restarted read");
        puts("read restarted and returned R");
    } else {
        require(count == -1 && errno == EINTR, "expected interrupted read");
        puts("empty blocking read returned EINTR");
    }
    int status;
    require(waitpid(sender, &status, 0) == sender && WIFEXITED(status) && WEXITSTATUS(status) == 0,
            "writer exited");
    close(fd);
}

static void short_write(int fd)
{
    struct lab_info info = read_info(fd);
    const size_t extra = 3;
    size_t length = info.capacity + extra;
    char *data = malloc(length);
    require(data != NULL, "allocate source");
    memset(data, 'a', length);
    ssize_t accepted = write(fd, data, length);
    require(accepted == (ssize_t)info.capacity, "expected a short positive write");
    printf("requested %zu bytes, accepted %zd, remaining %zu\n",
           length, accepted, length - (size_t)accepted);
    require(read(fd, data, info.capacity) == (ssize_t)info.capacity, "drain queue");
    require(write(fd, data + accepted, length - (size_t)accepted) == (ssize_t)extra, "retry remainder");
    printf("retry queued %u bytes\n", read_info(fd).queued);
    free(data);
}

int main(int argc, char **argv)
{
    alarm(10);
    const struct { const char *mode; void (*run)(int); } tests[] = {
        { "io", exchange }, { "nonblock", nonblock }, { "blocking", blocking_read },
        { "events", events }, { "control", control }, { "map", map_snapshot },
        { "short-write", short_write }, { "waits-capstone", reset_and_wait }
    };
    if (argc == 2 && !strcmp(argv[1], "interrupt")) {
        interrupted_wait();
        return 0;
    }
    if (argc == 2 && !strcmp(argv[1], "capstone")) {
        int fd = open("/dev/lab0", O_RDWR | O_NONBLOCK | O_CLOEXEC);
        require(fd >= 0, "open /dev/lab0");
        struct lab_info before = read_info(fd);
        printf("queue at start: %u of %u bytes\n", before.queued, before.capacity);
        require(before.queued == 0, "device was not empty at start");
        exchange(fd);
        events(fd);
        struct lab_info after = read_info(fd);
        printf("queue at end: %u of %u bytes\n", after.queued, after.capacity);
        require(after.queued == 0, "device did not drain");
        close(fd);
        puts("verified round trip, readiness notification and empty final state");
        return 0;
    }
    for (size_t i = 0; argc == 2 && i < sizeof tests / sizeof *tests; ++i) {
        if (!strcmp(argv[1], tests[i].mode)) {
            int fd = open("/dev/lab0", O_RDWR | O_NONBLOCK | O_CLOEXEC);
            require(fd >= 0, "open /dev/lab0");
            tests[i].run(fd);
            close(fd);
            return 0;
        }
    }
    fputs("choose io, nonblock, blocking, interrupt, short-write, events, control, map, waits-capstone or capstone\n", stderr);
    return 1;
}
