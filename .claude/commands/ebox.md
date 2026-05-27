Connect to a live Verdant ebox for troubleshooting.

## Usage

/ebox <ebox-id>

Example: /ebox 1007

## Connection Details

- **Jumpbox:** solutions-jump (34.230.199.117, SSH key: /Users/chuckcatron/solutionsKey)
- **Ebox SSH:** via ProxyJump through jumpbox, port = the ebox ID provided (use as-is, do not modify)
- **Ebox user:** verdant (use sudo for root)
- **Ebox key:** ~/.ssh/ebox_login_key

## SSH Command Pattern

```
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p $ARGUMENTS ebox-test '<command>'
```

## On Connect — Run Initial Diagnostics

1. Verify connection: `hostname`
2. Gather system overview (run in parallel):
   - `uptime && df -h /` (system health)
   - `cat /zxebox/config/local.ini` (config — network ID, hotel ID, endpoints, environment)
   - `sudo systemctl list-units --type=service --state=running | grep verdant` (running services)
   - `sudo systemctl list-units --type=service --state=failed` (failed services)
   - `cat /tmp/diagnostic_status.json 2>/dev/null` (health checks)
   - `cat /tmp/websocket_status.json 2>/dev/null` (cloud connection)
   - `tail -20 /tmp/packets_recieved.csv 2>/dev/null` (recent thermostat data)
   - `sudo journalctl -p err --no-pager -n 30` (recent errors)
   - `sqlite3 /zxebox/database/ebox.db "SELECT COUNT(*) FROM packets_to_send_v2;"` (queued packets)

3. Present a summary table:
   - Hostname, Network ID, Hotel ID, Environment (prod/QA)
   - Uptime, Disk usage, Load average
   - Services: running vs expected, any failed
   - Cloud connection status (WebSocket)
   - Recent errors (if any)
   - Packet queue depth

4. Ask what the user wants to troubleshoot, or if they have a specific issue.

## Key Paths on Ebox

| Path                               | Purpose                     |
| ---------------------------------- | --------------------------- |
| `/zxebox/config/local.ini`         | All configuration           |
| `/zxebox/database/ebox.db`         | SQLite state DB             |
| `/tmp/diagnostic_status.json`      | Health check results        |
| `/tmp/websocket_status.json`       | Cloud connection metrics    |
| `/tmp/packets_recieved.csv`        | Incoming thermostat packets |
| `/tmp/packets_sent.csv`            | Outbound commands           |
| `/tmp/pms_raw_received.csv`        | PMS event stream            |
| `/tmp/packet_manager_sender.log`   | Serial TX log               |
| `/tmp/packet_manager_receiver.log` | Serial RX log               |

## Services Reference

| Service           | Purpose                       |
| ----------------- | ----------------------------- |
| `verdant42`       | Core serial ↔ Zigbee bridge  |
| `verdantws42v2`   | WebSocket to cloud            |
| `verdanthealth42` | Diagnostic health checks      |
| `verdantpms42`    | Hotel PMS integration         |
| `verdantrest42`   | Dormakaba lock REST API       |
| `verdantota42`    | OTA firmware updates          |
| `verdantbacnet42` | BACnet/IP building automation |
| `verdantssh42`    | SSH access                    |
| `verdantnf42`     | Network forwarding            |

## Troubleshooting Commands

```bash
# Tail live thermostat traffic
sudo tail -f /tmp/packets_recieved.csv

# Check WebSocket reconnects
sudo journalctl -u verdantws42v2 --no-pager -n 50

# Check serial port health
sudo journalctl -u verdant42 --no-pager -n 50

# Database state
sqlite3 /zxebox/database/ebox.db ".tables"
sqlite3 /zxebox/database/ebox.db "SELECT * FROM node_ids LIMIT 10;"
sqlite3 /zxebox/database/ebox.db "SELECT COUNT(*) FROM packets_to_send_v2;"

# Network connectivity
ping -c 3 ebox.verdant-qa.co
curl -s -o /dev/null -w "%{http_code}" https://ebox.verdant-qa.co/api/zx/queue/1007

# Restart a service
sudo systemctl restart verdant42
```
