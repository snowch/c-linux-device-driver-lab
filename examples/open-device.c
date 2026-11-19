#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>

int main(void)
{
    const char *path = "/dev/lab0";
    int fd = open(path, O_RDWR);
    if (fd < 0) {
        if (errno == ENOENT) {
            printf("open returned -1 with ENOENT for %s\n", path);
            return 0;
        }
        perror(path);
        return 1;
    }

    printf("opened %s as descriptor %d\n", path, fd);
    return close(fd) == 0 ? 0 : 1;
}
