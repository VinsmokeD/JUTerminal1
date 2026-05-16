#!/bin/bash
set -e

# Start SSH daemon
/usr/sbin/sshd

# Start FTP daemon in background
# vsftpd with 'background=NO' in conf will block, so we use & here
/usr/sbin/vsftpd /etc/vsftpd.conf &

# Execute the default apache2-foreground command
exec apache2-foreground
