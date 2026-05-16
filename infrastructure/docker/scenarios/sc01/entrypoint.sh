#!/bin/bash
set -e

# Start SSH daemon
/usr/sbin/sshd

# Start FTP daemon
/usr/sbin/vsftpd /etc/vsftpd.conf &

# Execute the default apache2-foreground command
exec apache2-foreground
